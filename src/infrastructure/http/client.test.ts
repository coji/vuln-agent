import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpClient } from './client.js'

// Mock fetch
global.fetch = vi.fn()

describe('HttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should make HTTP request with proper headers', async () => {
    const mockResponse = {
      status: 200,
      headers: new Headers({
        'content-type': 'text/html',
      }),
      text: vi.fn().mockResolvedValue('<html></html>'),
      url: 'https://example.com',
    }

    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse as unknown as Response,
    )

    const client = createHttpClient({
      rateLimit: { maxRequests: 10, windowMs: 1000 },
      timeout: 5000,
      retries: 1,
      whitelist: ['example.com'],
    })

    const result = await client.request({
      url: 'https://example.com',
      method: 'GET',
    })

    expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
      headers: {
        'User-Agent': 'VulnAgent/1.0',
      },
      body: undefined,
      signal: expect.any(AbortSignal),
    })

    expect(result).toEqual({
      status: 200,
      headers: {
        'content-type': 'text/html',
      },
      body: '<html></html>',
      url: 'https://example.com',
    })
  })

  it('should enforce whitelist', async () => {
    const client = createHttpClient({
      rateLimit: { maxRequests: 10, windowMs: 1000 },
      timeout: 5000,
      retries: 1,
      whitelist: ['allowed.com'],
    })

    await expect(
      client.request({
        url: 'https://notallowed.com',
      }),
    ).rejects.toThrow('URL not whitelisted')
  })

  it('should always allow localhost', async () => {
    const mockResponse = {
      status: 200,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
      url: 'http://localhost:5173',
    }

    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse as unknown as Response,
    )

    const client = createHttpClient({
      rateLimit: { maxRequests: 10, windowMs: 1000 },
      timeout: 5000,
      retries: 1,
      whitelist: [], // Empty whitelist
    })

    // Should not throw even with empty whitelist
    await expect(
      client.request({
        url: 'http://localhost:5173',
      }),
    ).resolves.toBeTruthy()

    await expect(
      client.request({
        url: 'http://127.0.0.1:3000',
      }),
    ).resolves.toBeTruthy()
  })

  it('should support wildcard whitelist', async () => {
    const mockResponse = {
      status: 200,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
      url: 'https://sub.example.com',
    }

    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse as unknown as Response,
    )

    const client = createHttpClient({
      rateLimit: { maxRequests: 10, windowMs: 1000 },
      timeout: 5000,
      retries: 1,
      whitelist: ['*.example.com'],
    })

    await expect(
      client.request({
        url: 'https://sub.example.com',
      }),
    ).resolves.toBeTruthy()
  })
})
