import type { AnalysisResult } from '../core/types.js'
import { createVulnAgent } from '../core/agent.js'
import type { LLMProvider } from './vulnerabilities/llm-tester.js'
import { createLogger } from '../utils/logger.js'

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

export const createWebVulnerabilityScanner = (options: WebScannerOptions) => {
  const { llm } = options
  const logger = createLogger('scanner')
  
  logger.debug('LLM-based vulnerability testing: %s', llm ? 'ENABLED' : 'DISABLED')
  
  const scan = async (targetUrl: string): Promise<AnalysisResult> => {
    if (!llm) {
      logger.warn('No LLM provider configured. Please provide an LLM provider for vulnerability scanning.')
      return {
        vulnerabilities: [],
        scannedFiles: 0,
        duration: 0
      }
    }

    // Get whitelist from the URL
    const urlObj = new URL(targetUrl)
    const whitelist = [urlObj.hostname]
    
    // Create and run the AI agent
    const agent = createVulnAgent({
      llmProvider: llm.provider,
      whitelist,
      maxSteps: 100,
      verbose: true
    })
    
    const agentResult = await agent.scan(targetUrl)
    
    // Convert agent findings to AnalysisResult format
    const result: AnalysisResult = {
      vulnerabilities: agentResult.findings.map((finding) => ({
        id: finding.id,
        type: finding.type,
        severity: finding.severity,
        file: finding.url,
        line: 0,
        column: 0,
        message: finding.description,
        code: finding.evidence.payload || '',
        rule: `ai-${finding.type.toLowerCase()}`
      })),
      scannedFiles: agentResult.stepsExecuted,
      duration: agentResult.duration
    }
    
    return result
  }
  
  return { scan }
}