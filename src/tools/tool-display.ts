import type { output } from '../utils.js'
import { getSessionFindings } from './report-finding.js'

// Tool argument types based on actual tool implementations
interface HttpRequestArgs {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

interface AnalyzeResponseArgs {
  response: {
    url: string
    status: number
    headers: Record<string, string>
    body: string
  }
}

interface ExtractLinksArgs {
  baseUrl: string
  html: string
}

interface TestPayloadArgs {
  vulnerabilityType: string
  context: {
    url: string
    parameter: string
    parameterLocation: string
    method: string
  }
}

interface ManageTasksArgs {
  action: string
  task?: {
    type: string
    target: string
  }
}

interface UpdateStrategyArgs {
  sessionId: string
  currentState: {
    completedSteps: number
    remainingSteps: number
    findings: Array<{
      type: string
      severity: string
      target: string
    }>
    testedEndpoints: string[]
    discoveredEndpoints: string[]
    blockedPayloads?: string[]
    technologies?: string[]
  }
  currentStrategy?: {
    focusAreas: string[]
    skipPatterns: string[]
    maxDepth: number
    testIntensity: 'light' | 'normal' | 'thorough'
  }
}

type ToolArgs =
  | HttpRequestArgs
  | AnalyzeResponseArgs
  | ExtractLinksArgs
  | TestPayloadArgs
  | ManageTasksArgs
  | UpdateStrategyArgs
  | Record<string, unknown>

// Tool result types
interface ToolResult {
  success?: boolean
  response?: {
    status: number
    body?: string | { length: number }
  }
  error?: string
}

export interface ToolDisplayInfo {
  emoji: string
  formatCall: (args: ToolArgs) => string | undefined
  formatResult?: (result: unknown) => string | undefined
}

export const toolDisplayMap: Record<string, ToolDisplayInfo> = {
  httpRequest: {
    emoji: '🌐',
    formatCall: (args) => {
      if (args && typeof args === 'object' && 'url' in args) {
        const httpArgs = args as HttpRequestArgs
        return `${httpArgs.method || 'GET'} ${httpArgs.url}`
      }
      return undefined
    },
    formatResult: (result) => {
      if (result && typeof result === 'object' && 'success' in result) {
        const typedResult = result as ToolResult
        if (typedResult.success && typedResult.response) {
          const bodyLength =
            typeof typedResult.response.body === 'string'
              ? typedResult.response.body.length
              : typedResult.response.body?.length || 0
          return `Response: ${typedResult.response.status} (${bodyLength} bytes)`
        } else if ('error' in typedResult && typedResult.error) {
          return `Failed: ${typedResult.error}`
        }
      }
      return undefined
    },
  },

  analyzeResponse: {
    emoji: '🔍',
    formatCall: (args) => {
      if (args && typeof args === 'object' && 'response' in args) {
        const analyzeArgs = args as AnalyzeResponseArgs
        return `Analyzing response from ${analyzeArgs.response.url} (${analyzeArgs.response.status})`
      }
      return undefined
    },
  },

  extractLinks: {
    emoji: '🔗',
    formatCall: (args) => {
      if (args && typeof args === 'object' && 'baseUrl' in args) {
        const extractArgs = args as ExtractLinksArgs
        return `Extracting links from ${extractArgs.baseUrl}`
      }
      return undefined
    },
  },

  testPayload: {
    emoji: '💉',
    formatCall: (args) => {
      if (
        args &&
        typeof args === 'object' &&
        'vulnerabilityType' in args &&
        'context' in args
      ) {
        const testArgs = args as TestPayloadArgs
        return `Testing ${testArgs.vulnerabilityType} on ${testArgs.context.url} (param: ${testArgs.context.parameter})`
      }
      return undefined
    },
  },

  reportFinding: {
    emoji: '🎯',
    formatCall: () => undefined, // Special handling in displayToolCall
  },

  manageTasks: {
    emoji: '📋',
    formatCall: (args) => {
      if (args && typeof args === 'object' && 'action' in args) {
        const taskArgs = args as ManageTasksArgs
        if (taskArgs.action === 'add' && taskArgs.task) {
          return `Added task: ${taskArgs.task.type} for ${taskArgs.task.target}`
        }
      }
      return undefined
    },
  },

  updateStrategy: {
    emoji: '🎯',
    formatCall: (args) => {
      if (args && typeof args === 'object' && 'currentState' in args) {
        const strategyArgs = args as UpdateStrategyArgs
        const totalSteps =
          strategyArgs.currentState.completedSteps +
          strategyArgs.currentState.remainingSteps
        const progress = (
          (strategyArgs.currentState.completedSteps / totalSteps) *
          100
        ).toFixed(1)
        const findings = strategyArgs.currentState.findings.length
        return `Updating strategy (${progress}% complete, ${findings} findings)`
      }
      return 'Updating scanning strategy'
    },
    formatResult: (result) => {
      if (result && typeof result === 'object' && 'success' in result) {
        const strategyResult = result as {
          success: boolean
          reasoning?: string
          adjustments?: string[]
          tactics?: Array<{ technique: string; priority: string }>
          hasSignificantChanges?: boolean
          error?: string
        }

        if (strategyResult.success) {
          const parts: string[] = []

          if (strategyResult.reasoning) {
            parts.push(`Reasoning: ${strategyResult.reasoning}`)
          }

          if (
            strategyResult.adjustments &&
            strategyResult.adjustments.length > 0
          ) {
            parts.push(`Adjustments: ${strategyResult.adjustments.join(', ')}`)
          }

          if (strategyResult.tactics && strategyResult.tactics.length > 0) {
            const highPriorityTactics = strategyResult.tactics
              .filter((t) => t.priority === 'high')
              .map((t) => t.technique)
            if (highPriorityTactics.length > 0) {
              parts.push(
                `High-priority tactics: ${highPriorityTactics.join(', ')}`,
              )
            }
          }

          return parts.join(' | ')
        }
        if (strategyResult.error) {
          return `Failed to update strategy: ${strategyResult.error}`
        }
      }
      return undefined
    },
  },
}

export function displayToolCall(
  call: { toolName: string; args: ToolArgs },
  out: typeof output,
  sessionId: string,
): void {
  const toolInfo = toolDisplayMap[call.toolName]

  if (!toolInfo) {
    out.info(`⚙️ Executed ${call.toolName}`)
    return
  }

  // Special handling for reportFinding
  if (call.toolName === 'reportFinding') {
    const findings = getSessionFindings(sessionId)
    const lastFinding = findings[findings.length - 1]
    if (lastFinding) {
      out.found(
        `Found ${lastFinding.severity} severity ${lastFinding.type} vulnerability at ${lastFinding.url}`,
      )
    }
    return
  }

  // Default handling
  const message = toolInfo.formatCall(call.args)
  if (message) {
    out.info(`${toolInfo.emoji} ${message}`)
  }
}

export function displayToolResult(
  toolName: string,
  result: unknown,
  out: typeof output,
): void {
  const toolInfo = toolDisplayMap[toolName]

  if (!toolInfo?.formatResult) {
    return
  }

  const message = toolInfo.formatResult(result)
  if (message) {
    const isSuccess =
      result &&
      typeof result === 'object' &&
      'success' in result &&
      (result as ToolResult).success
    if (isSuccess) {
      out.success(`   ✓ ${message}`)
    } else {
      out.error(`   ✗ ${message}`)
    }
  }
}

export function getToolEmoji(toolName: string): string {
  return toolDisplayMap[toolName]?.emoji || '⚙️'
}
