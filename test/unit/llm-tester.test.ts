import { describe, expect, it } from 'vitest'
import { createLLMVulnerabilityTester } from '../../src/scanners/vulnerabilities/llm-tester.js'
import { createMockLLMProvider } from '../fixtures/mock-llm-provider.js'

describe('LLM Vulnerability Tester', () => {
  describe('generatePayload', () => {
    it('should generate XSS payload', async () => {
      const tester = createLLMVulnerabilityTester(createMockLLMProvider())

      const result = await tester.generatePayload(
        {
          url: 'http://example.com/search?q=test',
          parameter: 'q',
          parameterLocation: 'query',
          method: 'GET',
          baselineResponse: {
            status: 200,
            headers: {},
            body: '<p>You searched for: test</p>',
          },
        },
        'XSS',
      )

      expect(result.payload).toBe('<script>alert("XSS")</script>')
      expect(result.technique).toBe('script-tag-injection')
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('should generate SQLi payload', async () => {
      const tester = createLLMVulnerabilityTester(createMockLLMProvider())

      const result = await tester.generatePayload(
        {
          url: 'http://example.com/user?id=1',
          parameter: 'id',
          parameterLocation: 'query',
          method: 'GET',
          baselineResponse: {
            status: 200,
            headers: {},
            body: '<p>User ID: 1</p>',
          },
        },
        'SQLi',
      )

      expect(result.payload).toContain("'")
      expect(result.technique).toBe('union-based')
      expect(result.confidence).toBeGreaterThan(0.8)
    })
  })

  describe('analyzeResponse', () => {
    it('should detect XSS vulnerability', async () => {
      const tester = createLLMVulnerabilityTester(createMockLLMProvider())

      const result = await tester.analyzeResponse(
        {
          url: 'http://example.com/search?q=test',
          parameter: 'q',
          parameterLocation: 'query',
          method: 'GET',
          baselineResponse: {
            status: 200,
            headers: {},
            body: '<p>You searched for: test</p>',
          },
        },
        {
          payload: '<script>alert("XSS")</script>',
          technique: 'script-tag-injection',
          response: {
            status: 200,
            headers: {},
            body: '<p>You searched for: <script>alert("XSS")</script></p>',
          },
          reasoning: 'Test for reflected XSS',
          vulnerabilityType: 'XSS',
        },
      )

      expect(result.isVulnerable).toBe(true)
      expect(result.severity).toBe('high')
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.evidence).toHaveLength(1)
      expect(result.evidence[0].type).toBe('reflected-payload')
    })

    it('should detect SQL injection vulnerability', async () => {
      const tester = createLLMVulnerabilityTester(createMockLLMProvider())

      const result = await tester.analyzeResponse(
        {
          url: 'http://example.com/user?id=1',
          parameter: 'id',
          parameterLocation: 'query',
          method: 'GET',
          baselineResponse: {
            status: 200,
            headers: {},
            body: '<p>User ID: 1</p>',
          },
        },
        {
          payload: "' OR '1'='1",
          technique: 'boolean-based-blind',
          response: {
            status: 500,
            headers: {},
            body: '<p>Error: You have an error in your SQL syntax</p>',
          },
          reasoning: 'Test for SQL injection',
          vulnerabilityType: 'SQLi',
        },
      )

      expect(result.isVulnerable).toBe(true)
      expect(result.severity).toBe('critical')
      expect(result.confidence).toBeGreaterThan(0.8)
    })
  })
})
