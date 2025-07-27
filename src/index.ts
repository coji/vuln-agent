import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createVulnAgent as createAgent } from './agent.js'
import { generateHTMLReport } from './html-generator.js'
import { createLLM } from './llm.js'
import {
  createConsoleReporter,
  createJsonReporter,
  createMarkdownReporter,
} from './reporter.js'
import type { AnalysisResult, LLMProviderType, SeverityLevel } from './types.js'
import { createLogger } from './utils.js'

// Format date as YYYY-MM-DD-HH-mm-ss
const formatReportDate = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`
}

interface Reporters {
  consoleReporter: ReturnType<typeof createConsoleReporter>
  jsonReporter: ReturnType<typeof createJsonReporter>
  markdownReporter: ReturnType<typeof createMarkdownReporter>
}

export interface VulnAgentOptions {
  format?: 'console' | 'json' | 'markdown' | 'html'
  whitelist?: string[]
  maxSteps?: number
  verbose?: boolean
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

    // Priority: provided apiKey > environment variable
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
      // Run the AI agent scan
      if (!vulnLLMProvider) {
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

      const agent = createAgent({
        llmProvider: vulnLLMProvider,
        whitelist: options.whitelist || [],
        maxSteps: options.maxSteps || 100,
        verbose: options.verbose || false,
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
          error: agentResult.error,
          toolsUsed: agentResult.toolsUsed,
          strategy: agentResult.strategy,
          strategyUpdates: agentResult.strategyUpdates,
        },
      }

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
          reportPath = join(process.cwd(), `vuln-report-${formatReportDate()}.html`)
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
            `vuln-report-${formatReportDate()}.html`,
          )
          writeFileSync(legacyReportPath, htmlReport)
          logger.info(`HTML report saved to: ${legacyReportPath}`)
        }
      }

      return result
    },
  }
}
