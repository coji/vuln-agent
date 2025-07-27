import type { z } from 'zod'
import { createLLM } from '../../llm.js'
import type { LLMProviderType } from '../../types.js'
import { debug } from '../../utils/logger.js'
import type { LLMProvider as VulnLLMProvider } from './llm-tester.js'

export const createVulnerabilityLLMProvider = (
  providerType: LLMProviderType,
  apiKey: string,
): VulnLLMProvider => {
  // Use the unified LLM provider
  const llmProvider = createLLM({ provider: providerType, apiKey })

  return {
    generateObject: async <T>(params: {
      prompt: string
      schema: z.ZodSchema<T>
    }) => {
      debug.vulnerability(
        'Generating object for vulnerability testing with prompt length: %d',
        params.prompt.length,
      )

      try {
        const result = await llmProvider.generateObject(params)
        return { object: result.object as T }
      } catch (error) {
        debug.vulnerability('LLM generation error: %O', error)
        throw error
      }
    },
  }
}