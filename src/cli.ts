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
    .option('--non-interactive', 'Skip interactive setup')
    .action(async (options) => {
      const isGlobal = !options.local

      try {
        // Load existing config
        const config = await loadConfig()

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

        // Interactive mode (default unless --non-interactive is specified)
        if (!options.nonInteractive) {
          const { default: inquirer } = await import('inquirer')

          console.log('🔧 VulnAgent Configuration Setup\n')

          // First, select the default LLM provider
          const llmAnswer = await inquirer.prompt([
            {
              type: 'list',
              name: 'defaultLLM',
              message: 'Select your default LLM provider:',
              choices: [
                { name: 'OpenAI GPT-4o (o3)', value: 'openai-o3' },
                { name: 'Anthropic Claude Sonnet 4', value: 'claude-sonnet-4' },
                { name: 'Google Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
                {
                  name: 'Google Gemini 2.5 Flash (Fast & Cheap)',
                  value: 'gemini-2.5-flash',
                },
                { name: "None (I'll specify each time)", value: '' },
              ],
              default: config.defaultLLM || '',
            },
          ])

          config.defaultLLM = llmAnswer.defaultLLM

          // Then, ask for the corresponding API key
          if (llmAnswer.defaultLLM) {
            // biome-ignore lint/suspicious/noExplicitAny: inquirer types are complex and dynamic
            const apiKeyPrompt: any[] = []

            if (llmAnswer.defaultLLM.startsWith('openai')) {
              apiKeyPrompt.push({
                type: 'password',
                name: 'openaiKey',
                message: 'OpenAI API Key:',
                default: config.apiKeys?.openai || '',
                validate: (input: string) =>
                  input.length > 0 ||
                  'API key is required for the selected provider',
              })
            } else if (llmAnswer.defaultLLM.startsWith('claude')) {
              apiKeyPrompt.push({
                type: 'password',
                name: 'anthropicKey',
                message: 'Anthropic API Key:',
                default: config.apiKeys?.anthropic || '',
                validate: (input: string) =>
                  input.length > 0 ||
                  'API key is required for the selected provider',
              })
            } else if (llmAnswer.defaultLLM.startsWith('gemini')) {
              apiKeyPrompt.push({
                type: 'password',
                name: 'googleKey',
                message: 'Google API Key:',
                default: config.apiKeys?.google || '',
                validate: (input: string) =>
                  input.length > 0 ||
                  'API key is required for the selected provider',
              })
            }

            if (apiKeyPrompt.length > 0) {
              const apiKeyAnswer = await inquirer.prompt(apiKeyPrompt)

              if (apiKeyAnswer.openaiKey)
                config.apiKeys.openai = apiKeyAnswer.openaiKey
              if (apiKeyAnswer.anthropicKey)
                config.apiKeys.anthropic = apiKeyAnswer.anthropicKey
              if (apiKeyAnswer.googleKey)
                config.apiKeys.google = apiKeyAnswer.googleKey
            }
          }

          // Optionally ask for other API keys
          const additionalKeysAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'additionalKeys',
              message:
                'Would you like to configure additional API keys for other providers?',
              default: false,
            },
          ])

          if (additionalKeysAnswer.additionalKeys) {
            const additionalAnswers = await inquirer.prompt([
              {
                type: 'password',
                name: 'openaiKey',
                message: 'OpenAI API Key (optional):',
                default: config.apiKeys?.openai || '',
                when: !llmAnswer.defaultLLM.startsWith('openai'),
              },
              {
                type: 'password',
                name: 'anthropicKey',
                message: 'Anthropic API Key (optional):',
                default: config.apiKeys?.anthropic || '',
                when: !llmAnswer.defaultLLM.startsWith('claude'),
              },
              {
                type: 'password',
                name: 'googleKey',
                message: 'Google API Key (optional):',
                default: config.apiKeys?.google || '',
                when: !llmAnswer.defaultLLM.startsWith('gemini'),
              },
            ])

            if (additionalAnswers.openaiKey)
              config.apiKeys.openai = additionalAnswers.openaiKey
            if (additionalAnswers.anthropicKey)
              config.apiKeys.anthropic = additionalAnswers.anthropicKey
            if (additionalAnswers.googleKey)
              config.apiKeys.google = additionalAnswers.googleKey
          }
        }

        // Save config
        const savedPath = await saveConfig(config, isGlobal)
        console.log(`✅ Configuration saved to ${savedPath}`)

        // Show configuration summary
        if (config.defaultLLM) {
          console.log(`🤖 Default LLM provider: ${config.defaultLLM}`)
        }

        const configured = []
        if (config.apiKeys?.openai) configured.push('OpenAI')
        if (config.apiKeys?.anthropic) configured.push('Anthropic')
        if (config.apiKeys?.google) configured.push('Google')

        if (configured.length > 0) {
          console.log(`🔑 API keys configured for: ${configured.join(', ')}`)
        }

        // If no config was set through options and non-interactive mode, show help
        if (
          options.nonInteractive &&
          !options.openaiKey &&
          !options.anthropicKey &&
          !options.googleKey &&
          !config.defaultLLM
        ) {
          console.log(
            '\n💡 Tip: Run without --non-interactive for guided setup',
          )
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
    .option(
      '-s, --max-steps <number>',
      'Maximum number of AI agent steps (default: 100)',
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

    // Load config to get defaults
    const config = await loadConfig()
    const llmProvider = options.llm || config.defaultLLM

    // Handle maxSteps: command line > config > default (100)
    if (options.maxSteps) {
      const steps = parseInt(options.maxSteps, 10)
      if (!Number.isNaN(steps) && steps > 0) {
        vulnAgentOptions.maxSteps = steps
      } else {
        console.error('\n❌ Error: --max-steps must be a positive number')
        process.exit(1)
      }
    } else if (config.maxSteps) {
      vulnAgentOptions.maxSteps = config.maxSteps
    }

    // Pass verbose flag
    if (options.verbose) {
      vulnAgentOptions.verbose = true
    }

    if (llmProvider) {
      debug.cli('LLM provider: %s', llmProvider)

      // Load API key from config or environment
      const apiKey = await getApiKey(llmProvider)

      if (apiKey) {
        debug.cli('API key found for provider: %s', llmProvider)
      } else {
        debug.cli('No API key found for provider: %s', llmProvider)
        console.error(
          `\n❌ Error: No API key found for ${llmProvider}. Please run 'vuln-agent init' to configure.`,
        )
        process.exit(1)
      }

      vulnAgentOptions.llm = {
        provider: llmProvider as LLMProviderType,
        apiKey: apiKey,
      }
    } else {
      console.error(
        "\n❌ Error: No LLM provider specified. Please run 'vuln-agent init' to set a default provider.",
      )
      process.exit(1)
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
