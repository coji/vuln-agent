import { createAnthropic } from '@ai-sdk/anthropic'
import { createBaseProvider } from '../base-provider.js'
import type { LLMConfig, LLMProvider } from '../types.js'

export const createAnthropicProvider = (config: LLMConfig): LLMProvider => {
  const anthropic = createAnthropic({
    apiKey: config.apiKey,
  })

  const model = anthropic('claude-sonnet-4-20250514	')

  return createBaseProvider('Anthropic Sonnet 4', model)
}