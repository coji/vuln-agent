import { createVulnAgent } from './agent.js'
import type {
  AnalysisResult,
  LLMProvider,
  LLMVulnerabilityTester,
  SeverityLevel,
  VulnerabilityAnalysisResult,
  VulnerabilityAttempt,
  VulnerabilityTestContext,
  VulnerabilityType,
} from './types.js'
import { createLogger, debug } from './utils.js'

export interface ScannerOptions {
  whitelist?: string[]
  llm?: {
    provider: LLMProvider
  }
  maxAttempts?: number
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

/**
 * Creates a unified vulnerability detector for all types
 */
export const createVulnerabilityDetector = (options: {
  httpClient: HttpClient
  llmTester: LLMVulnerabilityTester
  maxAttempts?: number
}) => {
  const { httpClient, llmTester, maxAttempts = 3 } = options

  const injectPayload = (
    url: string,
    param: string,
    payload: string,
    location: string,
  ): string => {
    const urlObj = new URL(url)

    switch (location) {
      case 'query':
        urlObj.searchParams.set(param, payload)
        return urlObj.toString()
      case 'path':
        // Replace path parameter placeholders
        return url.replace(`:${param}`, encodeURIComponent(payload))
      default:
        return url
    }
  }

  const detect = async (
    context: VulnerabilityTestContext,
    vulnerabilityType: VulnerabilityType | string,
  ): Promise<VulnerabilityAnalysisResult | null> => {
    const logger =
      vulnerabilityType.toLowerCase() === 'xss'
        ? debug.xss
        : vulnerabilityType.toLowerCase() === 'sqli'
          ? debug.sqli
          : debug.vulnerability
    const attempts: VulnerabilityAttempt[] = []

    for (let i = 0; i < maxAttempts; i++) {
      logger(`Attempt ${i + 1}/${maxAttempts} for ${vulnerabilityType}`)

      // 1. Generate payload using LLM
      const { payload, reasoning, technique } = await llmTester.generatePayload(
        {
          ...context,
          previousAttempts: attempts,
        },
        vulnerabilityType,
      )

      logger('Testing with payload: %s', payload)
      logger('Technique: %s', technique)
      logger('Reasoning: %s', reasoning)

      // 2. Send the payload
      let testResponse: HttpResponse
      const testUrl = injectPayload(
        context.url,
        context.parameter,
        payload,
        context.parameterLocation,
      )

      if (
        context.parameterLocation === 'query' ||
        context.parameterLocation === 'path'
      ) {
        testResponse = await httpClient.request({
          url: testUrl,
          method: context.method,
        })
      } else if (context.parameterLocation === 'body') {
        // Handle both JSON and form-encoded bodies
        const isJson = context.method === 'POST' || context.method === 'PUT'
        const contentType = isJson
          ? 'application/json'
          : 'application/x-www-form-urlencoded'

        testResponse = await httpClient.request({
          url: context.url,
          method: context.method,
          headers: { 'Content-Type': contentType },
          body: isJson
            ? JSON.stringify({ [context.parameter]: payload })
            : `${context.parameter}=${encodeURIComponent(payload)}`,
        })
      } else {
        // Header or cookie injection
        const headers: Record<string, string> = {}
        if (context.parameterLocation === 'header') {
          headers[context.parameter] = payload
        } else if (context.parameterLocation === 'cookie') {
          headers.Cookie = `${context.parameter}=${payload}`
        }

        testResponse = await httpClient.request({
          url: context.url,
          method: context.method,
          headers,
        })
      }

      // 3. Analyze the response using LLM
      const analysis = await llmTester.analyzeResponse(context, {
        payload,
        technique,
        response: testResponse,
        reasoning,
        vulnerabilityType,
      })

      logger('Analysis result: %O', analysis)

      // Track attempt
      const attemptResult = analysis.isVulnerable
        ? analysis.evidence[0]?.type || 'unknown'
        : 'no_change'

      attempts.push({
        payload,
        result: attemptResult as VulnerabilityAttempt['result'],
        response: testResponse,
      })

      // If vulnerable, return immediately
      if (analysis.isVulnerable) {
        logger('✅ Vulnerability confirmed!')
        return analysis
      }

      // If filter detected and we have more attempts, try bypass
      if (analysis.filterDetected && i < maxAttempts - 1) {
        logger('Filter detected: %s', analysis.filterDetected.type)
        logger('Suggested bypass: %s', analysis.filterDetected.bypass)
      }
    }

    logger('No vulnerability found after %d attempts', maxAttempts)
    return null
  }

  return { detect }
}

/**
 * Creates a web vulnerability scanner
 */
export const createWebScanner = async (
  targetUrl: string,
  options: ScannerOptions = {},
): Promise<AnalysisResult> => {
  const logger = createLogger('web-scanner')
  const { whitelist = [], llm } = options

  // If no LLM provider, return empty results
  if (!llm?.provider) {
    logger.warn(
      'No LLM provider configured. Please provide an LLM provider for vulnerability scanning.',
    )
    return {
      vulnerabilities: [],
      scannedFiles: 0,
      duration: 0,
      summary: {
        totalVulnerabilities: 0,
        severityDistribution: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
      },
      metadata: {
        error: 'No LLM provider configured',
      },
    }
  }

  // Run AI agent scan
  logger.info(`Starting autonomous scan of ${targetUrl}`)

  const agent = createVulnAgent({
    llmProvider: llm.provider,
    whitelist,
    maxSteps: 100,
    verbose: false,
  })

  const agentResult = await agent.scan(targetUrl)

  // Calculate severity distribution
  const severityDistribution: Record<SeverityLevel, number> = {
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
      completed: !agentResult.error,
      toolsUsed: agentResult.toolsUsed,
      strategy: agentResult.strategy,
      strategyUpdates: agentResult.strategyUpdates,
    },
  }

  return result
}

/**
 * Creates a web vulnerability scanner (alternative interface)
 */
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
    const severityDistribution: Record<SeverityLevel, number> = {
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
