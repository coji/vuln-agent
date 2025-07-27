import { tool } from 'ai'
import { z } from 'zod'
import { createHttpClient } from '../http-client.js'
import type { VulnAgentTool } from '../types.js'
import { debug } from '../utils.js'

export const createHttpRequestTool = (config: {
  whitelist: string[]
  rateLimit?: { maxRequests: number; windowMs: number }
  timeout?: number
}): VulnAgentTool => {
  const httpClient = createHttpClient({
    whitelist: config.whitelist,
    rateLimit: config.rateLimit || { maxRequests: 60, windowMs: 60000 },
    timeout: config.timeout || 10000,
    retries: 3,
  })

  return {
    name: 'httpRequest',
    tool: tool({
      description:
        'Send HTTP request to target URL with rate limiting and whitelist protection',
      parameters: z.object({
        url: z
          .string()
          .describe(
            'The full URL to send the HTTP request to (e.g., https://example.com/api/endpoint)',
          ),
        method: z
          .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
          .default('GET')
          .describe('HTTP method to use'),
        headers: z
          .record(z.string())
          .optional()
          .describe('HTTP headers to include'),
        body: z
          .string()
          .optional()
          .describe('Request body for POST/PUT/PATCH methods'),
      }),
      execute: async (params) => {
        debug.vulnerability(
          'httpRequest tool: %s %s',
          params.method || 'GET',
          params.url,
        )
        if (params.headers) {
          debug.vulnerability('Request headers: %O', params.headers)
        }
        if (params.body) {
          debug.vulnerability('Request body: %s', params.body.substring(0, 200))
        }

        try {
          const response = await httpClient.request({
            url: params.url,
            method: params.method,
            headers: params.headers,
            body: params.body,
          })

          debug.vulnerability(
            'httpRequest response: %d %s',
            response.status,
            response.url,
          )

          return {
            success: true,
            response: {
              status: response.status,
              headers: response.headers,
              body: response.body,
              url: response.url,
            },
          }
        } catch (error) {
          debug.vulnerability(
            'httpRequest error: %s',
            error instanceof Error ? error.message : 'Unknown error',
          )
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          }
        }
      },
    }),
  }
}
