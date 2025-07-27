import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateHTMLReport } from './html-generator.js'
import { createLLM } from './llm.js'
import {
  createConsoleReporter,
  createJsonReporter,
  createMarkdownReporter,
} from './reporter.js'
import { createWebScanner } from './scanner.js'
import type { LLMProviderType } from './types.js'
import { createLogger } from './utils.js'

interface Reporters {
  consoleReporter: ReturnType<typeof createConsoleReporter>
  jsonReporter: ReturnType<typeof createJsonReporter>
  markdownReporter: ReturnType<typeof createMarkdownReporter>
}

export interface VulnAgentOptions {
  format?: 'console' | 'json' | 'markdown' | 'html'
  whitelist?: string[]
  llm?: {
    provider: LLMProviderType
    apiKey?: string
  }
}

export const createVulnAgent = (options: VulnAgentOptions = {}) => {
  // Common reporters
  const consoleReporter = createConsoleReporter()
  const jsonReporter = createJsonReporter()
  const markdownReporter = createMarkdownReporter()

  // Always use web mode (code mode is disabled)
  return createWebAgent(options, {
    consoleReporter,
    jsonReporter,
    markdownReporter,
  })
}

const createWebAgent = (options: VulnAgentOptions, reporters: Reporters) => {
  const logger = createLogger('agent')

  // Setup LLM if configured
  let vulnLLMProvider = null
  if (options.llm) {
    // Map provider type to API key environment variable
    const getApiKeyEnvName = (provider: string) => {
      if (provider.startsWith('openai')) return 'OPENAI_API_KEY'
      if (provider.startsWith('claude')) return 'ANTHROPIC_API_KEY'
      if (provider.startsWith('anthropic')) return 'ANTHROPIC_API_KEY'
      if (provider.startsWith('gemini')) return 'GOOGLE_GENERATIVE_AI_API_KEY'
      return `${provider.toUpperCase().replace('-', '_')}_API_KEY`
    }

    const apiKey =
      options.llm.apiKey ||
      process.env[getApiKeyEnvName(options.llm.provider)] ||
      ''

    if (apiKey) {
      logger.info(`Using LLM provider: ${options.llm.provider}`)
      vulnLLMProvider = createLLM({
        provider: options.llm.provider,
        apiKey,
      })
    } else {
      logger.warn(
        `No API key found for ${options.llm.provider}. Set ${getApiKeyEnvName(options.llm.provider)} environment variable.`,
      )
    }
  }

  return {
    analyze: async (targetUrl: string) => {
      const result = await createWebScanner(targetUrl, {
        whitelist: options.whitelist || [],
        llm: vulnLLMProvider ? { provider: vulnLLMProvider } : undefined,
      })

      // Generate HTML report if requested or if vulnerabilities found
      let reportPath: string | undefined
      if (options.format === 'html' || result.vulnerabilities.length > 0) {
        if (result.findings && result.findings.length > 0) {
          const agentResult = {
            sessionId: `scan-${Date.now()}`,
            targetUrl,
            findings: result.findings,
            stepsExecuted: result.scannedFiles,
            duration: result.duration,
          }

          const htmlReport = generateHTMLReport(agentResult)
          reportPath = join(process.cwd(), `vuln-report-${Date.now()}.html`)
          writeFileSync(reportPath, htmlReport)
          logger.info(`HTML report saved to: ${reportPath}`)
        }
      }

      // Output results based on format
      if (options.format === 'json') {
        console.log(reporters.jsonReporter.generate(result))
      } else if (options.format === 'markdown') {
        console.log(reporters.markdownReporter.generate(result))
      } else if (options.format === 'html') {
        if (reportPath) {
          console.log(`✅ HTML report generated: ${reportPath}`)
        } else {
          console.log('❌ No vulnerabilities found. HTML report not generated.')
        }
      } else {
        console.log(reporters.consoleReporter.generate(result))
      }

      // Legacy: Generate HTML report if vulnerabilities found (for backward compatibility)
      if (!options.format || options.format === 'console') {
        if (
          result.vulnerabilities.length > 0 &&
          vulnLLMProvider &&
          !reportPath
        ) {
          const agentResult = {
            sessionId: `scan-${Date.now()}`,
            targetUrl,
            findings: result.vulnerabilities.map((v) => ({
              id: v.id,
              type: v.type as
                | 'XSS'
                | 'SQLi'
                | 'Authentication'
                | 'Configuration'
                | 'Other',
              severity: v.severity,
              url: v.file,
              description: v.message,
              recommendation: 'Please review and fix this vulnerability',
              confidence: 0.9,
              timestamp: new Date(),
              evidence: {
                request: { url: v.file, method: 'GET' },
                response: { status: 200, headers: {}, body: '' },
                payload: v.code,
              },
            })),
            stepsExecuted: result.scannedFiles,
            duration: result.duration,
          }

          const htmlReport = generateHTMLReport(agentResult)
          const legacyReportPath = join(
            process.cwd(),
            `vuln-report-${Date.now()}.html`,
          )
          writeFileSync(legacyReportPath, htmlReport)
          logger.info(`HTML report saved to: ${legacyReportPath}`)
        }
      }

      return result
    },
  }
}
