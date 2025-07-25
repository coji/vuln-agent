import { describe, expect, it } from 'vitest'
import { createPatternMatcher } from './pattern-matcher.js'

describe('PatternMatcher', () => {
  const patternMatcher = createPatternMatcher()

  describe('findMatches', () => {
    it('should find simple pattern matches', () => {
      const content = 'const apiKey = "secret123"'
      const pattern = /apiKey/g
      const matches = patternMatcher.findMatches(content, pattern)

      expect(matches).toHaveLength(1)
      expect(matches[0]).toEqual({
        start: 6,
        end: 12,
        line: 1,
        column: 7,
        matched: 'apiKey',
      })
    })

    it('should find multiple matches in the same line', () => {
      const content = 'const key = "key"; const key2 = "key"'
      const pattern = /key/g
      const matches = patternMatcher.findMatches(content, pattern)

      expect(matches).toHaveLength(4) // "key" appears 4 times: in variable name, string value, key2, and another string value
    })

    it('should find matches across multiple lines', () => {
      const content = `line1 with pattern
line2 without
line3 with pattern`
      const pattern = /pattern/g
      const matches = patternMatcher.findMatches(content, pattern)

      expect(matches).toHaveLength(2)
      expect(matches[0].line).toBe(1)
      expect(matches[1].line).toBe(3)
    })
  })
})
