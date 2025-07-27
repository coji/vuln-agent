import { tool } from 'ai'
import { z } from 'zod'
import type { LLMProvider, VulnAgentTool } from '../types.js'

export const createExtractLinksTool = (llm: LLMProvider): VulnAgentTool => {
  return {
    name: 'extractLinks',
    tool: tool({
      description:
        'Extract links, endpoints, and forms from HTML/JavaScript content using LLM',
      parameters: z.object({
        content: z.string().describe('HTML or JavaScript content to analyze'),
        baseUrl: z
          .string()
          .describe(
            'Base URL for resolving relative links (e.g., https://example.com)',
          ),
        contentType: z
          .enum(['html', 'javascript', 'json', 'unknown'])
          .default('unknown')
          .describe('Type of content being analyzed'),
      }),
      execute: async (params) => {
        try {
          const prompt = `Extract all links, API endpoints, and forms from this ${params.contentType} content:

Base URL: ${params.baseUrl}
Content (first 10000 chars):
${params.content.substring(0, 10000)}

Please extract:
1. All HTML links (<a href>, <link>, <script src>, <img src>, etc.)
2. JavaScript API calls (fetch, XMLHttpRequest, axios, etc.)
3. Form actions and their parameters
4. Potential API endpoints mentioned in JavaScript code
5. WebSocket connections
6. AJAX endpoints
7. Any hardcoded URLs or paths

For each item, provide:
- The full URL (resolve relative paths using the base URL)
- The type of link/endpoint
- HTTP method if applicable
- Parameters if identifiable
- Whether it appears to be an internal or external resource`

          const result = await llm.generateObject({
            prompt,
            schema: z.object({
              links: z.array(
                z.object({
                  url: z.string(),
                  type: z.enum([
                    'link',
                    'script',
                    'stylesheet',
                    'image',
                    'api',
                    'form',
                    'websocket',
                    'other',
                  ]),
                  method: z.string().optional(),
                  parameters: z.array(z.string()).optional(),
                  isInternal: z.boolean(),
                  source: z.string().describe('Where this was found'),
                }),
              ),
              forms: z.array(
                z.object({
                  action: z.string(),
                  method: z.string(),
                  fields: z.array(
                    z.object({
                      name: z.string(),
                      type: z.string(),
                      required: z.boolean().optional(),
                    }),
                  ),
                }),
              ),
              apiPatterns: z.array(
                z.object({
                  pattern: z.string(),
                  description: z.string(),
                  exampleEndpoint: z.string().optional(),
                }),
              ),
              technologies: z
                .array(z.string())
                .describe('Detected technologies/frameworks'),
            }),
          })

          return {
            success: true,
            links: result.object.links,
            forms: result.object.forms,
            apiPatterns: result.object.apiPatterns,
            technologies: result.object.technologies,
            stats: {
              totalLinks: result.object.links.length,
              internalLinks: result.object.links.filter((l) => l.isInternal)
                .length,
              forms: result.object.forms.length,
              apiEndpoints: result.object.links.filter((l) => l.type === 'api')
                .length,
            },
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Extraction failed',
          }
        }
      },
    }),
  }
}
