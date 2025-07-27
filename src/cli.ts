#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getApiKey, getConfigPath, loadConfig, saveConfig } from './config.js'
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
const createInitCommand = () => {
  return new Command('init')
    .description('Initialize vuln-agent configuration and set API keys')
    .option('--global', 'Save to global config directory (default)')
    .option('--local', 'Save to current directory')
    .option('--openai-key <key>', 'Set OpenAI API key')
    .option('--anthropic-key <key>', 'Set Anthropic API key')
    .option('--google-key <key>', 'Set Google API key')
    .option('--interactive', 'Interactive setup mode')
    .action(async (options) => {
      const isGlobal = !options.local

      try {
        // Load existing config
        let config = await loadConfig()

        // Update API keys if provided
        if (!config.apiKeys) {
          config.apiKeys = {}
        }

        if (options.openaiKey) {
          config.apiKeys.openai = options.openaiKey
        }
        if (options.anthropicKey) {
          config.apiKeys.anthropic = options.anthropicKey
        }
        if (options.googleKey) {
          config.apiKeys.google = options.googleKey
        }

        // Interactive mode
        if (options.interactive) {
          const { default: inquirer } = await import('inquirer')

          console.log('🔧 VulnAgent Configuration Setup\n')

          const answers = await inquirer.prompt([
            {
              type: 'password',
              name: 'openaiKey',
              message: 'OpenAI API Key (optional):',
              default: config.apiKeys.openai || '',
            },
            {
              type: 'password',
              name: 'anthropicKey',
              message: 'Anthropic API Key (optional):',
              default: config.apiKeys.anthropic || '',
            },
            {
              type: 'password',
              name: 'googleKey',
              message: 'Google API Key (optional):',
              default: config.apiKeys.google || '',
            },
          ])

          if (answers.openaiKey) config.apiKeys.openai = answers.openaiKey
          if (answers.anthropicKey)
            config.apiKeys.anthropic = answers.anthropicKey
          if (answers.googleKey) config.apiKeys.google = answers.googleKey
        }

        // Save config
        const savedPath = await saveConfig(config, isGlobal)
        console.log(`✅ Configuration saved to ${savedPath}`)

        // Show which API keys were configured
        const configured = []
        if (config.apiKeys?.openai) configured.push('OpenAI')
        if (config.apiKeys?.anthropic) configured.push('Anthropic')
        if (config.apiKeys?.google) configured.push('Google')

        if (configured.length > 0) {
          console.log(`📝 API keys configured for: ${configured.join(', ')}`)
        }

        // Show location info
        if (isGlobal) {
          console.log(
            '\n📍 This is your global configuration that will be used for all projects.',
          )
          console.log(`   Location: ${getConfigPath(true)}`)
        } else {
          console.log(
            '\n📍 This is a local configuration for this directory only.',
          )
          console.log(
            '⚠️  Remember to add .vulnagentrc.json to your .gitignore file!',
          )
        }
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

      // Load API key from config or environment
      const apiKey = await getApiKey(options.llm)

      if (apiKey) {
        debug.cli('API key found for provider: %s', options.llm)
      } else {
        debug.cli('No API key found for provider: %s', options.llm)
      }

      vulnAgentOptions.llm = {
        provider: options.llm as LLMProviderType,
        apiKey: apiKey,
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
