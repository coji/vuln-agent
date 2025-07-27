import { formatPrompt } from './prompt-templates.js'
import type { LLMProvider, VulnerabilityAnalysis } from './types.js'

export const parseAnalysisResponse = (
  response: string,
): VulnerabilityAnalysis => {
  try {
    // Extract JSON from the response if it's wrapped in markdown code blocks
    const jsonMatch =
      response.match(/```json\s*([\s\S]*?)\s*```/) ||
      response.match(/```\s*([\s\S]*?)\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : response

    const parsed = JSON.parse(jsonString)

    // Validate the response structure
    if (!parsed.vulnerabilities || !Array.isArray(parsed.vulnerabilities)) {
      throw new Error(
        'Invalid response structure: missing vulnerabilities array',
      )
    }

    return parsed as VulnerabilityAnalysis
  } catch (error) {
    console.error('Failed to parse LLM response:', error)
    // Return a fallback response
    return {
      vulnerabilities: [],
      summary: 'Failed to analyze code due to parsing error',
      confidence: 0,
    }
  }
}

import { generateObject } from 'ai'
import type { LanguageModelV1 } from 'ai'
import type { z } from 'zod'

export const createBaseProvider = (
  name: string,
  model: LanguageModelV1,
  makeRequest: (prompt: string) => Promise<string>,
): LLMProvider => {
  return {
    name,
    model,
    analyze: async (code: string, context?: string) => {
      const prompt = formatPrompt(code, context)
      const response = await makeRequest(prompt)
      return parseAnalysisResponse(response)
    },
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
