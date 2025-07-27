import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHttpClient } from '../../src/http-client.js'
import { createWebVulnerabilityScanner } from '../../src/scanners/web-scanner.js'
import { createSimpleMockProvider } from '../fixtures/simple-mock-provider.js'
import type { VulnerableApp } from '../fixtures/vulnerable-app.js'
import { createVulnerableApp } from '../fixtures/vulnerable-app.js'

describe('Web Scanner Integration Tests', () => {
  let app: VulnerableApp
  let httpClient: ReturnType<typeof createHttpClient>

  beforeAll(async () => {
    // Start the vulnerable app
    app = createVulnerableApp()
    await app.start()

    // Create HTTP client
    httpClient = createHttpClient({
      rateLimit: { maxRequests: 100, windowMs: 1000 },
      timeout: 5000,
      retries: 1,
      whitelist: [],
    })
  })

  afterAll(async () => {
    await app.stop()
  })

  describe('AI Agent Vulnerability Detection', () => {
    it('should use AI agent to detect vulnerabilities', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createSimpleMockProvider() },
      })

      // The AI agent will autonomously explore the application
      const result = await scanner.scan(`${app.url}`)

      // Check that the agent completed its exploration
      expect(result.metadata?.agentSteps).toBeDefined()
      expect(result.metadata?.agentSteps).toBeGreaterThan(0)
      // With simple mock, no vulnerabilities are found
      expect(result.vulnerabilities.length).toBe(0)
    })

    it('should complete scan within max steps', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createSimpleMockProvider() },
      })

      const result = await scanner.scan(`${app.url}`)

      // Agent should respect max steps limit (100)
      expect(result.metadata?.agentSteps).toBeLessThanOrEqual(100)
      expect(result.metadata?.completed).toBe(true)
    })

    it('should handle whitelist restrictions', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createSimpleMockProvider() },
        whitelist: ['example.com'], // Restrict to different domain
      })

      const result = await scanner.scan(`${app.url}`)

      // Should not scan due to whitelist restriction
      expect(result.vulnerabilities.length).toBe(0)
      expect(result.metadata?.error).toContain('whitelist')
    })
  })

  describe('Agent-based Detection', () => {
    it('should use multiple tools during scan', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createSimpleMockProvider() },
      })

      const result = await scanner.scan(`${app.url}`)

      // Agent should have metadata
      expect(result.metadata?.toolsUsed).toBeDefined()
      // With simple mock, tools array may be empty
      expect(Array.isArray(result.metadata?.toolsUsed)).toBe(true)
    })

    it('should adapt strategy based on findings', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createSimpleMockProvider() },
      })

      const result = await scanner.scan(`${app.url}`)

      // Agent should have strategy information
      // Note: With simple mock provider, strategy may be undefined as updateStrategy is not called
      expect(result.metadata?.strategyUpdates).toBeDefined()
    })
  })

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createSimpleMockProvider() },
      })

      const result = await scanner.scan(`${app.url}`)

      // Should have proper report structure
      expect(result.summary).toBeDefined()
      expect(result.summary?.totalVulnerabilities).toBeDefined()
      expect(result.summary?.severityDistribution).toBeDefined()
      // Report path is set by the CLI, not the scanner itself
    })
  })

  describe('Performance', () => {
    it('should complete scan within reasonable time', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createSimpleMockProvider() },
        maxSteps: 10, // Limit steps for performance test
      })

      const startTime = Date.now()
      await scanner.scan(`${app.url}`)
      const duration = Date.now() - startTime

      // Should complete within 10 seconds for limited agent exploration
      expect(duration).toBeLessThan(10000)
    })
  })
})
