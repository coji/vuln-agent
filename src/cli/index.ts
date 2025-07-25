#!/usr/bin/env node
import { loadConfig, mergeConfigs } from '../core/config.js'
import { createVulnAgent, type VulnAgentOptions } from '../index.js'
import type { LLMProviderType } from '../llm/types.js'

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
vuln-agent - LLM-powered vulnerability scanner

Usage: vuln-agent [options] <target>

Target can be:
  - Local file path (e.g., ./src/index.js)
  - Local directory path (e.g., ./src)
  - GitHub repository URL (e.g., https://github.com/user/repo)
  - GitHub subdirectory URL (e.g., https://github.com/user/repo/tree/main/src)
  - GitHub file URL (e.g., https://github.com/user/repo/blob/main/file.js)
  - Direct file URL (e.g., https://example.com/script.js)

Options:
  --llm <provider>     LLM provider to use (openai-o3, anthropic-sonnet4, gemini-2.5-pro, gemini-2.5-flash)
  --format <format>    Output format (console, json, markdown) [default: console]
  --extensions <ext>   File extensions to scan (comma-separated) [default: .js,.ts,.jsx,.tsx]
  --ignore <patterns>  Patterns to ignore (comma-separated) [default: node_modules,.git,dist]
  -h, --help          Show this help message

Environment Variables:
  OPENAI_O3_API_KEY           API key for OpenAI O3
  ANTHROPIC_SONNET4_API_KEY   API key for Anthropic Sonnet 4
  GEMINI_2_5_PRO_API_KEY      API key for Gemini 2.5 Pro
  GEMINI_2_5_FLASH_API_KEY    API key for Gemini 2.5 Flash
  GITHUB_TOKEN                GitHub personal access token (for higher API rate limits)

Examples:
  # Scan local directory with rule-based scanner
  vuln-agent ./src

  # Scan entire GitHub repository
  vuln-agent --llm anthropic-sonnet4 https://github.com/expressjs/express

  # Scan specific GitHub directory
  vuln-agent --llm gemini-2.5-flash https://github.com/nodejs/node/tree/main/lib

  # Scan URL and output as JSON
  vuln-agent --llm gemini-2.5-pro --format json https://example.com/script.js > report.json
`)
  process.exit(0)
}

const main = async () => {
  const path = args[args.length - 1]
  const cliOptions: Partial<VulnAgentOptions> = {}

  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '--llm' && i + 1 < args.length - 1) {
      cliOptions.llm = { provider: args[++i] as LLMProviderType }
    } else if (args[i] === '--format' && i + 1 < args.length - 1) {
      cliOptions.format = args[++i] as 'console' | 'json' | 'markdown'
    } else if (args[i] === '--extensions' && i + 1 < args.length - 1) {
      cliOptions.extensions = args[++i].split(',')
    } else if (args[i] === '--ignore' && i + 1 < args.length - 1) {
      cliOptions.ignore = args[++i].split(',')
    }
  }

  // Load config file
  const fileConfig = await loadConfig(process.cwd())
  const options = mergeConfigs(fileConfig, cliOptions)

  const agent = createVulnAgent(options)

  agent.analyze(path).catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
