import { createAnalyzer } from './analyzers/analyzer.js'
import { createLLMAnalyzer } from './analyzers/llm-analyzer.js'
import { createFileReader } from './core/file-reader.js'
import { createURLReader } from './core/url-reader.js'
import type { AnalysisResult } from './core/types.js'
import type { LLMProviderType } from './llm/types.js'
import { createConsoleReporter } from './reporters/console-reporter.js'
import { createJsonReporter } from './reporters/json-reporter.js'
import { createMarkdownReporter } from './reporters/markdown-reporter.js'

export interface VulnAgentOptions {
  extensions?: string[]
  ignore?: string[]
  format?: 'console' | 'json' | 'markdown'
  llm?: {
    provider: LLMProviderType
    apiKey?: string
  }
}

export const createVulnAgent = (options: VulnAgentOptions = {}) => {
  const fileReader = createFileReader()
  const urlReader = createURLReader()
  const consoleReporter = createConsoleReporter()
  const jsonReporter = createJsonReporter()
  const markdownReporter = createMarkdownReporter()

  // Choose analyzer based on LLM configuration
  const analyzer = options.llm
    ? createLLMAnalyzer({
        provider: options.llm.provider,
        apiKey: options.llm.apiKey || process.env[`${options.llm.provider.toUpperCase().replace('-', '_')}_API_KEY`] || '',
      })
    : createAnalyzer()

  const analyze = async (target: string): Promise<AnalysisResult> => {
    let files: Map<string, string>
    
    // Check if target is a URL
    if (target.startsWith('http://') || target.startsWith('https://')) {
      // Check if it's a GitHub repository URL (not a specific file)
      const isGitHubRepo = target.includes('github.com') && 
        !target.includes('/blob/') && 
        !target.includes('/raw/') &&
        !target.includes('raw.githubusercontent.com')
      
      if (isGitHubRepo) {
        files = await urlReader.readGitHubRepository(target, {
          extensions: options.extensions,
          maxFileSize: 1024 * 1024, // 1MB limit per file
        })
      } else {
        files = await urlReader.readFromURL(target, {
          extensions: options.extensions,
        })
      }
    } else {
      // Local file/directory
      files = await fileReader.readDirectory(target, {
        extensions: options.extensions,
        ignore: options.ignore,
      })
    }

    const result = await analyzer.analyzeFiles(files)

    if (options.format === 'json') {
      console.log(jsonReporter.generate(result))
    } else if (options.format === 'markdown') {
      console.log(markdownReporter.generate(result))
    } else {
      console.log(consoleReporter.generate(result))
    }

    return result
  }

  return { analyze }
}
