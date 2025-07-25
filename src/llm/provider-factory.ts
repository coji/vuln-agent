import type { LLMConfig, LLMProvider } from './types.js'
import { createMockProvider } from './providers/mock-provider.js'

export const createLLMProvider = (config: LLMConfig): LLMProvider => {
  // For now, we'll use the mock provider
  // Real implementations would be added here for each provider
  
  switch (config.provider) {
    case 'openai-o3':
      console.log('OpenAI O3 provider not implemented yet, using mock')
      return createMockProvider()
      
    case 'anthropic-sonnet4':
      console.log('Anthropic Sonnet 4 provider not implemented yet, using mock')
      return createMockProvider()
      
    case 'gemini-2.5-pro':
      console.log('Gemini 2.5 Pro provider not implemented yet, using mock')
      return createMockProvider()
      
    case 'gemini-2.5-flash':
      console.log('Gemini 2.5 Flash provider not implemented yet, using mock')
      return createMockProvider()
      
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }
}