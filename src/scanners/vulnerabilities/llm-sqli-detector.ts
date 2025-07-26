import type { LLMProvider } from './llm-tester.js'
import { z } from 'zod'

export interface SQLiDetectionContext {
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

export const createLLMSQLiDetector = (llm: LLMProvider) => {
  return {
    async detect(context: SQLiDetectionContext) {
      const prompt = `Analyze this web application context for SQL injection vulnerabilities:

URL: ${context.url}
Parameter: ${context.parameter}
Location: ${context.parameterLocation}
Method: ${context.method}

Baseline Response (normal):
Status: ${context.baselineResponse.status}
Headers: ${JSON.stringify(context.baselineResponse.headers, null, 2)}
Body (first 3000 chars): ${context.baselineResponse.body.substring(0, 3000)}

Analysis Tasks:
1. Look for signs of database interaction (error messages, data listings, etc.)
2. Identify the likely database type if possible
3. Determine if the parameter might be used in SQL queries
4. Suggest the most effective SQL injection payload for this context
5. Consider any WAF or input validation that might be present

Provide:
- Whether SQL injection is likely possible
- The best payload to test
- Expected indicators of success (errors, data exposure, behavior changes)
- Database type if identifiable
- Confidence level (0-1)`

      const result = await llm.generateObject({
        prompt,
        schema: z.object({
          isPossible: z.boolean(),
          confidence: z.number().min(0).max(1),
          suggestedPayload: z.string(),
          payloadStrategy: z.string(),
          expectedIndicators: z.array(z.string()),
          likelyDatabase: z.enum(['mysql', 'postgresql', 'mssql', 'oracle', 'sqlite', 'unknown']),
          detectedProtections: z.array(z.string()),
          contextualNotes: z.string(),
        }),
      })

      return result.object
    }
  }
}