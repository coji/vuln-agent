import { tool } from 'ai'
import { z } from 'zod'
import type { VulnAgentTool } from './types.js'
import type { LLMProvider } from '../scanners/vulnerabilities/llm-tester.js'

export const createTestPayloadTool = (llm: LLMProvider): VulnAgentTool => {
  return {
    name: 'testPayload',
    tool: tool({
      description: 'Generate and analyze vulnerability test payloads using LLM',
      parameters: z.object({
        vulnerabilityType: z.enum(['XSS', 'SQLi', 'Command Injection', 'Path Traversal', 'XXE', 'SSTI'])
          .describe('Type of vulnerability to test for'),
        context: z.object({
          url: z.string(),
          parameter: z.string(),
          parameterLocation: z.enum(['query', 'body', 'header', 'cookie', 'path']),
          method: z.string(),
          previousAttempts: z.array(z.object({
            payload: z.string(),
            result: z.enum(['blocked', 'reflected', 'error', 'no_change', 'success']),
            response: z.string().optional(),
          })).optional(),
          technologies: z.array(z.string()).optional(),
        }).describe('Context for payload generation'),
        baselineResponse: z.object({
          status: z.number(),
          headers: z.record(z.string()),
          body: z.string(),
        }).describe('Normal response without payload'),
        testResponse: z.object({
          status: z.number(),
          headers: z.record(z.string()),
          body: z.string(),
        }).describe('Response after payload injection'),
      }),
      execute: async (params) => {
        try {
          // Generate payload
          const payloadPrompt = `Generate an optimized ${params.vulnerabilityType} payload for testing.

Target: ${params.context.url}
Parameter: ${params.context.parameter}
Location: ${params.context.parameterLocation}
Method: ${params.context.method}
Technologies: ${params.context.technologies?.join(', ') || 'Unknown'}

${params.context.previousAttempts && params.context.previousAttempts.length > 0 ? `
Previous attempts:
${params.context.previousAttempts.map((a, i) => 
  `${i + 1}. Payload: ${a.payload}
   Result: ${a.result}
   ${a.response ? `Response snippet: ${a.response.substring(0, 200)}` : ''}`
).join('\n\n')}

Learn from previous attempts and try a different approach.
` : ''}

Generate a payload that:
1. Is appropriate for ${params.context.parameterLocation} injection
2. Bypasses common filters if previous attempts were blocked
3. Has clear indicators of success`

          const payloadResult = await llm.generateObject({
            prompt: payloadPrompt,
            schema: z.object({
              payload: z.string(),
              reasoning: z.string(),
              technique: z.string(),
              expectedIndicators: z.array(z.string()),
              confidence: z.number().min(0).max(1),
            }),
          })

          // Analyze response
          const analysisPrompt = `Analyze if the ${params.vulnerabilityType} payload was successful.

Payload sent: ${payloadResult.object.payload}
Expected indicators: ${payloadResult.object.expectedIndicators.join(', ')}

Baseline response (normal):
Status: ${params.baselineResponse.status}
Headers: ${JSON.stringify(params.baselineResponse.headers, null, 2)}
Body (first 2000 chars): ${params.baselineResponse.body.substring(0, 2000)}

Test response (with payload):
Status: ${params.testResponse.status}
Headers: ${JSON.stringify(params.testResponse.headers, null, 2)}
Body (first 2000 chars): ${params.testResponse.body.substring(0, 2000)}

Analyze:
1. Is the payload reflected or executed?
2. Are there error messages indicating vulnerability?
3. Has the response changed significantly?
4. Are there signs of filtering or blocking?
5. Is this conclusive evidence of vulnerability?`

          const analysisResult = await llm.generateObject({
            prompt: analysisPrompt,
            schema: z.object({
              isVulnerable: z.boolean(),
              confidence: z.number().min(0).max(1),
              evidence: z.array(z.object({
                type: z.string(),
                description: z.string(),
                location: z.string(),
              })),
              result: z.enum(['success', 'blocked', 'filtered', 'partial', 'inconclusive']),
              nextSteps: z.array(z.string()),
              remediation: z.string().optional(),
            }),
          })

          return {
            success: true,
            payload: payloadResult.object,
            analysis: analysisResult.object,
            recommendation: analysisResult.object.isVulnerable 
              ? 'Vulnerability confirmed - report finding'
              : analysisResult.object.result === 'inconclusive'
              ? 'Try additional payloads for confirmation'
              : 'Continue testing other parameters',
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Payload test failed',
          }
        }
      },
    }),
  }
}