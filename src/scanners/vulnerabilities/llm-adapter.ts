import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import type { z } from 'zod'
import type { LLMProviderType } from '../../llm/types.js'
import { debug } from '../../utils/logger.js'
import type { LLMProvider as VulnLLMProvider } from './llm-tester.js'

export const createVulnerabilityLLMProvider = (
  providerType: LLMProviderType,
  apiKey: string,
): VulnLLMProvider => {
  // Map provider type to AI SDK model
  const getModel = () => {
    switch (providerType) {
      case 'openai-o3': {
        const openai = createOpenAI({ apiKey })
        return openai('o3')
      }
      case 'anthropic-sonnet4': {
        const anthropic = createAnthropic({ apiKey })
        return anthropic('claude-sonnet-4-20250514')
      }
      case 'gemini-2.5-pro': {
        const google = createGoogleGenerativeAI({ apiKey })
        return google('gemini-2.5-pro')
      }
      case 'gemini-2.5-flash': {
        const googleFlash = createGoogleGenerativeAI({ apiKey })
        return googleFlash('gemini-2.5-flash')
      }
      default:
        throw new Error(`Unsupported provider: ${providerType}`)
    }
  }

  return {
    generateObject: async <T>({
      prompt,
      schema,
    }: {
      prompt: string
      schema: z.ZodSchema<T>
    }) => {
      const model = getModel()

      try {
        const result = await generateObject({
          model,
          prompt,
          schema,
          temperature: 0.3, // Lower temperature for more consistent security testing
        })

        return { object: result.object as T }
      } catch (error) {
        debug.vulnerability('LLM generation error: %O', error)
        throw error
      }
    },
  }
}
