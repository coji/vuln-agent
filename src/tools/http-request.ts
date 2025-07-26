import { tool } from 'ai'
import { z } from 'zod'
import { createHttpClient } from '../infrastructure/http/client.js'
import type { VulnAgentTool } from './types.js'

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
        url: z.string().url().describe('The URL to send the request to'),
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
        try {
          const response = await httpClient.request({
            url: params.url,
            method: params.method,
            headers: params.headers,
            body: params.body,
          })

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
