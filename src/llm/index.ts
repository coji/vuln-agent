import { createAnthropicProvider } from './providers/anthropic-provider.js'
import { createGeminiProvider } from './providers/gemini-provider.js'
import { createOpenAIProvider } from './providers/openai-provider.js'
import type { LLMConfig, LLMProvider } from './types.js'

export const createLLMProvider = (config: LLMConfig): LLMProvider => {
  switch (config.provider) {
    case 'openai-o3':
      return createOpenAIProvider(config)
    case 'anthropic-sonnet4':
      return createAnthropicProvider(config)
    case 'gemini-2.5-pro':
    case 'gemini-2.5-flash':
      return createGeminiProvider(config)
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`)
  }
}

export * from './types.js'