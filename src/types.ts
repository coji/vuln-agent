import type { LanguageModelV1 } from 'ai'
import type { z } from 'zod'

// ========================================
// Core Types
// ========================================

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type VulnerabilityType =
  | 'XSS'
  | 'SQLi'
  | 'Authentication'
  | 'Configuration'
  | 'Other'

// ========================================
// LLM Types
// ========================================

export type LLMProviderType =
  | 'openai-o3'
  | 'claude-sonnet-4'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'

export interface LLMConfig {
  provider: LLMProviderType
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface LLMProvider {
  name: string
  model: LanguageModelV1
  generateObject: <T>(params: {
    prompt: string
    schema: z.ZodSchema<T>
  }) => Promise<{ object: T }>
}

// ========================================
// Scan Types
// ========================================

export type ScanState =
  | 'initializing'
  | 'scanning'
  | 'analyzing'
  | 'completed'
  | 'failed'

export interface ScanStrategy {
  focusAreas: string[]
  skipPatterns: string[]
  maxDepth: number
  testIntensity: 'light' | 'normal' | 'thorough'
}

export interface ScanTask {
  id: string
  type: 'test_endpoint' | 'analyze_response' | 'extract_links' | 'test_payload'
  priority: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  target: string
  metadata?: Record<string, unknown>
}

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

// ========================================
// Vulnerability Types
// ========================================

// Legacy vulnerability type for reporters (to be refactored later)
export interface Vulnerability {
  id: string
  type: string
  severity: SeverityLevel
  file: string
  line: number
  column: number
  message: string
  code: string
  rule: string
}

export interface HttpResponse {
  status: number
  headers: Record<string, string>
  body: string
  url: string
}

export interface VulnerabilityFinding {
  id: string
  type: VulnerabilityType
  severity: SeverityLevel
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

export interface VulnerabilityAttempt {
  payload: string
  result:
    | 'reflected'
    | 'sql_error_exposed'
    | 'blocked'
    | 'server_error'
    | 'no_change'
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
  severity: SeverityLevel
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
  generatePayload: (
    context: VulnerabilityTestContext,
    vulnerabilityType: string,
  ) => Promise<PayloadGenerationResult>
  analyzeResponse: (
    context: VulnerabilityTestContext,
    testResult: VulnerabilityTestResult,
  ) => Promise<VulnerabilityAnalysisResult>
}

// ========================================
// Analysis Result Types
// ========================================

export interface AnalysisResult {
  vulnerabilities: Vulnerability[] // For backward compatibility with reporters
  findings?: VulnerabilityFinding[] // For new code
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

// ========================================
// Tool Types
// ========================================

export interface VulnAgentTool {
  name: string
  // Using any for tool because each tool has different parameter and result types
  // The AI SDK's Tool type is complex and varies by implementation
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types vary by implementation
  tool: any
}

export interface ToolContext {
  sessionId: string
  logger: (message: string) => void
}
