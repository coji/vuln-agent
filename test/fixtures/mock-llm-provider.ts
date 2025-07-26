import type { LLMProvider } from '../../src/scanners/vulnerabilities/llm-tester.js'

export interface MockLLMProviderOptions {
  // Allow customizing responses for specific tests
  customResponses?: {
    [key: string]: unknown
  }
  verbose?: boolean
}

/**
 * Creates a mock LLM provider for testing vulnerability detection
 */
export const createMockLLMProvider = (options: MockLLMProviderOptions = {}): LLMProvider => {
  const { customResponses = {}, verbose = false } = options
  
  return {
    generateObject: async ({ prompt }) => {
      if (verbose) {
        console.log('🤖 Mock LLM Prompt:', `${prompt.substring(0, 200)}...`)
      }
      
      // Check for custom responses first
      for (const [key, response] of Object.entries(customResponses)) {
        if (prompt.includes(key)) {
          return { object: response }
        }
      }
      
      // XSS payload generation
      if (prompt.includes('testing for XSS vulnerabilities') && prompt.includes('security researcher')) {
        // Check for filter bypass scenarios
        if (prompt.includes('blocked') && prompt.includes('<script')) {
          // Suggest alternative XSS payload
          return {
            object: {
              payload: '<img src=x onerror=alert("XSS")>',
              reasoning: 'Using img tag with onerror event to bypass script tag filter',
              technique: 'img-onerror',
              confidence: 0.85
            }
          }
        }
        
        // Default XSS payload
        return {
          object: {
            payload: '<script>alert("XSS")</script>',
            reasoning: 'Basic script tag injection to test for XSS',
            technique: 'script-tag-injection',
            confidence: 0.9
          }
        }
      }
      
      // SQLi payload generation
      if (prompt.includes('testing for SQLi vulnerabilities') && prompt.includes('security researcher')) {
        // Check for different SQLi contexts
        if (prompt.includes('blind')) {
          return {
            object: {
              payload: "' OR '1'='1",
              reasoning: 'Boolean-based blind SQL injection for authentication bypass',
              technique: 'boolean-based-blind',
              confidence: 0.85
            }
          }
        }
        
        // Default SQLi payload
        return {
          object: {
            payload: "' OR 1=1--",
            reasoning: 'Classic SQL injection payload with comment',
            technique: 'union-based',
            confidence: 0.9
          }
        }
      }
      
      // XSS response analysis
      if (prompt.includes('Analyze') && prompt.includes('successful XSS')) {
        // Check if payload is reflected
        if (prompt.includes('<script>alert("XSS")</script>') && prompt.includes('You searched for: <script>alert("XSS")</script>')) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.95,
              severity: 'high' as const,
              evidence: [{
                type: 'reflected-payload',
                description: 'The payload is reflected without encoding in the response',
                location: 'body'
              }],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation: 'Encode all user input before outputting to HTML'
            }
          }
        }
        
        // Check for img onerror payload
        if (prompt.includes('<img src=x onerror=alert("XSS")>') && prompt.includes('You searched for: <img src=x onerror=alert("XSS")>')) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.9,
              severity: 'high' as const,
              evidence: [{
                type: 'reflected-payload',
                description: 'The img tag with onerror event is reflected without filtering',
                location: 'body'
              }],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation: 'Implement proper HTML encoding and Content Security Policy'
            }
          }
        }
        
        // Check for filtered response
        if (prompt.includes('&lt;script')) {
          return {
            object: {
              isVulnerable: false,
              confidence: 0.8,
              severity: 'info' as const,
              evidence: [{
                type: 'filter-detected',
                description: 'Script tags are being filtered',
                location: 'body'
              }],
              filterDetected: {
                type: 'tag-replacement',
                description: 'Script tags are being HTML encoded',
                bypass: 'Try alternative tags or event handlers'
              },
              suggestedNextPayload: '<img src=x onerror=alert(1)>',
              remediation: 'Current filtering is incomplete - implement comprehensive HTML encoding'
            }
          }
        }
      }
      
      // SQLi response analysis - match the actual payload used
      if (prompt.includes('Analyze') && prompt.includes('successful SQLi')) {
        // Check for SQL error with single quote payload
        if ((prompt.includes("' OR 1=1--") || prompt.includes("' OR '1'='1")) && 
            (prompt.includes('error in your SQL syntax') || prompt.includes('Status: 500'))) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.95,
              severity: 'critical' as const,
              evidence: [{
                type: 'sql-error-exposed',
                description: 'MySQL error message exposed in response revealing SQL injection vulnerability',
                location: 'body'
              }],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation: 'Use parameterized queries or prepared statements'
            }
          }
        }
        
        // Check for successful authentication bypass
        if (prompt.includes("' OR '1'='1") && prompt.includes('Welcome Administrator')) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.9,
              severity: 'critical' as const,
              evidence: [{
                type: 'authentication-bypass',
                description: 'SQL injection allowed authentication bypass',
                location: 'body'
              }],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation: 'Use parameterized queries and proper authentication'
            }
          }
        }
      }
      
      // Default: no vulnerability found
      return {
        object: {
          isVulnerable: false,
          confidence: 0.7,
          severity: 'info' as const,
          evidence: [],
          filterDetected: null,
          suggestedNextPayload: null,
          remediation: ''
        }
      }
    }
  }
}