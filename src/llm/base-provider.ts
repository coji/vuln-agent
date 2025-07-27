import type { LanguageModelV1 } from 'ai'
import { generateObject } from 'ai'
import type { z } from 'zod'
import type { LLMProvider } from './types.js'

export const createBaseProvider = (
  name: string,
  model: LanguageModelV1,
): LLMProvider => {
  return {
    name,
    model,
    generateObject: async <T>(params: {
      prompt: string
      schema: z.ZodSchema<T>
    }) => {
      const result = await generateObject({
        model,
        prompt: params.prompt,
        schema: params.schema,
      })
      return { object: result.object }
    },
  }
}