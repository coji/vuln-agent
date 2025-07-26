import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createVulnerableApp } from '../fixtures/vulnerable-app.js'
import { createMockLLMProvider } from '../fixtures/mock-llm-provider.js'
import { createWebVulnerabilityScanner } from '../../src/scanners/web-scanner.js'
import { createHttpClient } from '../../src/infrastructure/http/client.js'
import type { VulnerableApp } from '../fixtures/vulnerable-app.js'

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
      whitelist: []
    })
  })
  
  afterAll(async () => {
    await app.stop()
  })
  
  describe('XSS Detection', () => {
    it('should detect reflected XSS vulnerability', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createMockLLMProvider() }
      })
      
      const result = await scanner.scan(`${app.url}/xss/reflected?input=test`)
      
      // Should find XSS vulnerability
      const xssVulns = result.vulnerabilities.filter(v => v.type === 'XSS')
      expect(xssVulns).toHaveLength(1)
      expect(xssVulns[0].severity).toBe('high')
      expect(xssVulns[0].message).toContain('XSS vulnerability')
      expect(xssVulns[0].code).toBe('<script>alert("XSS")</script>')
    })
    
    it('should detect XSS with filter bypass', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createMockLLMProvider({ verbose: false }) }
      })
      
      const result = await scanner.scan(`${app.url}/xss/filtered?input=test`)
      
      // The mock should try script tag first, detect filter, then try img tag
      const xssVulns = result.vulnerabilities.filter(v => v.type === 'XSS')
      expect(xssVulns).toHaveLength(1)
      expect(xssVulns[0].code).toBe('<img src=x onerror=alert("XSS")>')
    })
    
    it('should not detect XSS on safe endpoint', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createMockLLMProvider() }
      })
      
      const result = await scanner.scan(`${app.url}/safe/search?input=test`)
      
      // Should only find configuration issues, no XSS
      const xssVulns = result.vulnerabilities.filter(v => v.type === 'XSS')
      expect(xssVulns).toHaveLength(0)
    })
  })
  
  describe('SQL Injection Detection', () => {
    it('should detect error-based SQL injection', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createMockLLMProvider() }
      })
      
      const result = await scanner.scan(`${app.url}/sqli/error?id=1`)
      
      // Should find SQLi vulnerability
      const sqliVulns = result.vulnerabilities.filter(v => v.type === 'SQLi')
      expect(sqliVulns).toHaveLength(1)
      expect(sqliVulns[0].severity).toBe('critical')
      expect(sqliVulns[0].message).toContain('SQL injection vulnerability')
    })
    
    it('should detect blind SQL injection', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createMockLLMProvider() }
      })
      
      const result = await scanner.scan(`${app.url}/sqli/blind?username=admin`)
      
      // Should find SQLi vulnerability
      const sqliVulns = result.vulnerabilities.filter(v => v.type === 'SQLi')
      expect(sqliVulns).toHaveLength(1)
      expect(sqliVulns[0].severity).toBe('critical')
    })
  })
  
  describe('Security Headers', () => {
    it('should detect missing security headers', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createMockLLMProvider() }
      })
      
      const result = await scanner.scan(`${app.url}/`)
      
      // Should find configuration vulnerabilities
      const configVulns = result.vulnerabilities.filter(v => v.type === 'Configuration')
      expect(configVulns.length).toBeGreaterThan(0)
      
      // Check for specific headers
      const headerMessages = configVulns.map(v => v.message)
      expect(headerMessages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('X-Frame-Options'),
          expect.stringContaining('Content-Security-Policy')
        ])
      )
    })
  })
  
  describe('Performance', () => {
    it('should complete scan within reasonable time', async () => {
      const scanner = createWebVulnerabilityScanner({
        httpClient,
        llm: { provider: createMockLLMProvider() }
      })
      
      const startTime = Date.now()
      await scanner.scan(`${app.url}/xss/reflected?input=test`)
      const duration = Date.now() - startTime
      
      // Should complete within 1 second for local testing
      expect(duration).toBeLessThan(1000)
    })
  })
})