export interface ScanSession {
  id: string
  targetUrl: string
  startTime: Date
  currentStep: number
  maxSteps: number
  state: ScanState
  findings: VulnerabilityFinding[]
  tasks: ScanTask[]
  strategy: ScanStrategy
}

export type ScanState =
  | 'initializing'
  | 'scanning'
  | 'analyzing'
  | 'completed'
  | 'failed'

export interface VulnerabilityFinding {
  id: string
  type: 'XSS' | 'SQLi' | 'Authentication' | 'Configuration' | 'Other'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  url: string
  parameter?: string
  evidence: {
    request: {
      method: string
      url: string
      headers?: Record<string, string>
      body?: string
    }
    response: {
      status: number
      headers: Record<string, string>
      body: string
    }
    payload?: string
  }
  description: string
  recommendation: string
  confidence: number
  timestamp: Date
}

export interface ScanTask {
  id: string
  type: 'test_endpoint' | 'analyze_response' | 'extract_links' | 'test_payload'
  priority: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  target: string
  metadata?: Record<string, unknown>
}

export interface ScanStrategy {
  focusAreas: string[]
  skipPatterns: string[]
  maxDepth: number
  testIntensity: 'light' | 'normal' | 'thorough'
}
