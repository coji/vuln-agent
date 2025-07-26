import type { AnalysisResult } from './core/types.js'
import type { LLMProviderType } from './llm/types.js'
import { createConsoleReporter } from './reporters/console-reporter.js'
import { createJsonReporter } from './reporters/json-reporter.js'
import { createMarkdownReporter } from './reporters/markdown-reporter.js'
import { createWebVulnerabilityScanner } from './scanners/web-scanner.js'
import { createHttpClient } from './infrastructure/http/client.js'
import { createVulnerabilityLLMProvider } from './scanners/vulnerabilities/llm-adapter.js'
import { createLogger } from './utils/logger.js'
import { generateHTMLReport } from './infrastructure/storage/html-generator.js'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Reporters {
  consoleReporter: ReturnType<typeof createConsoleReporter>
  jsonReporter: ReturnType<typeof createJsonReporter>
  markdownReporter: ReturnType<typeof createMarkdownReporter>
}

export interface VulnAgentOptions {
  mode?: 'code' | 'web'
  extensions?: string[]
  ignore?: string[]
  format?: 'console' | 'json' | 'markdown'
  whitelist?: string[]
  llm?: {
    provider: LLMProviderType
    apiKey?: string
  }
}

export const createVulnAgent = (options: VulnAgentOptions = {}) => {
  // Default to web mode
  const mode = options.mode || 'web'
  
  // Common reporters
  const consoleReporter = createConsoleReporter()
  const jsonReporter = createJsonReporter()
  const markdownReporter = createMarkdownReporter()
  
  // Mode-specific setup
  if (mode === 'web') {
    return createWebAgent(options, { consoleReporter, jsonReporter, markdownReporter })
  } else {
    return createCodeAgent(options, { consoleReporter, jsonReporter, markdownReporter })
  }
}

const createWebAgent = (options: VulnAgentOptions, reporters: Reporters) => {
  const logger = createLogger('agent')
  const httpClient = createHttpClient({
    rateLimit: { maxRequests: 60, windowMs: 60000 },
    timeout: 10000,
    retries: 3,
    whitelist: options.whitelist || []
  })
  
  // Setup LLM if configured
  let vulnLLMProvider = null
  if (options.llm) {
    // Map provider type to API key environment variable
    const getApiKeyEnvName = (provider: string) => {
      if (provider.startsWith('openai')) return 'OPENAI_API_KEY'
      if (provider.startsWith('anthropic')) return 'ANTHROPIC_API_KEY'
      if (provider.startsWith('gemini')) return 'GOOGLE_API_KEY'
      return `${provider.toUpperCase().replace('-', '_')}_API_KEY`
    }
    
    const apiKey = options.llm.apiKey || 
      process.env[getApiKeyEnvName(options.llm.provider)] || ''
    
    if (apiKey) {
      logger.info(`Using LLM provider: ${options.llm.provider}`)
      vulnLLMProvider = createVulnerabilityLLMProvider(options.llm.provider, apiKey)
    } else {
      logger.warn(`No API key found for ${options.llm.provider}. Set ${getApiKeyEnvName(options.llm.provider)} environment variable.`)
    }
  }
  
  const scanner = createWebVulnerabilityScanner({
    httpClient,
    llm: vulnLLMProvider ? { provider: vulnLLMProvider } : undefined
  })
  
  return {
    analyze: async (targetUrl: string) => {
      const result = await scanner.scan(targetUrl)
      
      // Output results
      if (options.format === 'json') {
        console.log(reporters.jsonReporter.generate(result))
      } else if (options.format === 'markdown') {
        console.log(reporters.markdownReporter.generate(result))
      } else {
        console.log(reporters.consoleReporter.generate(result))
      }
      
      // Generate HTML report if vulnerabilities found
      if (result.vulnerabilities.length > 0 && vulnLLMProvider) {
        const agentResult = {
          sessionId: `scan-${Date.now()}`,
          targetUrl,
          findings: result.vulnerabilities.map(v => ({
            id: v.id,
            type: v.type as any,
            severity: v.severity,
            url: v.file,
            description: v.message,
            recommendation: 'Please review and fix this vulnerability',
            confidence: 0.9,
            timestamp: new Date(),
            evidence: {
              request: { url: v.file, method: 'GET' },
              response: { status: 200, headers: {}, body: '' },
              payload: v.code
            }
          })),
          stepsExecuted: result.scannedFiles,
          duration: result.duration
        }
        
        const htmlReport = generateHTMLReport(agentResult)
        const reportPath = join(process.cwd(), `vuln-report-${Date.now()}.html`)
        writeFileSync(reportPath, htmlReport)
        logger.info(`HTML report saved to: ${reportPath}`)
      }
      
      return result
    }
  }
}

const createCodeAgent = (_options: VulnAgentOptions, _reporters: Reporters) => {
  const logger = createLogger('agent')
  
  const analyze = async (_target: string): Promise<AnalysisResult> => {
    logger.error('Code analysis mode is temporarily disabled during LLM-native transformation')
    logger.info('Please use web mode (-m web) for vulnerability scanning')
    
    // Return empty result
    return {
      vulnerabilities: [],
      scannedFiles: 0,
      duration: 0
    }
  }

  return { analyze }
}
