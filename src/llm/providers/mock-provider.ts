import type { LLMProvider, VulnerabilityAnalysis } from '../types.js'

// Mock provider for testing without API calls
export const createMockProvider = (): LLMProvider => {
  return {
    name: 'mock',
    analyze: async (code: string): Promise<VulnerabilityAnalysis> => {
      // Simulate some basic pattern matching for demo purposes
      const vulnerabilities = []
      
      if (code.includes('eval(')) {
        vulnerabilities.push({
          type: 'Code Injection',
          severity: 'critical' as const,
          description: 'Use of eval() can lead to code injection vulnerabilities',
          location: {
            snippet: 'eval(...)'
          },
          recommendation: 'Avoid using eval(). Use safer alternatives like JSON.parse() for parsing JSON.',
          cwe: 'CWE-94'
        })
      }
      
      if (code.match(/password\s*=\s*["'][^"']+["']/i)) {
        vulnerabilities.push({
          type: 'Hardcoded Credentials',
          severity: 'high' as const,
          description: 'Hardcoded password detected in source code',
          location: {
            snippet: 'password = "..."'
          },
          recommendation: 'Use environment variables or secure credential management systems.',
          cwe: 'CWE-798'
        })
      }
      
      return {
        vulnerabilities,
        summary: vulnerabilities.length > 0 
          ? `Found ${vulnerabilities.length} potential security issues`
          : 'No obvious security issues detected',
        confidence: 0.7
      }
    }
  }
}