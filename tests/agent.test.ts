import { describe, expect, it, vi } from 'vitest'
import { createVulnAgent } from '../src/agent.js'
import type { LLMProvider } from '../src/types.js'

const createMockLLMProvider = (): LLMProvider => {
  let callCount = 0

  // Create a mock model that implements the required specification
  const mockModel = {
    specificationVersion: 'v1' as const,
    provider: 'mock',
    modelId: 'mock-model',
    doStream: vi.fn(),
    doGenerate: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: Mock type for testing
  } as any

  return {
    name: 'Mock Provider',
    model: mockModel,
    generateObject: vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          object: {
            tool: 'httpRequest',
            parameters: { url: 'http://example.com', method: 'GET' },
            reasoning: 'Initial scan',
          },
        }
      }
      // After first call, signal completion
      return {
        object: {
          tool: 'updateStrategy',
          parameters: {
            sessionId: 'test-session',
            currentState: {
              completedSteps: 1,
              remainingSteps: 0,
              findings: [],
              testedEndpoints: [],
              discoveredEndpoints: [],
            },
          },
          reasoning: 'Scan complete',
        },
      }
    }),
  }
}

describe('agent', () => {
  it('creates agent with config', () => {
    const agent = createVulnAgent({
      llmProvider: createMockLLMProvider(),
      whitelist: ['example.com'],
      maxSteps: 50,
    })

    expect(agent.scan).toBeDefined()
  })

  it('scans url and returns result', async () => {
    const mockProvider = createMockLLMProvider()
    const agent = createVulnAgent({
      llmProvider: mockProvider,
      whitelist: ['example.com'],
      maxSteps: 1,
    })

    const result = await agent.scan('http://example.com')

    expect(result.targetUrl).toBe('http://example.com')
    expect(result.stepsExecuted).toBeGreaterThanOrEqual(0)
    expect(result.findings).toEqual([])
  })
})
