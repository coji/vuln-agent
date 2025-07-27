import { createLLM } from '../../src/llm.js'
import type { LLMProvider } from '../../src/types.js'

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
export const createMockLLMProvider = (
  options: MockLLMProviderOptions = {},
): LLMProvider => {
  const { customResponses = {}, verbose = false } = options
  let stepCount = 0
  const discoveredEndpoints: string[] = []
  const testedEndpoints: string[] = []

  // Get base mock provider
  const baseProvider = createLLM({ provider: 'openai-o3', apiKey: '' })

  return {
    ...baseProvider,
    generateObject: async <T>({
      prompt,
    }: {
      prompt: string
      schema: unknown
    }) => {
      if (verbose) {
        console.log('🤖 Mock LLM Prompt:', `${prompt.substring(0, 200)}...`)
      }

      // Check for custom responses first
      for (const [key, response] of Object.entries(customResponses)) {
        if (prompt.includes(key)) {
          return { object: response as T }
        }
      }

      // Handle agent tool selection
      if (
        prompt.includes('Choose the most appropriate tool') &&
        prompt.includes('autonomous security testing agent')
      ) {
        stepCount++

        // Simulate agent decision making
        if (stepCount === 1) {
          // First step: explore the target
          return {
            object: {
              tool: 'httpRequest',
              parameters: {
                url:
                  prompt.match(/Target URL: ([^\n]+)/)?.[1] ||
                  'http://localhost:3000',
                method: 'GET',
              },
              reasoning:
                'Initial reconnaissance to understand the application structure',
            } as T,
          }
        } else if (stepCount === 2) {
          // Second step: extract links
          return {
            object: {
              tool: 'extractLinks',
              parameters: {
                html: '<html><body><a href="/xss/reflected">Search</a><a href="/sqli/error">Products</a></body></html>',
                baseUrl: 'http://localhost:3000',
                currentUrl: 'http://localhost:3000',
              },
              reasoning: 'Extracting links to map application endpoints',
            } as T,
          }
        } else if (stepCount === 3) {
          // Third step: analyze response
          return {
            object: {
              tool: 'analyzeResponse',
              parameters: {
                response: {
                  status: 200,
                  headers: { 'content-type': 'text/html' },
                  body: '<html><body>Welcome</body></html>',
                },
                url: 'http://localhost:3000',
                method: 'GET',
                context: {
                  previousFindings: [],
                  phase: 'reconnaissance',
                },
              },
              reasoning:
                'Analyzing response for security headers and information disclosure',
            } as T,
          }
        } else if (stepCount === 4) {
          // Report a finding
          return {
            object: {
              tool: 'reportFinding',
              parameters: {
                sessionId:
                  prompt.match(/Session ID: ([^\n]+)/)?.[1] || 'test-session',
                finding: {
                  type: 'Configuration',
                  severity: 'medium',
                  confidence: 0.9,
                  url: 'http://localhost:3000',
                  method: 'GET',
                  parameter: null,
                  evidence: {
                    request: 'GET / HTTP/1.1',
                    response:
                      'Missing security headers: X-Frame-Options, Content-Security-Policy',
                    payload: null,
                  },
                  description:
                    'Missing security headers that could lead to clickjacking and XSS attacks',
                  remediation:
                    'Implement security headers: X-Frame-Options, Content-Security-Policy, X-Content-Type-Options',
                  references: ['https://owasp.org/www-project-secure-headers/'],
                },
              },
              reasoning:
                'Reporting missing security headers as a configuration issue',
            } as T,
          }
        } else if (stepCount === 5) {
          // Test for XSS
          return {
            object: {
              tool: 'testPayload',
              parameters: {
                url: 'http://localhost:3000/xss/reflected',
                method: 'GET',
                parameter: 'input',
                vulnerabilityType: 'XSS',
                context: {
                  technology: 'unknown',
                  filters: [],
                  previousPayloads: [],
                },
              },
              reasoning:
                'Testing for XSS vulnerability in the search parameter',
            } as T,
          }
        } else if (stepCount > 10) {
          // Stop after 10 steps for testing
          return {
            object: {
              tool: 'updateStrategy',
              parameters: {
                sessionId:
                  prompt.match(/Session ID: ([^\n]+)/)?.[1] || 'test-session',
                currentState: {
                  completedSteps: 10,
                  remainingSteps: 0,
                  findings: [],
                  testedEndpoints: ['/xss/reflected', '/sqli/error'],
                  discoveredEndpoints: ['/xss/reflected', '/sqli/error'],
                },
              },
              reasoning: 'Finishing up the test scan',
            } as T,
          }
        } else {
          // Default: manage tasks
          return {
            object: {
              tool: 'manageTasks',
              parameters: {
                sessionId: 'test-session',
                action: 'get',
                filter: { status: 'pending' },
              },
              reasoning: 'Checking for pending tasks',
            } as T,
          }
        }
      }

      // XSS payload generation
      if (
        prompt.includes('testing for XSS vulnerabilities') &&
        prompt.includes('security researcher')
      ) {
        // Check for filter bypass scenarios
        if (prompt.includes('blocked') && prompt.includes('<script')) {
          // Suggest alternative XSS payload
          return {
            object: {
              payload: '<img src=x onerror=alert("XSS")>',
              reasoning:
                'Using img tag with onerror event to bypass script tag filter',
              technique: 'img-onerror',
              confidence: 0.85,
            } as T,
          }
        }

        // Default XSS payload
        return {
          object: {
            payload: '<script>alert("XSS")</script>',
            reasoning: 'Basic script tag injection to test for XSS',
            technique: 'script-tag-injection',
            confidence: 0.9,
          } as T,
        }
      }

      // SQLi payload generation
      if (
        prompt.includes('testing for SQLi vulnerabilities') &&
        prompt.includes('security researcher')
      ) {
        // Check for different SQLi contexts
        if (prompt.includes('blind')) {
          return {
            object: {
              payload: "' OR '1'='1",
              reasoning:
                'Boolean-based blind SQL injection for authentication bypass',
              technique: 'boolean-based-blind',
              confidence: 0.85,
            } as T,
          }
        }

        // Default SQLi payload
        return {
          object: {
            payload: "' OR 1=1--",
            reasoning: 'Classic SQL injection payload with comment',
            technique: 'union-based',
            confidence: 0.9,
          } as T,
        }
      }

      // XSS response analysis
      if (prompt.includes('Analyze') && prompt.includes('successful XSS')) {
        // Check if payload is reflected
        if (
          prompt.includes('<script>alert("XSS")</script>') &&
          prompt.includes('You searched for: <script>alert("XSS")</script>')
        ) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.95,
              severity: 'high' as const,
              evidence: [
                {
                  type: 'reflected-payload',
                  description:
                    'The payload is reflected without encoding in the response',
                  location: 'body',
                },
              ],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation: 'Encode all user input before outputting to HTML',
            } as T,
          }
        }

        // Check for img onerror payload
        if (
          prompt.includes('<img src=x onerror=alert("XSS")>') &&
          prompt.includes('You searched for: <img src=x onerror=alert("XSS")>')
        ) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.9,
              severity: 'high' as const,
              evidence: [
                {
                  type: 'reflected-payload',
                  description:
                    'The img tag with onerror event is reflected without filtering',
                  location: 'body',
                },
              ],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation:
                'Implement proper HTML encoding and Content Security Policy',
            } as T,
          }
        }

        // Check for filtered response
        if (prompt.includes('&lt;script')) {
          return {
            object: {
              isVulnerable: false,
              confidence: 0.8,
              severity: 'info' as const,
              evidence: [
                {
                  type: 'filter-detected',
                  description: 'Script tags are being filtered',
                  location: 'body',
                },
              ],
              filterDetected: {
                type: 'tag-replacement',
                description: 'Script tags are being HTML encoded',
                bypass: 'Try alternative tags or event handlers',
              },
              suggestedNextPayload: '<img src=x onerror=alert(1)>',
              remediation:
                'Current filtering is incomplete - implement comprehensive HTML encoding',
            } as T,
          }
        }
      }

      // SQLi response analysis - match the actual payload used
      if (prompt.includes('Analyze') && prompt.includes('successful SQLi')) {
        // Check for SQL error with single quote payload
        if (
          (prompt.includes("' OR 1=1--") || prompt.includes("' OR '1'='1")) &&
          (prompt.includes('error in your SQL syntax') ||
            prompt.includes('Status: 500'))
        ) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.95,
              severity: 'critical' as const,
              evidence: [
                {
                  type: 'sql-error-exposed',
                  description:
                    'MySQL error message exposed in response revealing SQL injection vulnerability',
                  location: 'body',
                },
              ],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation: 'Use parameterized queries or prepared statements',
            } as T,
          }
        }

        // Check for successful authentication bypass
        if (
          prompt.includes("' OR '1'='1") &&
          prompt.includes('Welcome Administrator')
        ) {
          return {
            object: {
              isVulnerable: true,
              confidence: 0.9,
              severity: 'critical' as const,
              evidence: [
                {
                  type: 'authentication-bypass',
                  description: 'SQL injection allowed authentication bypass',
                  location: 'body',
                },
              ],
              filterDetected: null,
              suggestedNextPayload: null,
              remediation:
                'Use parameterized queries and proper authentication',
            } as T,
          }
        }
      }

      // Handle link extraction
      if (prompt.includes('Extract all links') && prompt.includes('forms')) {
        discoveredEndpoints.push('/xss/reflected', '/sqli/error')
        return {
          object: {
            links: [
              {
                url: 'http://localhost:3000/xss/reflected',
                text: 'Search',
                type: 'internal',
              },
              {
                url: 'http://localhost:3000/sqli/error',
                text: 'Products',
                type: 'internal',
              },
            ],
            forms: [
              {
                action: '/xss/reflected',
                method: 'GET',
                inputs: [{ name: 'input', type: 'text', value: '' }],
              },
            ],
            apis: [],
            insights: {
              totalLinks: 2,
              totalForms: 1,
              technologies: [],
              patterns: [
                'Possible search functionality',
                'Database-driven content',
              ],
            },
          } as T,
        }
      }

      // Handle response analysis
      if (
        prompt.includes('Analyze this HTTP response') &&
        prompt.includes('security vulnerabilities')
      ) {
        // Check for missing headers
        if (prompt.includes('Welcome') && !prompt.includes('X-Frame-Options')) {
          return {
            object: {
              vulnerabilities: [
                {
                  type: 'Configuration',
                  severity: 'medium',
                  confidence: 0.9,
                  description: 'Missing security headers',
                  evidence: [
                    'Missing X-Frame-Options header',
                    'Missing Content-Security-Policy header',
                  ],
                  impact:
                    'Application vulnerable to clickjacking and XSS attacks',
                },
              ],
              insights: {
                technology: 'Unknown framework',
                authentication: 'No authentication detected',
                inputs: [],
                patterns: [],
              },
              suggestedActions: [
                {
                  action: 'test_endpoint',
                  target: '/xss/reflected',
                  reason: 'Test search functionality for XSS',
                },
                {
                  action: 'test_endpoint',
                  target: '/sqli/error',
                  reason: 'Test products page for SQL injection',
                },
              ],
            } as T,
          }
        }
      }

      // Handle task management responses
      if (prompt.includes('Manage scan tasks')) {
        return {
          object: {
            success: true,
            tasks:
              testedEndpoints.length < 2
                ? [
                    {
                      id: 'task-1',
                      type: 'test_endpoint',
                      target: '/xss/reflected',
                      status: 'pending',
                      priority: 1,
                    },
                    {
                      id: 'task-2',
                      type: 'test_endpoint',
                      target: '/sqli/error',
                      status: 'pending',
                      priority: 2,
                    },
                  ]
                : [],
            stats: {
              total: 2,
              pending:
                testedEndpoints.length < 2 ? 2 - testedEndpoints.length : 0,
              completed: testedEndpoints.length,
              inProgress: 0,
              failed: 0,
            },
          } as T,
        }
      }

      // Handle strategy updates
      if (
        prompt.includes(
          'Analyze the current security scan progress and recommend strategy adjustments',
        )
      ) {
        return {
          object: {
            recommendations: {
              focusAreas: ['XSS testing', 'SQL injection testing'],
              skipPatterns: [],
              maxDepth: 3,
              testIntensity: 'normal' as const,
              reasoning: 'Focus on common web vulnerabilities',
            },
            tactics: [
              {
                technique: 'Payload variation',
                description: 'Try different XSS payloads to bypass filters',
                priority: 'high' as const,
              },
            ],
            adjustments: ['Focus on XSS vulnerabilities', 'Test SQL injection'],
          } as T,
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
          remediation: '',
        } as T,
      }
    },
  }
}
