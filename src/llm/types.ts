export interface LLMProvider {
  name: string
  analyze: (code: string, context?: string) => Promise<VulnerabilityAnalysis>
}

export interface VulnerabilityAnalysis {
  vulnerabilities: LLMVulnerability[]
  summary: string
  confidence: number
}

export interface LLMVulnerability {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  location: {
    startLine?: number
    endLine?: number
    snippet?: string
  }
  recommendation: string
  cwe?: string // Common Weakness Enumeration ID
}

export type LLMProviderType = 'openai-o3' | 'anthropic-sonnet4' | 'gemini-2.5-pro' | 'gemini-2.5-flash'

export interface LLMConfig {
  provider: LLMProviderType
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}