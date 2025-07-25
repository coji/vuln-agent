import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createBaseProvider } from '../base-provider.js'
import type { LLMConfig, LLMProvider } from '../types.js'

export const createOpenAIProvider = (config: LLMConfig): LLMProvider => {
  const openai = createOpenAI({
    apiKey: config.apiKey,
  })

  const model = openai('o3')

  const makeRequest = async (prompt: string): Promise<string> => {
    const { text } = await generateText({
      model,
      prompt,
      temperature: config.temperature || 0.1,
      maxTokens: config.maxTokens,
    })
    return text
  }

  return createBaseProvider('OpenAI o3', makeRequest)
}
