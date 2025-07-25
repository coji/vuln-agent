import type { AnalysisResult, Vulnerability } from '../core/types.js'
import { createLLMProvider } from '../llm/provider-factory.js'
import type { LLMConfig } from '../llm/types.js'

export const createLLMAnalyzer = (config: LLMConfig) => {
  const provider = createLLMProvider(config)

  const analyzeFile = async (
    content: string,
    filePath: string,
  ): Promise<Vulnerability[]> => {
    const analysis = await provider.analyze(content, `File: ${filePath}`)

    return analysis.vulnerabilities.map((vuln, index) => ({
      id: `${provider.name}-${filePath}-${index}`,
      type: vuln.type,
      severity: vuln.severity,
      file: filePath,
      line: vuln.location.startLine || 1,
      column: 1,
      message: vuln.description,
      code: vuln.location.snippet || '',
      rule: vuln.cwe || provider.name,
    }))
  }

  const analyzeFiles = async (
    files: Map<string, string>,
  ): Promise<AnalysisResult> => {
    const startTime = Date.now()
    const allVulnerabilities: Vulnerability[] = []

    for (const [filePath, content] of files) {
      try {
        const vulnerabilities = await analyzeFile(content, filePath)
        allVulnerabilities.push(...vulnerabilities)
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error)
      }
    }

    return {
      vulnerabilities: allVulnerabilities,
      scannedFiles: files.size,
      duration: Date.now() - startTime,
    }
  }

  return {
    provider,
    analyzeFile,
    analyzeFiles,
  }
}
