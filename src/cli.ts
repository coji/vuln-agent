#!/usr/bin/env node
import { Command } from 'commander'
import { promises as fs, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createVulnAgent, type VulnAgentOptions } from './index.js'
import type { LLMProviderType } from './types.js'
import { debug, enableAllDebug, enableDebug } from './utils.js'

// Get package.json version
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8'),
)

// Init command
const DEFAULT_CONFIG = `{
  "mode": "web",
  "format": "console",
  "extensions": [".js", ".ts", ".jsx", ".tsx"],
  "ignore": ["node_modules", ".git", "dist", "build"],
  "web": {
    "whitelist": []
  }
}
`

const createInitCommand = () => {
  return new Command('init')
    .description('Initialize vuln-agent configuration')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      const configPath = join(process.cwd(), '.vulnagentrc.json')

      try {
        // Check if config already exists
        if (!options.force) {
          try {
            await fs.access(configPath)
            console.log(
              'Configuration file already exists. Use --force to overwrite.',
            )
            return
          } catch {
            // File doesn't exist, proceed
          }
        }

        // Write config file
        await fs.writeFile(configPath, DEFAULT_CONFIG, 'utf-8')
        console.log('✅ Created .vulnagentrc.json configuration file')
      } catch (error) {
        console.error('Error creating configuration:', error)
        process.exit(1)
      }
    })
}

// Scan command
const createScanCommand = () => {
  const cmd = new Command('scan')
    .description('Scan for vulnerabilities')
    .argument('<target>', 'Target URL')
    .option(
      '-f, --format <format>',
      'Output format (console|json|markdown|html)',
      'console',
    )
    .option(
      '-l, --llm <provider>',
      'LLM provider (openai-o3|claude-sonnet-4|gemini-2.5-pro|gemini-2.5-flash)',
    )
    .option(
      '-w, --whitelist <hosts>',
      'Allowed hosts for web scanning (comma-separated)',
    )
    .option('-v, --verbose', 'Enable verbose output')
    .option('-d, --debug', 'Enable debug output')
    .allowUnknownOption(false)

  cmd.action(async (target: string, options) => {
    // Enable debug output if requested
    if (options.debug) {
      enableAllDebug()
    } else if (options.verbose) {
      enableDebug('vuln-agent:scanner,vuln-agent:vulnerability')
    }

    debug.cli('Raw options received: %O', options)
    debug.cli('LLM value: %s', options.llm)
    const vulnAgentOptions: VulnAgentOptions = {
      format: options.format as 'console' | 'json' | 'markdown' | 'html',
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
      console.error(
        '\n❌ Error:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

  return cmd
}

// Main program
const program = new Command()

program
  .name('vuln-agent')
  .description('LLM-powered vulnerability scanner for web applications')
  .version(packageJson.version)
  .addCommand(createScanCommand())
  .addCommand(createInitCommand())

// Parse without default behavior to force subcommand usage
program.parse()
