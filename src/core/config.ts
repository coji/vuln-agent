import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { VulnAgentOptions } from '../index.js'
import type { LLMProviderType } from '../llm/types.js'

export interface ConfigFile {
  llm?: {
    provider: LLMProviderType
    apiKey?: string
    temperature?: number
    maxTokens?: number
  }
  scan?: {
    extensions?: string[]
    ignore?: string[]
    maxFileSize?: number
  }
  output?: {
    format?: 'console' | 'json' | 'markdown'
    file?: string
  }
  rules?: {
    enabled?: string[]
    disabled?: string[]
    custom?: Array<{
      id: string
      pattern: string
      severity: string
      message: string
    }>
  }
}

const CONFIG_FILE_NAMES = [
  '.vuln-agentrc.json',
  '.vuln-agentrc',
  'vuln-agent.config.json',
]

export const loadConfig = async (
  startPath: string = process.cwd(),
): Promise<ConfigFile | null> => {
  let currentPath = startPath

  while (currentPath !== '/') {
    for (const configFileName of CONFIG_FILE_NAMES) {
      try {
        const configPath = join(currentPath, configFileName)
        const content = await readFile(configPath, 'utf-8')
        const config = JSON.parse(content) as ConfigFile
        console.log(`Loaded config from ${configPath}`)
        return config
      } catch {
        // File not found or invalid JSON, continue searching
      }
    }

    // Move up one directory
    currentPath = join(currentPath, '..')
  }

  return null
}

export const mergeConfigs = (
  fileConfig: ConfigFile | null,
  cliOptions: VulnAgentOptions,
): VulnAgentOptions => {
  if (!fileConfig) {
    return cliOptions
  }

  const merged: VulnAgentOptions = { ...cliOptions }

  // Merge LLM config
  if (fileConfig.llm && !cliOptions.llm) {
    merged.llm = {
      provider: fileConfig.llm.provider,
      apiKey: fileConfig.llm.apiKey,
    }
  }

  // Merge scan config
  if (fileConfig.scan) {
    merged.extensions = cliOptions.extensions || fileConfig.scan.extensions
    merged.ignore = cliOptions.ignore || fileConfig.scan.ignore
  }

  // Merge output config
  if (fileConfig.output && !cliOptions.format) {
    merged.format = fileConfig.output.format
  }

  return merged
}
