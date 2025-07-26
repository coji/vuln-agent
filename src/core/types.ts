export interface Vulnerability {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  file: string
  line: number
  column: number
  message: string
  code: string
  rule: string
}

export interface AnalysisResult {
  vulnerabilities: Vulnerability[]
  scannedFiles: number
  duration: number
  summary?: {
    totalVulnerabilities: number
    severityDistribution: {
      critical: number
      high: number
      medium: number
      low: number
      info: number
    }
  }
  metadata?: {
    agentSteps?: number
    completed?: boolean
    error?: string
    toolsUsed?: string[]
    strategy?: unknown
    strategyUpdates?: number
    reportPath?: string
  }
}

export interface Rule {
  id: string
  name: string
  description: string
  severity: Vulnerability['severity']
  pattern: RegExp | ((content: string) => Match[])
  message: string
}

export interface Match {
  start: number
  end: number
  line: number
  column: number
  matched: string
}
