import type { z } from 'zod'
import type { LLMProvider } from '../../src/types.js'

/**
 * A simpler mock provider that returns predefined results
 */
export const createSimpleMockProvider = (): LLMProvider => {
  let callCount = 0

  // Create a minimal model that passes SDK checks
  const mockModel = {
    specificationVersion: 'v1' as const,
    defaultObjectGenerationMode: 'tool' as const,
    supportsStructuredOutputs: true,
    supportsImageUrls: false,

    doStream: async () => {
      // Return empty stream - agent will handle no tool calls gracefully
      const stream = new ReadableStream({
        start(controller) {
          // Send a single message indicating no tool calls
          controller.enqueue({
            type: 'text-delta',
            textDelta: 'Scanning complete.',
          })

          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: { promptTokens: 10, completionTokens: 5 },
          })

          controller.close()
        },
      })

      return {
        stream,
        warnings: [],
        rawCall: { rawPrompt: null, rawSettings: {} },
      }
    },

    doGenerate: async () => ({
      text: 'Mock response',
      usage: { promptTokens: 10, completionTokens: 5 },
      finishReason: 'stop',
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }

  return {
    name: 'simple-mock',
    model: mockModel as unknown as LLMProvider['model'],
    generateObject: async <T>(params: {
      prompt: string
      schema: z.ZodSchema<T>
    }) => {
      callCount++

      // Return mock vulnerability for testing
      if (params.prompt.includes('XSS') || callCount === 1) {
        return {
          object: {
            payload: '<script>alert(1)</script>',
            reasoning: 'Test XSS payload',
            technique: 'script-injection',
            confidence: 0.9,
          } as T,
        }
      }

      return { object: {} as T }
    },
  }
}
