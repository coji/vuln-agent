import { describe, expect, it } from 'vitest'
import {
  calculateSeverityScore,
  formatDuration,
  parseUrl,
  sanitizeHtml,
} from '../src/utils.js'

describe('utils', () => {
  describe('parseUrl', () => {
    it('parses valid url', () => {
      const url = parseUrl('https://example.com:8080/path?query=1')

      expect(url?.protocol).toBe('https:')
      expect(url?.hostname).toBe('example.com')
      expect(url?.port).toBe('8080')
      expect(url?.pathname).toBe('/path')
    })

    it('returns null for invalid url', () => {
      const url = parseUrl('not-a-url')
      expect(url).toBeNull()
    })
  })

  describe('formatDuration', () => {
    it('formats milliseconds to readable string', () => {
      expect(formatDuration(1000)).toBe('1.00s')
      expect(formatDuration(65000)).toBe('1m 5s')
      expect(formatDuration(500)).toBe('0.50s')
    })
  })

  describe('sanitizeHtml', () => {
    it('escapes html entities', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      )
      expect(sanitizeHtml("it's a test & more")).toBe(
        'it&#x27;s a test &amp; more',
      )
    })
  })

  describe('calculateSeverityScore', () => {
    it('returns correct scores', () => {
      expect(calculateSeverityScore('critical')).toBe(10)
      expect(calculateSeverityScore('high')).toBe(8)
      expect(calculateSeverityScore('medium')).toBe(5)
      expect(calculateSeverityScore('low')).toBe(3)
      expect(calculateSeverityScore('info')).toBe(1)
    })
  })
})
