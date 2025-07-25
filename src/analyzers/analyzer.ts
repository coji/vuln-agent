import type { AnalysisResult, Rule, Vulnerability } from '../core/types.js'
import { defaultRules } from '../rules/default-rules.js'
import { createPatternMatcher } from './pattern-matcher.js'

export const createAnalyzer = () => {
  const patternMatcher = createPatternMatcher()

  const analyzeContent = (
    content: string,
    filePath: string,
    rules: Rule[] = defaultRules,
  ): Vulnerability[] => {
    const vulnerabilities: Vulnerability[] = []

    for (const rule of rules) {
      const ruleVulnerabilities = patternMatcher.analyzeWithRule(
        content,
        filePath,
        rule,
      )
      vulnerabilities.push(...ruleVulnerabilities)
    }

    return vulnerabilities
  }

  const analyzeFiles = async (
    files: Map<string, string>,
    rules?: Rule[],
  ): Promise<AnalysisResult> => {
    const startTime = Date.now()
    const allVulnerabilities: Vulnerability[] = []

    for (const [filePath, content] of files) {
      const vulnerabilities = analyzeContent(content, filePath, rules)
      allVulnerabilities.push(...vulnerabilities)
    }

    return {
      vulnerabilities: allVulnerabilities,
      scannedFiles: files.size,
      duration: Date.now() - startTime,
    }
  }

  return {
    analyzeContent,
    analyzeFiles,
  }
}
