import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createVulnAgent } from '../src/agent.js'
import type { LLMProvider } from '../src/types.js'

const createTestServer = (): Promise<{ server: Server; url: string }> => {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html')

      if (req.url === '/') {
        res.end('<html><body><a href="/search">Search</a></body></html>')
      } else if (req.url?.startsWith('/search')) {
        const input =
          new URL(req.url, 'http://localhost').searchParams.get('q') || ''
        res.end(`<html><body>You searched for: ${input}</body></html>`)
      } else {
        res.statusCode = 404
        res.end('Not found')
      }
    })

    server.listen(0, () => {
      const address = server.address()
      const port = typeof address === 'object' ? address?.port : 0
      resolve({ server, url: `http://localhost:${port}` })
    })
  })
}

const createSimpleMockProvider = (): LLMProvider => {
  const mockModel = {
    specificationVersion: 'v1',
    provider: 'mock',
    modelId: 'mock-model',
    doStream: vi.fn(),
    doGenerate: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: Mock type for testing
  } as any

  return {
    name: 'Mock',
    model: mockModel,
    generateObject: async ({ prompt }) => {
      if (prompt.includes('Choose the most appropriate tool')) {
        return {
          object: {
            tool: 'httpRequest',
            parameters: { url: 'http://localhost:3000', method: 'GET' },
            reasoning: 'Initial scan',
          },
        }
      }
      return { object: {} }
    },
  }
}

describe('integration', () => {
  let server: Server
  let serverUrl: string

  beforeAll(async () => {
    const result = await createTestServer()
    server = result.server
    serverUrl = result.url
  })

  afterAll(() => {
    server?.close()
  })

  it('scans test server', async () => {
    const agent = createVulnAgent({
      llmProvider: createSimpleMockProvider(),
      whitelist: [],
      maxSteps: 1,
    })

    const result = await agent.scan(serverUrl)

    expect(result.targetUrl).toBe(serverUrl)
    expect(result.stepsExecuted).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeUndefined()
  })

  it('respects whitelist', async () => {
    const agent = createVulnAgent({
      llmProvider: createSimpleMockProvider(),
      whitelist: ['example.com'],
      maxSteps: 1,
    })

    const result = await agent.scan(serverUrl)

    expect(result.targetUrl).toBe(serverUrl)
    expect(result.findings).toEqual([])
  })
})
