import type { AnalysisResult, Vulnerability } from '../types.js'

export const createConsoleReporter = () => {
  const severityColors = {
    critical: '\x1b[31m', // red
    high: '\x1b[33m', // yellow
    medium: '\x1b[36m', // cyan
    low: '\x1b[34m', // blue
    info: '\x1b[90m', // gray
  }

  const reset = '\x1b[0m'

  const formatVulnerability = (vuln: Vulnerability): string => {
    const color = severityColors[vuln.severity]
    return `${color}[${vuln.severity.toUpperCase()}]${reset} ${vuln.file}:${vuln.line}:${vuln.column}
  ${vuln.message}
  Rule: ${vuln.rule}
  Code: ${vuln.code}`
  }

  const generate = (result: AnalysisResult): string => {
    if (result.vulnerabilities.length === 0) {
      return `✅ No vulnerabilities found in ${result.scannedFiles} files (${result.duration}ms)`
    }

    const output: string[] = [
      `\n🔍 Vulnerability Scan Results`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Scanned ${result.scannedFiles} files in ${result.duration}ms`,
      `Found ${result.vulnerabilities.length} vulnerabilities\n`,
    ]

    const grouped = result.vulnerabilities.reduce(
      (acc, vuln) => {
        if (!acc[vuln.severity]) acc[vuln.severity] = []
        acc[vuln.severity].push(vuln)
        return acc
      },
      {} as Record<string, Vulnerability[]>,
    )

    const severityOrder = ['critical', 'high', 'medium', 'low', 'info']

    for (const severity of severityOrder) {
      const vulns = grouped[severity]
      if (vulns && vulns.length > 0) {
        output.push(
          `\n${severityColors[severity as keyof typeof severityColors]}${severity.toUpperCase()}${reset} (${vulns.length})`,
        )
        output.push('─'.repeat(40))
        vulns.forEach((vuln) => {
          output.push(formatVulnerability(vuln))
          output.push('')
        })
      }
    }

    return output.join('\n')
  }

  return { generate }
}
