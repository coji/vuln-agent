import { describe, expect, it, vi } from 'vitest'
import { createMockLLMProvider } from '../../test/fixtures/mock-llm-provider.js'
import type { HttpClient } from './web-scanner.js'
import { createWebVulnerabilityScanner } from './web-scanner.js'

describe('WebVulnerabilityScanner', () => {
  it('should run AI agent scan when LLM is configured', async () => {
    const mockHttpClient: HttpClient = {
      request: vi.fn(),
    }

    const scanner = createWebVulnerabilityScanner({
      httpClient: mockHttpClient,
      llm: { provider: createMockLLMProvider() },
    })

    const result = await scanner.scan('https://example.com')

    // Should have run the AI agent
    expect(result.metadata?.agentSteps).toBeDefined()
    expect(result.metadata?.agentSteps).toBeGreaterThan(0)
    expect(result.vulnerabilities.length).toBeGreaterThan(0)
  })

  it('should return empty results when no LLM provider is configured', async () => {
    const mockHttpClient: HttpClient = {
      request: vi.fn(),
    }

    const scanner = createWebVulnerabilityScanner({
      httpClient: mockHttpClient,
    })

    const result = await scanner.scan('https://example.com')

    expect(result.vulnerabilities).toHaveLength(0)
    expect(result.metadata?.error).toBe('No LLM provider configured')
  })
})
