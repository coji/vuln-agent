import { streamText } from 'ai'
import { AGENT_SYSTEM_PROMPT } from './agent-prompts.js'
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
import {
  displayToolCall,
  displayToolResult,
  getToolEmoji,
} from './tools/tool-display.js'
import type { LLMProvider, ScanSession, VulnerabilityFinding } from './types.js'
import { createLogger, debug, output } from './utils.js'

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

  debug.scanner('Creating agent with config: %O', {
    llmProvider: config.llmProvider.name,
    whitelist: config.whitelist,
    maxSteps,
    verbose: config.verbose,
  })

  const scan = async (targetUrl: string): Promise<AgentScanResult> => {
    const sessionId = `scan-${Date.now()}`
    const startTime = Date.now()
    const toolsUsed = new Set<string>()
    let strategyUpdates = 0
    let reportPath: string | undefined
    let currentToolCall: { name: string; params?: string } | null = null
    let isThinking = false

    logger.info(`[AGENT] Starting autonomous scan of ${targetUrl}`)
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
        action: 'add',
        task: {
          type: 'test_endpoint',
          priority: 0,
          status: 'pending',
          target: targetUrl,
          metadata: {
            description: 'Initial reconnaissance of target',
          },
        },
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
        prompt: `Begin comprehensive security testing of ${targetUrl}. You have ${maxSteps} steps to find as many vulnerabilities as possible.

Important instructions:
1. Start by sending an HTTP request to the target URL to gather initial information
2. Analyze the response to understand the application structure
3. Extract links and identify potential attack vectors
4. Test each endpoint systematically for vulnerabilities
5. Use the manageTasks tool to track your progress, but focus on actually executing the tests
6. When you find suspicious behavior, investigate it thoroughly and report confirmed vulnerabilities

Remember: Your goal is to FIND and REPORT actual vulnerabilities. Start testing immediately!`,
        maxSteps,
        tools,
        onStepFinish: (stepResult) => {
          session.currentStep++

          debug.scanner(
            'Step %d finished, tool calls: %O',
            session.currentStep,
            stepResult.toolCalls.map((tc) => tc.toolName),
          )

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
            debug.scanner('Tool call details: %O', {
              tool: call.toolName,
              args: call.args,
            })

            // Display detailed tool information
            if (call.toolName === 'updateStrategy') {
              strategyUpdates++
            }

            displayToolCall(call, output, sessionId, { strategyUpdates })
          })

          currentToolCall = null
        },
      })

      // Stream the AI's reasoning
      let buffer = ''

      // Use fullStream to get all events
      for await (const chunk of result.fullStream) {
        // Handle text chunks
        if (chunk.type === 'text-delta') {
          buffer += chunk.textDelta
          debug.llm('Text delta received: %s', chunk.textDelta)

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

        // Handle tool call events for real-time feedback
        if (chunk.type === 'tool-call' && 'toolName' in chunk) {
          // Clear thinking indicator
          if (isThinking) {
            output.clearLine()
            isThinking = false
          }

          // Show tool being called
          const toolCallChunk = chunk as { type: 'tool-call'; toolName: string }
          const toolEmoji = getToolEmoji(toolCallChunk.toolName)
          output.info(`${toolEmoji} Calling ${toolCallChunk.toolName}...`)
        }

        // Handle tool result events
        if (chunk.type === 'tool-result' && 'toolName' in chunk) {
          const toolResultChunk = chunk as {
            type: 'tool-result'
            toolName: string
            result: unknown
          }
          displayToolResult(
            toolResultChunk.toolName,
            toolResultChunk.result,
            output,
          )
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

      // Check for API authentication errors
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for common API authentication errors
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('Unauthorized') ||
          errorMessage.includes('Invalid API') ||
          errorMessage.includes('API key') ||
          errorMessage.includes('authentication')
        ) {
          errorMessage = `Authentication failed: ${errorMessage}. Please check your API key.`
        }
      }

      // Clear any remaining UI elements
      if (isThinking || currentToolCall) {
        output.clearLine()
      }

      output.error(`Scan failed: ${errorMessage}`)

      return {
        sessionId,
        targetUrl,
        findings: getSessionFindings(sessionId),
        stepsExecuted: session.currentStep,
        duration: Date.now() - startTime,
        error: errorMessage,
        toolsUsed: Array.from(toolsUsed),
        strategy: getSessionStrategy(sessionId),
        strategyUpdates,
        reportPath,
      }
    }
  }

  return { scan }
}
