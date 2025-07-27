import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModelV1 } from 'ai'
import { generateObject } from 'ai'
import type { z } from 'zod'
import type { LLMConfig, LLMProvider } from './types.js'

/**
 * Creates a base LLM provider with common functionality
 */
const createBaseProvider = (
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

/**
 * Creates a mock LLM provider for testing
 */
const createMockProvider = (): LLMProvider => {
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
      // Return mock data based on the prompt
      const mockObject = {} as T
      return { object: mockObject }
    },
  }
}

/**
 * Creates an LLM provider based on the configuration
 */
export const createLLM = (config: LLMConfig): LLMProvider => {
  // Map provider to correct environment variable name
  const envVarMap: Record<string, string> = {
    'claude-sonnet-4': 'ANTHROPIC_API_KEY',
    'openai-o3': 'OPENAI_API_KEY',
    'gemini-2.5-pro': 'GOOGLE_GENERATIVE_AI_API_KEY',
    'gemini-2.5-flash': 'GOOGLE_GENERATIVE_AI_API_KEY',
  }

  const envVarName = envVarMap[config.provider]
  const apiKey = config.apiKey || process.env[envVarName] || ''

  if (!apiKey) {
    console.warn(
      `No API key provided for ${config.provider} (${envVarName}), using mock provider`,
    )
    return createMockProvider()
  }

  switch (config.provider) {
    case 'claude-sonnet-4': {
      const anthropic = createAnthropic({ apiKey })
      const model = anthropic('claude-sonnet-4-20250514')
      return createBaseProvider('Claude Sonnet 4', model)
    }

    case 'openai-o3': {
      const openai = createOpenAI({ apiKey })
      const model = openai('o3')
      return createBaseProvider('OpenAI o3', model)
    }

    case 'gemini-2.5-pro': {
      const google = createGoogleGenerativeAI({ apiKey })
      const model = google('gemini-2.5-pro')
      return createBaseProvider('Gemini 2.5 Pro', model)
    }

    case 'gemini-2.5-flash': {
      const google = createGoogleGenerativeAI({ apiKey })
      const model = google('gemini-2.5-flash')
      return createBaseProvider('Gemini 2.5 Flash', model)
    }

    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}
