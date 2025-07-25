import type { Match, Rule, Vulnerability } from '../core/types.js'

export const createPatternMatcher = () => {
  const findMatches = (content: string, pattern: RegExp): Match[] => {
    const matches: Match[] = []
    const lines = content.split('\n')

    lines.forEach((line, lineIndex) => {
      let match: RegExpExecArray | null
      const regex = new RegExp(pattern, 'g')

      match = regex.exec(line)
      while (match !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          line: lineIndex + 1,
          column: match.index + 1,
          matched: match[0],
        })
        match = regex.exec(line)
      }
    })

    return matches
  }

  const analyzeWithRule = (
    content: string,
    filePath: string,
    rule: Rule,
  ): Vulnerability[] => {
    const matches =
      typeof rule.pattern === 'function'
        ? rule.pattern(content)
        : findMatches(content, rule.pattern)

    return matches.map((match) => ({
      id: `${rule.id}-${filePath}-${match.line}-${match.column}`,
      type: rule.name,
      severity: rule.severity,
      file: filePath,
      line: match.line,
      column: match.column,
      message: rule.message,
      code: match.matched,
      rule: rule.id,
    }))
  }

  return {
    findMatches,
    analyzeWithRule,
  }
}
