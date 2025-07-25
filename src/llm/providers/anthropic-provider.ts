import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createBaseProvider } from '../base-provider.js'
import type { LLMConfig, LLMProvider } from '../types.js'

export const createAnthropicProvider = (config: LLMConfig): LLMProvider => {
  const anthropic = createAnthropic({
    apiKey: config.apiKey,
  })

  const model = anthropic('claude-sonnet-4-20250514	')

  const makeRequest = async (prompt: string): Promise<string> => {
    const { text } = await generateText({
      model,
      prompt,
      temperature: config.temperature || 0.1,
      maxTokens: config.maxTokens,
    })
    return text
  }

  return createBaseProvider('Anthropic Sonnet 4', makeRequest)
}
