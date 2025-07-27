import { promises as fs } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

export interface VulnAgentConfig {
  format?: string
  defaultLLM?: string
  maxSteps?: number
  web?: {
    whitelist?: string[]
  }
  apiKeys?: {
    openai?: string
    anthropic?: string
    google?: string
  }
}

/**
 * Get the global config directory path based on the platform
 */
export const getGlobalConfigDir = (): string => {
  const home = homedir()
  const plat = platform()

  if (plat === 'win32') {
    // Windows: %APPDATA%/vuln-agent
    return join(
      process.env.APPDATA || join(home, 'AppData', 'Roaming'),
      'vuln-agent',
    )
  }

  // macOS/Linux: Follow XDG Base Directory specification
  const xdgConfigHome = process.env.XDG_CONFIG_HOME || join(home, '.config')
  return join(xdgConfigHome, 'vuln-agent')
}

/**
 * Get the global config file path
 */
export const getGlobalConfigPath = (): string => {
  return join(getGlobalConfigDir(), 'config.json')
}

/**
 * Get the local config file path
 */
export const getLocalConfigPath = (): string => {
  return join(process.cwd(), '.vulnagentrc.json')
}

/**
 * Get the appropriate config path based on isGlobal flag
 */
export const getConfigPath = (isGlobal: boolean): string => {
  return isGlobal ? getGlobalConfigPath() : getLocalConfigPath()
}

/**
 * Ensure the global config directory exists
 */
export const ensureGlobalConfigDir = async (): Promise<void> => {
  const dir = getGlobalConfigDir()
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Load configuration from all sources with proper precedence
 * Priority: local > global > defaults
 */
export const loadConfig = async (): Promise<VulnAgentConfig> => {
  const defaultConfig: VulnAgentConfig = {
    format: 'console',
    defaultLLM: '',
    maxSteps: 100,
    web: {
      whitelist: [],
    },
    apiKeys: {
      openai: '',
      anthropic: '',
      google: '',
    },
  }

  let config = { ...defaultConfig }

  // Try to load global config
  try {
    const globalConfig = JSON.parse(
      await fs.readFile(getGlobalConfigPath(), 'utf-8'),
    )
    config = { ...config, ...globalConfig }
  } catch {
    // Global config doesn't exist, that's okay
  }

  // Try to load local config (higher priority)
  try {
    const localConfig = JSON.parse(
      await fs.readFile(getLocalConfigPath(), 'utf-8'),
    )
    config = { ...config, ...localConfig }
  } catch {
    // Local config doesn't exist, that's okay
  }

  return config
}

/**
 * Save configuration to the specified location
 */
export const saveConfig = async (
  config: VulnAgentConfig,
  isGlobal: boolean = true,
): Promise<string> => {
  const configPath = isGlobal ? getGlobalConfigPath() : getLocalConfigPath()

  if (isGlobal) {
    await ensureGlobalConfigDir()
  }

  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
  return configPath
}

/**
 * Get API key from config with fallback to environment variables
 */
export const getApiKey = async (
  provider: string,
): Promise<string | undefined> => {
  const config = await loadConfig()

  // Check config file first
  if (config.apiKeys) {
    if (provider.includes('openai') && config.apiKeys.openai) {
      return config.apiKeys.openai
    }
    if (provider.includes('claude') && config.apiKeys.anthropic) {
      return config.apiKeys.anthropic
    }
    if (provider.includes('gemini') && config.apiKeys.google) {
      return config.apiKeys.google
    }
  }

  // Fall back to environment variables
  const envVarMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  }

  for (const [key, envVar] of Object.entries(envVarMap)) {
    if (provider.includes(key)) {
      return process.env[envVar]
    }
  }

  return undefined
}
