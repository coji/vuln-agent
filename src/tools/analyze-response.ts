import { tool } from 'ai'
import { z } from 'zod'
import type { LLMProvider, VulnAgentTool } from '../types.js'
import { debug } from '../utils.js'

const vulnerabilitySchema = z.object({
  type: z.enum(['XSS', 'SQLi', 'Authentication', 'Configuration', 'Other']),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  confidence: z.number().min(0).max(1),
  evidence: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      location: z.string(),
    }),
  ),
  description: z.string(),
  remediation: z.string(),
})

export const createAnalyzeResponseTool = (llm: LLMProvider): VulnAgentTool => {
  return {
    name: 'analyzeResponse',
    tool: tool({
      description:
        'Analyze HTTP response for security vulnerabilities using LLM',
      parameters: z.object({
        response: z
          .object({
            status: z
              .number()
              .describe('HTTP status code (e.g., 200, 404, 500)'),
            headers: z
              .record(z.string())
              .describe('HTTP response headers as key-value pairs'),
            body: z.string().describe('The full response body content'),
            url: z.string().describe('The URL that was requested'),
          })
          .describe('The HTTP response to analyze'),
        context: z
          .object({
            request: z
              .object({
                method: z
                  .string()
                  .describe('HTTP method used (GET, POST, etc.)'),
                url: z.string().describe('The URL that was requested'),
                headers: z
                  .record(z.string())
                  .optional()
                  .describe('Request headers sent'),
                body: z
                  .string()
                  .optional()
                  .describe('Request body if applicable'),
              })
              .optional(),
            previousFindings: z
              .array(z.string())
              .optional()
              .describe('List of previously found vulnerabilities'),
            targetInfo: z
              .any()
              .optional()
              .describe('Additional information about the target application'),
          })
          .optional()
          .describe('Additional context for analysis'),
      }),
      execute: async (params) => {
        debug.vulnerability(
          'analyzeResponse: Analyzing %s response (status: %d, body: %d chars)',
          params.response.url,
          params.response.status,
          params.response.body.length,
        )
        debug.vulnerability(
          'Previous findings: %d',
          params.context?.previousFindings?.length || 0,
        )

        try {
          const prompt = `Analyze this HTTP response for security vulnerabilities:

URL: ${params.response.url}
Status: ${params.response.status}
Headers: ${JSON.stringify(params.response.headers, null, 2)}
Body (first 5000 chars): ${params.response.body.substring(0, 5000)}

${
  params.context?.request
    ? `
Request details:
Method: ${params.context.request.method}
URL: ${params.context.request.url}
Headers: ${JSON.stringify(params.context.request.headers || {}, null, 2)}
Body: ${params.context.request.body || 'None'}
`
    : ''
}

${
  params.context?.previousFindings
    ? `
Previous findings in this scan:
${params.context.previousFindings.join('\n')}
`
    : ''
}

Analyze for:
1. Missing security headers (X-Frame-Options, CSP, etc.)
2. Information disclosure (debug info, stack traces, versions)
3. Authentication/session issues
4. Potential injection points
5. CORS misconfigurations
6. Any other security concerns

Only report actual vulnerabilities with concrete evidence.`

          const result = await llm.generateObject({
            prompt,
            schema: z.object({
              vulnerabilities: z.array(vulnerabilitySchema),
              securityHeaders: z.object({
                missing: z.array(z.string()),
                misconfigured: z.array(
                  z.object({
                    header: z.string(),
                    issue: z.string(),
                  }),
                ),
              }),
              suspiciousPatterns: z.array(z.string()),
            }),
          })

          return {
            success: true,
            vulnerabilities: result.object.vulnerabilities,
            securityHeaders: result.object.securityHeaders,
            suspiciousPatterns: result.object.suspiciousPatterns,
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
          }
        }
      },
    }),
  }
}
