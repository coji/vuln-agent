import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModelV1 } from 'ai'
import { generateObject } from 'ai'
import type { z } from 'zod'
import type { LLMConfig, LLMProvider } from './types.js'
import { debug } from './utils.js'

/**
 * Creates a base LLM provider with common functionality
 */
const createBaseProvider = (
  name: string,
  model: LanguageModelV1,
): LLMProvider => {
  debug.llm('Creating LLM provider: %s', name)

  return {
    name,
    model,
    generateObject: async <T>(params: {
      prompt: string
      schema: z.ZodSchema<T>
    }) => {
      debug.llm(
        'Generating object with %s, prompt length: %d chars',
        name,
        params.prompt.length,
      )

      const startTime = Date.now()
      const result = await generateObject({
        model,
        prompt: params.prompt,
        schema: params.schema,
      })

      const duration = Date.now() - startTime
      debug.llm('LLM response received in %dms', duration)

      return { object: result.object }
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
    throw new Error(
      `No API key provided for ${config.provider}. Please set ${envVarName} environment variable or provide it in the config file.`,
    )
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
