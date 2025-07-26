import type { LLMProvider } from './llm-tester.js'
import { z } from 'zod'

export interface XSSDetectionContext {
  url: string
  parameter: string
  parameterLocation: 'query' | 'body' | 'header' | 'cookie' | 'path'
  method: string
  baselineResponse: {
    status: number
    headers: Record<string, string>
    body: string
  }
}

export const createLLMXSSDetector = (llm: LLMProvider) => {
  return {
    async detect(context: XSSDetectionContext) {
      const prompt = `Analyze this web application context for XSS vulnerabilities:

URL: ${context.url}
Parameter: ${context.parameter}
Location: ${context.parameterLocation}
Method: ${context.method}

Baseline Response (normal):
Status: ${context.baselineResponse.status}
Headers: ${JSON.stringify(context.baselineResponse.headers, null, 2)}
Body (first 3000 chars): ${context.baselineResponse.body.substring(0, 3000)}

Analysis Tasks:
1. Identify where the parameter value might be reflected in the response
2. Determine if there's any input validation or encoding
3. Suggest the most effective XSS payload for this context
4. Consider the detected technologies and frameworks
5. Account for any Content-Security-Policy or X-XSS-Protection headers

Provide:
- Whether XSS is likely possible
- The best payload to test
- Expected indicators of success
- Confidence level (0-1)`

      const result = await llm.generateObject({
        prompt,
        schema: z.object({
          isPossible: z.boolean(),
          confidence: z.number().min(0).max(1),
          suggestedPayload: z.string(),
          payloadStrategy: z.string(),
          expectedIndicators: z.array(z.string()),
          detectedProtections: z.array(z.string()),
          contextualNotes: z.string(),
        }),
      })

      return result.object
    }
  }
}