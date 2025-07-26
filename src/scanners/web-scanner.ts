import type { AnalysisResult } from '../core/types.js'
import { createXSSDetector } from './vulnerabilities/xss-detector.js'
import { createSQLiDetector } from './vulnerabilities/sqli-detector.js'
import { createLLMVulnerabilityTester } from './vulnerabilities/llm-tester.js'
import type { LLMProvider } from './vulnerabilities/llm-tester.js'
import { createLogger, output } from '../utils/logger.js'

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
  const { httpClient, llm } = options
  const logger = createLogger('scanner')
  
  // Initialize vulnerability detectors if LLM is available
  const llmTester = llm ? createLLMVulnerabilityTester(llm.provider) : null
  const xssDetector = llm && llmTester ? createXSSDetector({ httpClient, llmTester }) : null
  const sqliDetector = llm && llmTester ? createSQLiDetector({ httpClient, llmTester }) : null
  
  logger.debug('LLM-based vulnerability testing: %s', llm ? 'ENABLED' : 'DISABLED')
  
  const scan = async (targetUrl: string): Promise<AnalysisResult> => {
    const startTime = Date.now()
    const vulnerabilities: WebVulnerability[] = []
    
    // First, get baseline response
    let baselineResponse: HttpResponse
    try {
      baselineResponse = await httpClient.request({
        url: targetUrl,
        method: 'GET'
      })
      
      // If LLM is available, test for XSS in common parameters
      if (xssDetector) {
        output.scanning('Testing for XSS vulnerabilities...')
        
        // Parse URL for query parameters
        const urlObj = new URL(targetUrl)
        const queryParams = Array.from(urlObj.searchParams.keys())
        
        // Test each query parameter for XSS
        for (const param of queryParams) {
          logger.debug('Testing parameter for XSS: %s', param)
          
          const xssResult = await xssDetector.detectXSS({
            url: targetUrl,
            parameter: param,
            parameterLocation: 'query',
            method: 'GET',
            baselineResponse: {
              status: baselineResponse.status,
              headers: baselineResponse.headers,
              body: baselineResponse.body
            }
          })
          
          if (xssResult.vulnerable && xssResult.analysis) {
            vulnerabilities.push({
              type: 'XSS',
              severity: xssResult.analysis.severity,
              url: targetUrl,
              method: 'GET',
              parameter: param,
              evidence: {
                request: { 
                  url: targetUrl, 
                  method: 'GET'
                },
                response: baselineResponse,
                payload: xssResult.attempts[xssResult.attempts.length - 1]?.payload
              },
              description: `XSS vulnerability in parameter '${param}': ${xssResult.analysis.evidence[0]?.description || 'Payload reflected without encoding'}`,
              recommendation: xssResult.analysis.remediation
            })
          }
        }
        
        // Test for SQL injection
        if (sqliDetector) {
          output.scanning('Testing for SQL injection vulnerabilities...')
          
          for (const param of queryParams) {
            logger.debug('Testing parameter for SQLi: %s', param)
            
            const sqliResult = await sqliDetector.detectSQLi({
              url: targetUrl,
              parameter: param,
              parameterLocation: 'query',
              method: 'GET',
              baselineResponse: {
                status: baselineResponse.status,
                headers: baselineResponse.headers,
                body: baselineResponse.body
              }
            })
            
            if (sqliResult.vulnerable && sqliResult.analysis) {
              vulnerabilities.push({
                type: 'SQLi',
                severity: sqliResult.analysis.severity,
                url: targetUrl,
                method: 'GET',
                parameter: param,
                evidence: {
                  request: { 
                    url: targetUrl, 
                    method: 'GET'
                  },
                  response: baselineResponse,
                  payload: sqliResult.attempts[sqliResult.attempts.length - 1]?.payload
                },
                description: `SQL injection vulnerability in parameter '${param}': ${sqliResult.analysis.evidence[0]?.description || 'SQL syntax error or data exposure detected'}`,
                recommendation: sqliResult.analysis.remediation
              })
            }
          }
        }
        
        // TODO: Test common POST parameters, headers, cookies
      }
      
      // Convert to standard AnalysisResult format
      const result: AnalysisResult = {
        vulnerabilities: vulnerabilities.map((vuln, index) => ({
          id: `web-${index}`,
          type: vuln.type,
          severity: vuln.severity,
          file: vuln.url,
          line: 0,
          column: 0,
          message: vuln.description,
          code: vuln.evidence.payload || '',
          rule: `web-${vuln.type.toLowerCase()}`
        })),
        scannedFiles: 1,
        duration: Date.now() - startTime
      }
      
      return result
      
    } catch (error) {
      throw new Error(`Failed to scan ${targetUrl}: ${error}`)
    }
  }
  
  return { scan }
}