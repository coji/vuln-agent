import { describe, it, expect, vi } from 'vitest'
import { createWebVulnerabilityScanner } from './web-scanner.js'
import type { HttpClient, HttpResponse } from './web-scanner.js'

describe('WebVulnerabilityScanner', () => {
  it('should detect missing security headers', async () => {
    // Mock HTTP client
    const mockResponse: HttpResponse = {
      status: 200,
      headers: {
        'content-type': 'text/html'
        // Missing security headers
      },
      body: '<html><body>Test</body></html>',
      url: 'https://example.com'
    }
    
    const mockHttpClient: HttpClient = {
      request: vi.fn().mockResolvedValue(mockResponse)
    }
    
    const scanner = createWebVulnerabilityScanner({
      httpClient: mockHttpClient
    })
    
    const result = await scanner.scan('https://example.com')
    
    expect(mockHttpClient.request).toHaveBeenCalledWith({
      url: 'https://example.com',
      method: 'GET'
    })
    
    expect(result.vulnerabilities).toHaveLength(2)
    expect(result.vulnerabilities[0].message).toBe('Missing X-Frame-Options header')
    expect(result.vulnerabilities[1].message).toBe('Missing Content-Security-Policy header')
  })
  
  it('should not report vulnerabilities when security headers are present', async () => {
    const mockResponse: HttpResponse = {
      status: 200,
      headers: {
        'content-type': 'text/html',
        'x-frame-options': 'DENY',
        'content-security-policy': "default-src 'self'"
      },
      body: '<html><body>Test</body></html>',
      url: 'https://example.com'
    }
    
    const mockHttpClient: HttpClient = {
      request: vi.fn().mockResolvedValue(mockResponse)
    }
    
    const scanner = createWebVulnerabilityScanner({
      httpClient: mockHttpClient
    })
    
    const result = await scanner.scan('https://example.com')
    
    expect(result.vulnerabilities).toHaveLength(0)
  })
})