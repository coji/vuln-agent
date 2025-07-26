#!/usr/bin/env node
import { Command } from 'commander'
import { createVulnAgent, type VulnAgentOptions } from '../../index.js'
import type { LLMProviderType } from '../../llm/types.js'

export const createScanCommand = () => {
  const cmd = new Command('scan')
    .description('Scan for vulnerabilities')
    .argument('<target>', 'Target URL or file/directory path')
    .option('-m, --mode <mode>', 'Scan mode (code|web)', 'web')
    .option('-f, --format <format>', 'Output format (console|json|markdown)', 'console')
    .option('-l, --llm <provider>', 'LLM provider (openai-o3|anthropic-sonnet4|gemini-2.5-pro|gemini-2.5-flash)')
    .option('-e, --extensions <ext>', 'File extensions to scan (comma-separated)', '.js,.ts,.jsx,.tsx')
    .option('-i, --ignore <patterns>', 'Patterns to ignore (comma-separated)', 'node_modules,.git,dist')
    .option('-w, --whitelist <hosts>', 'Allowed hosts for web scanning (comma-separated)')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-d, --debug', 'Enable debug output')
    .allowUnknownOption(false)
  
  cmd.action(async (target: string, options) => {
      // Enable debug output if requested
      if (options.debug) {
        const { enableAllDebug } = await import('../../utils/logger.js')
        enableAllDebug()
      } else if (options.verbose) {
        const { enableDebug } = await import('../../utils/logger.js')
        enableDebug('vuln-agent:scanner,vuln-agent:vulnerability')
      }
      
      const { debug } = await import('../../utils/logger.js')
      debug.cli('Raw options received: %O', options)
      debug.cli('LLM value: %s', options.llm)
      const vulnAgentOptions: VulnAgentOptions = {
        mode: options.mode as 'code' | 'web',
        format: options.format as 'console' | 'json' | 'markdown',
        extensions: options.extensions.split(','),
        ignore: options.ignore.split(','),
      }
      
      if (options.whitelist) {
        vulnAgentOptions.whitelist = options.whitelist.split(',')
      }
      

      if (options.llm) {
        debug.cli('LLM provider specified: %s', options.llm)
        vulnAgentOptions.llm = {
          provider: options.llm as LLMProviderType,
        }
      } else {
        debug.cli('No LLM provider specified')
      }

      try {
        const agent = createVulnAgent(vulnAgentOptions)
        await agent.analyze(target)
      } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
    
  return cmd
}