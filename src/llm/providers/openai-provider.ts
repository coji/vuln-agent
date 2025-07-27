import { createOpenAI } from '@ai-sdk/openai'
import { createBaseProvider } from '../base-provider.js'
import type { LLMConfig, LLMProvider } from '../types.js'

export const createOpenAIProvider = (config: LLMConfig): LLMProvider => {
  const openai = createOpenAI({
    apiKey: config.apiKey,
  })

  const model = openai('o3')

  return createBaseProvider('OpenAI o3', model)
}