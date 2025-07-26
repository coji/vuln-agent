export interface HttpResponse {
  status: number
  headers: Record<string, string>
  body: string
}

export interface VulnerabilityAttempt {
  payload: string
  result: 'reflected' | 'sql_error_exposed' | 'blocked' | 'server_error' | 'no_change'
  response: HttpResponse
}

export interface VulnerabilityTestContext {
  url: string
  parameter: string
  parameterLocation: 'query' | 'body' | 'header' | 'cookie' | 'path'
  method: string
  baselineResponse: HttpResponse
  detectedTechnologies?: string[]
  previousAttempts?: VulnerabilityAttempt[]
}

export interface PayloadGenerationResult {
  payload: string
  reasoning: string
  technique: string
  confidence: number
}

export interface VulnerabilityAnalysisResult {
  isVulnerable: boolean
  confidence: number
  evidence: {
    type: string
    description: string
    location?: string
  }[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  remediation: string
  suggestedNextPayload?: string
  filterDetected?: {
    type: string
    bypass: string
  }
}

export interface VulnerabilityTestResult {
  payload: string
  technique: string
  response: HttpResponse
  reasoning: string
  vulnerabilityType: string
}

export interface LLMVulnerabilityTester {
  generatePayload: (context: VulnerabilityTestContext, vulnerabilityType: string) => Promise<PayloadGenerationResult>
  analyzeResponse: (context: VulnerabilityTestContext, testResult: VulnerabilityTestResult) => Promise<VulnerabilityAnalysisResult>
}