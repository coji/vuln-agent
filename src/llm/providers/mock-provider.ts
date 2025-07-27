import { createOpenAI } from '@ai-sdk/openai'
import type { z } from 'zod'
import type { LLMProvider } from '../types.js'

// Mock provider for testing without API calls
export const createMockProvider = (): LLMProvider => {
  // Create a minimal model for mock purposes
  const openai = createOpenAI({
    apiKey: 'mock-key',
    baseURL: 'https://mock.api',
  })
  const model = openai('gpt-4o-mini')

  return {
    name: 'mock',
    model,
    generateObject: async <T>(_params: {
      prompt: string
      schema: z.ZodSchema<T>
    }) => {
      // Mock implementation that returns a simple object based on the schema
      const defaultObject = {} as T
      return { object: defaultObject }
    },
  }
}