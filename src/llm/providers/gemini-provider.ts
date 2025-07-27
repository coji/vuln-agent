import { createGoogleGenerativeAI } from '@ai-sdk/google'
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

  return createBaseProvider(`Gemini ${config.provider}`, model)
}