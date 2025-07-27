import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpClient } from '../src/http-client.js'

global.fetch = vi.fn()

describe('http-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('makes request with headers', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: vi.fn().mockResolvedValue('<html></html>'),
      url: 'https://example.com',
    } as unknown as Response)

    const client = createHttpClient({
      timeout: 5000,
      whitelist: ['example.com'],
    })

    const result = await client.request({
      url: 'https://example.com',
      method: 'GET',
    })

    expect(result.status).toBe(200)
    expect(result.body).toBe('<html></html>')
  })

  it('enforces whitelist', async () => {
    const client = createHttpClient({
      timeout: 5000,
      whitelist: ['allowed.com'],
    })

    await expect(
      client.request({ url: 'https://notallowed.com' }),
    ).rejects.toThrow('URL not whitelisted')
  })

  it('allows localhost', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue('ok'),
      url: 'http://localhost:3000',
    } as unknown as Response)

    const client = createHttpClient({
      timeout: 5000,
      whitelist: [],
    })

    const result = await client.request({ url: 'http://localhost:3000' })
    expect(result.status).toBe(200)
  })
})
