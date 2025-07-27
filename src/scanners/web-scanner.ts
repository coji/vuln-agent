import { createVulnAgent } from '../agent.js'
import type { AnalysisResult, LLMProvider } from '../types.js'
import { createLogger } from '../utils.js'

export interface WebScannerOptions {
  httpClient: HttpClient
  llm?: {
    provider: LLMProvider
  }
}

export interface HttpClient {
  request: (options: RequestOptions) => Promise<HttpResponse>
}

export interface RequestOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface HttpResponse {
  status: number
  headers: Record<string, string>
  body: string
  url: string
}

export interface WebVulnerability {
  type: 'XSS' | 'SQLi' | 'Authentication' | 'Configuration' | 'Other'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  url: string
  method: string
  parameter?: string
  evidence: {
    request: RequestOptions
    response: HttpResponse
    payload?: string
  }
  description: string
  recommendation: string
}

export interface WebScannerOptions extends Partial<WebScannerConfigOptions> {
  httpClient: HttpClient
  llm?: {
    provider: LLMProvider
  }
}

export interface WebScannerConfigOptions {
  whitelist: string[]
  maxSteps: number
}

export const createWebVulnerabilityScanner = (options: WebScannerOptions) => {
  const { llm, whitelist: configWhitelist, maxSteps = 100 } = options
  const logger = createLogger('scanner')

  logger.debug(
    'LLM-based vulnerability testing: %s',
    llm ? 'ENABLED' : 'DISABLED',
  )

  const scan = async (targetUrl: string): Promise<AnalysisResult> => {
    const startTime = Date.now()

    if (!llm) {
      logger.warn(
        'No LLM provider configured. Please provide an LLM provider for vulnerability scanning.',
      )
      return {
        vulnerabilities: [],
        scannedFiles: 0,
        duration: 0,
        metadata: {
          error: 'No LLM provider configured',
          completed: false,
        },
      }
    }

    // Get whitelist from config or URL
    const urlObj = new URL(targetUrl)
    const whitelist = configWhitelist || [urlObj.hostname]

    // Check whitelist
    if (!whitelist.includes(urlObj.hostname)) {
      return {
        vulnerabilities: [],
        scannedFiles: 0,
        duration: Date.now() - startTime,
        metadata: {
          error: `Target host ${urlObj.hostname} not in whitelist: ${whitelist.join(', ')}`,
          completed: false,
        },
      }
    }

    // Create and run the AI agent
    const agent = createVulnAgent({
      llmProvider: llm.provider,
      whitelist,
      maxSteps,
      verbose: true,
    })

    const agentResult = await agent.scan(targetUrl)

    // Calculate severity distribution
    const severityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    }

    agentResult.findings.forEach((finding) => {
      severityDistribution[finding.severity]++
    })

    // Convert agent findings to AnalysisResult format
    const result: AnalysisResult = {
      vulnerabilities: agentResult.findings.map((finding) => ({
        id: finding.id,
        type: finding.type.toString(),
        severity: finding.severity,
        file: finding.url,
        line: 0,
        column: 0,
        message: finding.description,
        code: finding.evidence.payload || '',
        rule: `ai-${finding.type.toLowerCase()}`,
      })),
      findings: agentResult.findings,
      scannedFiles: agentResult.stepsExecuted,
      duration: agentResult.duration,
      summary: {
        totalVulnerabilities: agentResult.findings.length,
        severityDistribution,
      },
      metadata: {
        agentSteps: agentResult.stepsExecuted,
        completed: agentResult.stepsExecuted < maxSteps,
        toolsUsed: agentResult.toolsUsed,
        strategy: agentResult.strategy,
        strategyUpdates: agentResult.strategyUpdates || 0,
        reportPath: agentResult.reportPath,
      },
    }

    return result
  }

  return { scan }
}
