import { generateText } from 'ai'
import type {
  ScanSession,
  VulnerabilityFinding,
} from '../domain/models/scan-session.js'
import type { LLMProvider } from '../llm/types.js'
import {
  createAnalyzeResponseTool,
  createExtractLinksTool,
  createHttpRequestTool,
  createManageTasksTool,
  createReportFindingTool,
  createTestPayloadTool,
  createUpdateStrategyTool,
  getSessionFindings,
  getSessionStrategy,
} from '../tools/index.js'
import { createLogger, output } from '../utils/logger.js'
import { AGENT_SYSTEM_PROMPT } from './agent-prompts.js'

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
  toolsUsed?: string[]
  strategy?: unknown
  strategyUpdates?: number
  reportPath?: string
}

export const createVulnAgent = (config: AgentConfig) => {
  const logger = createLogger('agent')
  const maxSteps = config.maxSteps || 100

  const scan = async (targetUrl: string): Promise<AgentScanResult> => {
    const sessionId = `scan-${Date.now()}`
    const startTime = Date.now()
    const toolsUsed = new Set<string>()
    let strategyUpdates = 0
    let reportPath: string | undefined

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
      // Initialize all tools as AI SDK tools
      const tools = {
        httpRequest: createHttpRequestTool({ whitelist: config.whitelist })
          .tool,
        analyzeResponse: createAnalyzeResponseTool(config.llmProvider).tool,
        extractLinks: createExtractLinksTool(config.llmProvider).tool,
        testPayload: createTestPayloadTool(config.llmProvider).tool,
        reportFinding: createReportFindingTool().tool,
        manageTasks: createManageTasksTool(config.llmProvider).tool,
        updateStrategy: createUpdateStrategyTool(config.llmProvider).tool,
      }

      // Initialize task queue
      await tools.manageTasks.execute({
        sessionId,
        operation: 'add',
        tasks: [
          {
            type: 'recon',
            priority: 'high',
            status: 'pending',
            target: targetUrl,
            description: 'Initial reconnaissance of target',
          },
        ],
      })

      session.state = 'scanning'
      output.scanning('Starting vulnerability scan...')

      // Main agent execution using Vercel AI SDK's maxSteps
      await generateText({
        model: config.llmProvider.model,
        system: `${AGENT_SYSTEM_PROMPT}

## Session Details
- Session ID: ${sessionId}
- Target URL: ${targetUrl}
- Max Steps: ${maxSteps}`,
        prompt: `Begin comprehensive security testing of ${targetUrl}. You have ${maxSteps} steps to find as many vulnerabilities as possible. Start with reconnaissance, then proceed with systematic vulnerability testing.`,
        maxSteps,
        tools,
        onStepFinish: (stepResult) => {
          session.currentStep++

          if (config.verbose) {
            output.scanning(`Step ${session.currentStep}/${maxSteps}`)
          }

          // Track tool usage
          stepResult.toolCalls.forEach((call) => {
            toolsUsed.add(call.toolName)
            logger.info(`Tool executed: ${call.toolName}`)

            if (config.verbose && call.toolName === 'reportFinding') {
              const findings = getSessionFindings(sessionId)
              const lastFinding = findings[findings.length - 1]
              if (lastFinding) {
                output.found(
                  `Found ${lastFinding.severity} severity ${lastFinding.type}`,
                )
              }
            }

            if (call.toolName === 'updateStrategy') {
              strategyUpdates++
            }
          })

          // Note: Context will be provided through the prompt in the next iteration
          // The AI agent will see the updated state when it makes the next decision
        },
      })

      // Final results
      const finalFindings = getSessionFindings(sessionId)
      const finalStrategy = getSessionStrategy(sessionId)
      session.state = 'completed'
      session.findings = finalFindings

      const agentResult: AgentScanResult = {
        sessionId,
        targetUrl,
        findings: finalFindings,
        stepsExecuted: session.currentStep,
        duration: Date.now() - startTime,
        toolsUsed: Array.from(toolsUsed),
        strategy: finalStrategy,
        strategyUpdates,
        reportPath,
      }

      output.success(
        `Scan completed: ${finalFindings.length} vulnerabilities found in ${agentResult.stepsExecuted} steps`,
      )

      return agentResult
    } catch (error) {
      logger.error('Fatal error during scan:', error)

      return {
        sessionId,
        targetUrl,
        findings: getSessionFindings(sessionId),
        stepsExecuted: session.currentStep,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolsUsed: Array.from(toolsUsed),
        strategy: getSessionStrategy(sessionId),
        strategyUpdates,
        reportPath,
      }
    }
  }

  return { scan }
}
