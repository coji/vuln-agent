import { streamText } from 'ai'
import { AGENT_SYSTEM_PROMPT } from './core/agent-prompts.js'
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
} from './tools/index.js'
import type { LLMProvider, ScanSession, VulnerabilityFinding } from './types.js'
import { createLogger, output } from './utils.js'

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
    let currentToolCall: { name: string; params?: string } | null = null

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

      // Main agent execution using Vercel AI SDK's streamText
      const result = await streamText({
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

          // Clear any thinking indicator
          if (currentToolCall) {
            output.clearLine()
          }

          if (config.verbose) {
            output.info(`Step ${session.currentStep}/${maxSteps} completed`)
          }

          // Track tool usage
          stepResult.toolCalls.forEach((call) => {
            toolsUsed.add(call.toolName)
            logger.info(`Tool executed: ${call.toolName}`)

            // Display finding notifications
            if (call.toolName === 'reportFinding') {
              const findings = getSessionFindings(sessionId)
              const lastFinding = findings[findings.length - 1]
              if (lastFinding) {
                output.found(
                  `Found ${lastFinding.severity} severity ${lastFinding.type} vulnerability`,
                )
              }
            }

            if (call.toolName === 'updateStrategy') {
              strategyUpdates++
            }
          })

          currentToolCall = null
        },
      })

      // Stream the AI's reasoning
      let buffer = ''
      let isThinking = false

      for await (const chunk of result.textStream) {
        // Buffer chunks to detect tool calls
        buffer += chunk

        // Detect tool call patterns
        const toolCallMatch = buffer.match(
          /(?:Now |Let me |I'll |I will |Next, I'll |I'm going to )?(use|call|execute|run) (?:the )?(\w+)(?: tool)?(?: (?:to|for|with) ([^.]+))?/i,
        )

        if (toolCallMatch && !currentToolCall) {
          const toolName = toolCallMatch[2]
          const purpose = toolCallMatch[3]

          // Clear thinking indicator
          if (isThinking) {
            output.clearLine()
            isThinking = false
          }

          currentToolCall = { name: toolName, params: purpose }
          output.tool(toolName, purpose)
          buffer = ''
        } else if (!currentToolCall && !isThinking && buffer.length > 10) {
          // Show thinking indicator
          output.thinking('AI is analyzing...')
          isThinking = true
        }
      }

      // Clear final thinking indicator
      if (isThinking || currentToolCall) {
        output.clearLine()
      }

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
