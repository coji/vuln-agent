import { z } from 'zod'
import type {
  LLMVulnerabilityTester,
  PayloadGenerationResult,
  VulnerabilityAnalysisResult,
  VulnerabilityTestContext,
  VulnerabilityTestResult,
} from './types.js'

export interface LLMProvider {
  generateObject: <T>(params: {
    prompt: string
    schema: z.ZodSchema<T>
  }) => Promise<{ object: T }>
}

export const createLLMVulnerabilityTester = (
  llm: LLMProvider,
): LLMVulnerabilityTester => {
  const generatePayload = async (
    context: VulnerabilityTestContext,
    vulnerabilityType: string,
  ): Promise<PayloadGenerationResult> => {
    const prompt = `You are a security researcher testing for ${vulnerabilityType} vulnerabilities.

Target context:
- URL: ${context.url}
- Parameter: ${context.parameter}
- Parameter location: ${context.parameterLocation}
- HTTP Method: ${context.method}
- Detected technologies: ${context.detectedTechnologies?.join(', ') || 'Unknown'}

${
  context.previousAttempts && context.previousAttempts.length > 0
    ? `
Previous attempts:
${context.previousAttempts
  .map(
    (a, i) =>
      `${i + 1}. Payload: ${a.payload}
   Result: ${a.result}
   ${a.result === 'blocked' ? 'Likely filtered or blocked by WAF' : ''}
   ${a.result === 'reflected' ? 'Payload was reflected in response' : ''}
   ${a.result === 'no_change' ? 'No visible change in response' : ''}`,
  )
  .join('\n\n')}

Based on previous failures, adjust your approach:
- If blocked: Try encoding, obfuscation, or alternative vectors
- If no change: Try different injection points or techniques
- Learn from what worked or failed
`
    : ''
}

Generate an optimized ${vulnerabilityType} payload that:
1. Is appropriate for the parameter location (${context.parameterLocation})
2. Uses techniques likely to succeed based on the context
3. Bypasses common filters if previous attempts were blocked
4. Is minimal and unlikely to break application functionality
5. Can be detected reliably if successful

Consider these techniques for ${vulnerabilityType}:
- For XSS: Different contexts (HTML, JS, CSS), event handlers, encoding tricks
- For SQLi: Different SQL dialects, comment styles, boolean/time-based
- Use polyglots if unsure about the context

Provide:
1. The payload (raw, without encoding - we'll handle that)
2. Your reasoning for this specific payload
3. The technique name (e.g., "img-onerror", "script-tag", "event-handler")
4. Confidence level (0-1) that this will work`

    const schema = z.object({
      payload: z.string().describe('The vulnerability test payload'),
      reasoning: z
        .string()
        .describe('Explanation of why this payload was chosen'),
      technique: z.string().describe('Name of the technique being used'),
      confidence: z.number().min(0).max(1).describe('Confidence level'),
    })

    const { object } = await llm.generateObject({
      prompt,
      schema,
    })

    return object
  }

  const analyzeResponse = async (
    context: VulnerabilityTestContext,
    testResult: VulnerabilityTestResult,
  ): Promise<VulnerabilityAnalysisResult> => {
    const prompt = `Analyze if this response indicates a successful ${testResult.vulnerabilityType || 'XSS'} vulnerability.

Test details:
- Payload sent: ${testResult.payload}
- Injection location: ${context.parameterLocation}
- Technique used: ${testResult.technique}
- Expected behavior: ${testResult.reasoning}

Original response (baseline):
Status: ${context.baselineResponse.status}
Headers: ${JSON.stringify(context.baselineResponse.headers, null, 2)}
Body preview: ${context.baselineResponse.body.substring(0, 500)}

Response after payload injection:
Status: ${testResult.response.status}
Headers: ${JSON.stringify(testResult.response.headers, null, 2)}
Body: ${testResult.response.body.substring(0, 2000)}

Analyze for:
1. Direct reflection of the payload (even if encoded/filtered)
2. Execution indicators:
   - For XSS: Script execution, event handler triggering
   - For SQLi: Error messages, different response structure, timing differences
3. Security filter responses (WAF blocks, error pages)
4. Application behavior changes

Look specifically for:
- Exact or partial payload reflection
- HTML/JS syntax errors that might indicate injection
- Changes in response structure or content
- Error messages revealing backend information
- Timing differences (for blind attacks)

Determine:
1. Is this definitely vulnerable? Consider false positives carefully
2. What evidence supports the vulnerability?
3. If blocked, what type of filter/protection?
4. Severity based on exploitability and impact
5. What payload might work better next?`

    const schema = z.object({
      isVulnerable: z
        .boolean()
        .describe('Whether the vulnerability is confirmed'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence in the assessment'),
      evidence: z
        .array(
          z.object({
            type: z.string().describe('Type of evidence found'),
            description: z.string().describe('Description of the evidence'),
            location: z.string().optional().describe('Where in the response'),
          }),
        )
        .describe('Evidence supporting the conclusion'),
      severity: z
        .enum(['low', 'medium', 'high', 'critical'])
        .describe('Vulnerability severity'),
      remediation: z
        .string()
        .describe('Recommended fix for this vulnerability'),
      suggestedNextPayload: z
        .string()
        .optional()
        .describe('Next payload to try if not conclusive'),
      filterDetected: z
        .object({
          type: z.string().describe('Type of filter detected'),
          bypass: z.string().describe('Suggested bypass technique'),
        })
        .optional()
        .describe('Details if a security filter was detected'),
    })

    const { object } = await llm.generateObject({
      prompt,
      schema,
    })

    return object
  }

  return {
    generatePayload,
    analyzeResponse,
  }
}
