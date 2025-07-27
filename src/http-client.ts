import type { HttpResponse } from './types.js'
import { debug } from './utils.js'

export interface HttpClient {
  request: (options: RequestOptions) => Promise<HttpResponse>
}

export interface RequestOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface HttpClientConfig {
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
  timeout: number
  retries?: number
  whitelist: string[]
}

// Rate limiter factory
const createRateLimiter = (config: {
  maxRequests: number
  windowMs: number
}) => {
  let requests = 0
  let windowStart = Date.now()

  const throttle = async () => {
    const now = Date.now()

    // Reset window if needed
    if (now - windowStart >= config.windowMs) {
      debug.http('Rate limiter window reset')
      requests = 0
      windowStart = now
    }

    // Wait if rate limit reached
    if (requests >= config.maxRequests) {
      const waitTime = config.windowMs - (now - windowStart)
      debug.http('Rate limit reached, waiting %dms', waitTime)
      await delay(waitTime)
      requests = 0
      windowStart = Date.now()
    }

    requests++
    debug.http('Request %d/%d in current window', requests, config.maxRequests)
  }

  return { throttle }
}

// Utility functions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isWhitelisted = (url: string, whitelist: string[]): boolean => {
  try {
    const urlObj = new URL(url)

    // Always allow localhost and common local dev ports
    if (
      urlObj.hostname === 'localhost' ||
      urlObj.hostname === '127.0.0.1' ||
      urlObj.hostname === '::1' ||
      urlObj.hostname === '0.0.0.0'
    ) {
      return true
    }

    // If no whitelist specified, only allow localhost
    if (whitelist.length === 0) {
      return false
    }

    return whitelist.some((allowed) => {
      // Support wildcards
      const pattern = allowed.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(urlObj.hostname)
    })
  } catch {
    return false
  }
}

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) {
        debug.http('All retries exhausted, throwing error')
        throw error
      }
      const backoffTime = 2 ** i * 1000
      debug.http(
        'Request failed, retry %d/%d after %dms',
        i + 1,
        maxRetries,
        backoffTime,
      )
      await delay(backoffTime) // Exponential backoff
    }
  }
  throw new Error('Retry failed')
}

export const createHttpClient = (config: HttpClientConfig): HttpClient => {
  const rateLimiter = config.rateLimit
    ? createRateLimiter(config.rateLimit)
    : { throttle: async () => {} }

  const request = async (options: RequestOptions): Promise<HttpResponse> => {
    debug.http('HTTP request: %s %s', options.method || 'GET', options.url)

    // Whitelist check
    if (!isWhitelisted(options.url, config.whitelist)) {
      debug.http('URL not whitelisted: %s', options.url)
      throw new Error(`URL not whitelisted: ${options.url}`)
    }

    // Rate limiting
    await rateLimiter.throttle()

    // Execute request with retry
    return retryWithBackoff(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)

      try {
        const response = await fetch(options.url, {
          method: options.method || 'GET',
          headers: {
            'User-Agent': 'VulnAgent/1.0',
            ...options.headers,
          },
          body: options.body,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Get response data
        const responseBody = await response.text()
        const headers: Record<string, string> = {}
        response.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value
        })

        debug.http(
          'Response: %d %s (body: %d bytes)',
          response.status,
          response.url,
          responseBody.length,
        )

        return {
          status: response.status,
          headers,
          body: responseBody,
          url: response.url,
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${config.timeout}ms`)
        }
        throw error
      }
    }, config.retries || 3)
  }

  return { request }
}
