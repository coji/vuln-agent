import type { LLMConfig, LLMProvider } from './types.js'
import { createMockProvider } from './providers/mock-provider.js'
import { createGeminiProvider } from './providers/gemini-provider.js'
import { createAnthropicProvider } from './providers/anthropic-provider.js'
import { createOpenAIProvider } from './providers/openai-provider.js'

export const createLLMProvider = (config: LLMConfig): LLMProvider => {
  if (!config.apiKey || config.apiKey === '') {
    console.warn(`No API key provided for ${config.provider}, using mock provider`)
    return createMockProvider()
  }
  
  switch (config.provider) {
    case 'openai-o3':
      return createOpenAIProvider(config)
      
    case 'anthropic-sonnet4':
      return createAnthropicProvider(config)
      
    case 'gemini-2.5-pro':
    case 'gemini-2.5-flash':
      return createGeminiProvider(config)
      
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }
}