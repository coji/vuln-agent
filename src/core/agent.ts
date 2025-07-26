import { z } from 'zod'
import type {
  ScanSession,
  VulnerabilityFinding,
} from '../domain/models/scan-session.js'
import type { LLMProvider } from '../scanners/vulnerabilities/llm-tester.js'
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
  getSessionTasks,
  type VulnAgentTool,
} from '../tools/index.js'
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
  toolsUsed?: string[]
  strategy?: unknown
  strategyUpdates?: number
  reportPath?: string
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
      // System prompt for the agent
      const systemPrompt = `${AGENT_SYSTEM_PROMPT}

## Session Details
- Session ID: ${sessionId}
- Target URL: ${targetUrl}
- Max Steps: ${maxSteps}`

      // Initialize with first task
      const manageTasksTool = tools.find((t) => t.name === 'manageTasks')
      if (manageTasksTool) {
        await manageTasksTool.tool.execute({
          sessionId,
          action: 'add',
          task: {
            type: 'test_endpoint',
            target: targetUrl,
            priority: 0,
          },
        })
      }

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

        const pendingTasks = tasks.filter((t) => t.status === 'pending')

        // Check if we're done
        if (pendingTasks.length === 0 && step > 5) {
          logger.info('No more pending tasks, completing scan')
          break
        }

        // Prepare context for the agent
        const completedEndpoints = tasks
          .filter((t) => t.status === 'completed')
          .map((t) => t.target)
          .slice(-5)

        const contextPrompt = STEP_CONTEXT_TEMPLATE(
          step + 1,
          maxSteps,
          findings.length,
          findings.filter(
            (f) => f.severity === 'critical' || f.severity === 'high',
          ).length,
          pendingTasks.length,
          completedEndpoints,
          strategy?.focusAreas.join(', ') || 'General reconnaissance',
          pendingTasks.slice(0, 3).map((t) => `${t.type}: ${t.target}`),
        )

        try {
          // Let the agent decide the next action using LLM
          const agentPrompt = `${systemPrompt}

${contextPrompt}

Choose the most appropriate tool and provide the parameters as JSON.`

          const response = await config.llmProvider.generateObject({
            prompt: agentPrompt,
            schema: z.object({
              tool: z.string().describe('The tool name to use'),
              parameters: z.any().describe('The parameters for the tool'),
              reasoning: z
                .string()
                .describe('Why this tool and parameters were chosen'),
            }),
          })

          // Execute the chosen tool
          const chosenTool = tools.find((t) => t.name === response.object.tool)
          if (chosenTool) {
            toolsUsed.add(response.object.tool)

            if (config.verbose) {
              logger.debug(
                `Agent action: ${response.object.tool} - ${response.object.reasoning}`,
              )
            }

            // Track strategy updates
            if (response.object.tool === 'updateStrategy') {
              strategyUpdates++
            }

            try {
              await chosenTool.tool.execute(response.object.parameters)
            } catch (toolError) {
              logger.error(`Tool execution error: ${toolError}`)
            }
          }

          // Update strategy periodically
          if (step > 0 && step % 20 === 0) {
            const updateStrategyTool = tools.find(
              (t) => t.name === 'updateStrategy',
            )
            if (updateStrategyTool) {
              await updateStrategyTool.tool.execute({
                sessionId,
                currentState: {
                  completedSteps: step,
                  remainingSteps: maxSteps - step,
                  findings: findings.map((f) => ({
                    type: f.type,
                    severity: f.severity,
                    target: f.url,
                  })),
                  testedEndpoints: tasks
                    .filter((t) => t.status === 'completed')
                    .map((t) => t.target),
                  discoveredEndpoints: tasks.map((t) => t.target),
                },
              })
            }
          }
        } catch (error) {
          logger.error(`Error in step ${step + 1}: ${error}`)
          // Continue to next step on error
        }
      }

      // Final results
      const finalFindings = getSessionFindings(sessionId)
      const finalStrategy = getSessionStrategy(sessionId)
      session.state = 'completed'
      session.findings = finalFindings

      const result: AgentScanResult = {
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
        `Scan completed: ${finalFindings.length} vulnerabilities found in ${result.stepsExecuted} steps`,
      )

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
        toolsUsed: Array.from(toolsUsed),
        strategy: getSessionStrategy(sessionId),
        strategyUpdates,
        reportPath,
      }
    }
  }

  return { scan }
}
