import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { createBaseProvider } from '../base-provider.js'
import type { LLMConfig, LLMProvider } from '../types.js'

export const createGeminiProvider = (config: LLMConfig): LLMProvider => {
  const google = createGoogleGenerativeAI({
    apiKey: config.apiKey,
  })

  const modelMap = {
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemini-2.5-flash': 'gemini-2.5-flash',
  }

  const model =
    config.provider === 'gemini-2.5-pro' ||
    config.provider === 'gemini-2.5-flash'
      ? google(modelMap[config.provider])
      : google('gemini-2.5-flash')

  const makeRequest = async (prompt: string): Promise<string> => {
    const { text } = await generateText({
      model,
      prompt,
      temperature: config.temperature || 0.1,
      maxTokens: config.maxTokens,
    })
    return text
  }

  return createBaseProvider(`Gemini ${config.provider}`, makeRequest)
}
