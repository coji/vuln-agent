import { generateText } from 'ai'
import type { LLMProvider } from '../scanners/vulnerabilities/llm-tester.js'
import { 
  createHttpRequestTool,
  createAnalyzeResponseTool,
  createExtractLinksTool,
  createTestPayloadTool,
  createReportFindingTool,
  createManageTasksTool,
  createUpdateStrategyTool,
  getSessionFindings,
  getSessionTasks,
  getSessionStrategy,
  type VulnAgentTool,
} from '../tools/index.js'
import type { ScanSession, VulnerabilityFinding } from '../domain/models/scan-session.js'
import { createLogger, output } from '../utils/logger.js'
import { AGENT_SYSTEM_PROMPT, STEP_CONTEXT_TEMPLATE } from './agent-prompts.js'

export interface AgentConfig {
  llmProvider: LLMProvider
  whitelist: string[]
  maxSteps?: number
  verbose?: boolean
}

export interface AgentScanResult {
  sessionId: string
  targetUrl: string
  findings: VulnerabilityFinding[]
  stepsExecuted: number
  duration: number
  error?: string
}

export const createVulnAgent = (config: AgentConfig) => {
  const logger = createLogger('agent')
  const maxSteps = config.maxSteps || 100

  // Initialize all tools
  const tools: VulnAgentTool[] = [
    createHttpRequestTool({ whitelist: config.whitelist }),
    createAnalyzeResponseTool(config.llmProvider),
    createExtractLinksTool(config.llmProvider),
    createTestPayloadTool(config.llmProvider),
    createReportFindingTool(),
    createManageTasksTool(config.llmProvider),
    createUpdateStrategyTool(config.llmProvider),
  ]

  const scan = async (targetUrl: string): Promise<AgentScanResult> => {
    const startTime = Date.now()
    const sessionId = `scan-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    logger.info(`Starting autonomous scan of ${targetUrl}`)
    output.scanning(`Initializing AI agent with ${maxSteps} max steps...`)

    // Initialize session
    const session: ScanSession = {
      id: sessionId,
      targetUrl,
      startTime: new Date(),
      currentStep: 0,
      maxSteps,
      state: 'initializing',
      findings: [],
      tasks: [],
      strategy: {
        focusAreas: [],
        skipPatterns: [],
        maxDepth: 3,
        testIntensity: 'normal',
      },
    }

    try {
      // System prompt for the agent
      const systemPrompt = AGENT_SYSTEM_PROMPT + `

## Session Details
- Session ID: ${sessionId}
- Target URL: ${targetUrl}
- Max Steps: ${maxSteps}`

      // Initialize with first task
      await tools.find(t => t.name === 'manageTasks')?.tool.execute({
        sessionId,
        action: 'add',
        task: {
          type: 'test_endpoint',
          target: targetUrl,
          priority: 0,
        },
      })

      // Main agent loop
      for (let step = 0; step < maxSteps; step++) {
        session.currentStep = step
        
        if (config.verbose) {
          output.scanning(`Step ${step + 1}/${maxSteps}`)
        }

        // Get current state
        const tasks = getSessionTasks(sessionId)
        const findings = getSessionFindings(sessionId)
        const strategy = getSessionStrategy(sessionId)
        
        const pendingTasks = tasks.filter(t => t.status === 'pending')
        
        // Check if we're done
        if (pendingTasks.length === 0 && step > 5) {
          logger.info('No more pending tasks, completing scan')
          break
        }

        // Prepare context for the agent
        const completedEndpoints = tasks
          .filter(t => t.status === 'completed')
          .map(t => t.target)
          .slice(-5)
        
        const contextPrompt = STEP_CONTEXT_TEMPLATE(
          step + 1,
          maxSteps,
          findings.length,
          findings.filter(f => f.severity === 'critical' || f.severity === 'high').length,
          pendingTasks.length,
          completedEndpoints,
          strategy?.focusAreas.join(', ') || 'General reconnaissance',
          pendingTasks.slice(0, 3).map(t => `${t.type}: ${t.target}`)
        )

        try {
          // Let the agent decide the next action
          const response = await generateText({
            model: config.llmProvider as any, // Type compatibility workaround
            system: systemPrompt,
            prompt: contextPrompt,
            tools: tools.reduce((acc, tool) => {
              acc[tool.name] = tool.tool
              return acc
            }, {} as Record<string, any>),
          })

          // Log the action
          if (config.verbose && response.toolCalls && response.toolCalls.length > 0) {
            const toolCall = response.toolCalls[0]
            logger.debug(`Agent action: ${toolCall.toolName}`)
          }

          // Update strategy periodically
          if (step > 0 && step % 20 === 0) {
            await tools.find(t => t.name === 'updateStrategy')?.tool.execute({
              sessionId,
              currentState: {
                completedSteps: step,
                remainingSteps: maxSteps - step,
                findings: findings.map(f => ({
                  type: f.type,
                  severity: f.severity,
                  target: f.url,
                })),
                testedEndpoints: tasks.filter(t => t.status === 'completed').map(t => t.target),
                discoveredEndpoints: tasks.map(t => t.target),
              },
            })
          }
        } catch (error) {
          logger.error(`Error in step ${step + 1}: ${error}`)
          // Continue to next step on error
        }
      }

      // Final results
      const finalFindings = getSessionFindings(sessionId)
      session.state = 'completed'
      session.findings = finalFindings

      const result: AgentScanResult = {
        sessionId,
        targetUrl,
        findings: finalFindings,
        stepsExecuted: session.currentStep,
        duration: Date.now() - startTime,
      }

      output.success(`Scan completed: ${finalFindings.length} vulnerabilities found in ${result.stepsExecuted} steps`)
      
      return result

    } catch (error) {
      logger.error('Fatal error during scan:', error)
      
      return {
        sessionId,
        targetUrl,
        findings: getSessionFindings(sessionId),
        stepsExecuted: session.currentStep,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  return { scan }
}