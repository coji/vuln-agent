import type { LanguageModelV1 } from 'ai'
import type { z } from 'zod'

export interface LLMProvider {
  name: string
  model: LanguageModelV1
  generateObject: <T>(params: {
    prompt: string
    schema: z.ZodSchema<T>
  }) => Promise<{ object: T }>
}


export type LLMProviderType =
  | 'openai-o3'
  | 'anthropic-sonnet4'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'

export interface LLMConfig {
  provider: LLMProviderType
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}
