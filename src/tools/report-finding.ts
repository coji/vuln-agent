import { tool } from 'ai'
import { z } from 'zod'
import type { VulnAgentTool, VulnerabilityFinding } from '../types.js'

// In-memory storage for findings (will be replaced with proper storage later)
const findingsStore = new Map<string, VulnerabilityFinding[]>()

export const createReportFindingTool = (): VulnAgentTool => {
  return {
    name: 'reportFinding',
    tool: tool({
      description: `Report and store a confirmed vulnerability finding. Choose the most specific vulnerability type that matches:
- XSS: Cross-Site Scripting
- SQLi: SQL Injection
- Authentication: Authentication bypass, weak authentication
- Authorization: Access control issues, privilege escalation
- CSRF: Cross-Site Request Forgery
- Information Disclosure: Sensitive data exposure, error messages with stack traces
- Configuration: Security misconfigurations, missing security headers
- Injection: Command injection, LDAP injection, other injection types (not SQL)
- Path Traversal: Directory traversal, file inclusion
- XXE: XML External Entity injection
- SSRF: Server-Side Request Forgery
- Deserialization: Insecure deserialization
- File Upload: Unrestricted file upload vulnerabilities
- Business Logic: Logic flaws, workflow bypass
- Race Condition: Time-of-check to time-of-use issues
- Other: Use only if none of the above categories fit`,
      parameters: z.object({
        sessionId: z.string().describe('Current scan session ID'),
        finding: z
          .object({
            type: z
              .enum([
                'XSS',
                'SQLi',
                'Authentication',
                'Authorization',
                'CSRF',
                'Information Disclosure',
                'Configuration',
                'Injection',
                'Path Traversal',
                'XXE',
                'SSRF',
                'Deserialization',
                'File Upload',
                'Business Logic',
                'Race Condition',
                'Other',
              ])
              .describe(
                'Vulnerability type - choose the most specific category that matches',
              ),
            severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
            url: z.string().describe('URL where vulnerability was found'),
            parameter: z
              .string()
              .optional()
              .describe('Affected parameter name if applicable'),
            evidence: z.object({
              request: z.object({
                method: z.string().describe('HTTP method used'),
                url: z.string().describe('Full request URL'),
                headers: z
                  .record(z.string())
                  .optional()
                  .describe('Request headers'),
                body: z.string().optional().describe('Request body'),
              }),
              response: z.object({
                status: z.number().describe('Response status code'),
                headers: z.record(z.string()).describe('Response headers'),
                body: z.string().describe('Response body (may be truncated)'),
              }),
              payload: z
                .string()
                .optional()
                .describe('The payload that triggered the vulnerability'),
            }),
            description: z
              .string()
              .describe('Detailed description of the vulnerability'),
            recommendation: z.string().describe('Remediation recommendations'),
            confidence: z
              .number()
              .min(0)
              .max(1)
              .describe('Confidence score (0-1)'),
          })
          .describe('Vulnerability details to report'),
        metadata: z
          .object({
            technique: z.string().optional().describe('Attack technique used'),
            cwe: z.string().optional().describe('CWE ID if applicable'),
            owasp: z.string().optional().describe('OWASP category'),
            references: z
              .array(z.string())
              .optional()
              .describe('Reference URLs'),
          })
          .optional()
          .describe('Additional metadata'),
      }),
      execute: async (params) => {
        try {
          // Create finding object
          const finding: VulnerabilityFinding = {
            id: `${params.sessionId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            ...params.finding,
            timestamp: new Date(),
          }

          // Store finding
          const sessionFindings = findingsStore.get(params.sessionId) || []
          sessionFindings.push(finding)
          findingsStore.set(params.sessionId, sessionFindings)

          // Generate summary
          const summary = {
            findingId: finding.id,
            type: finding.type,
            severity: finding.severity,
            url: finding.url,
            parameter: finding.parameter,
            confidence: finding.confidence,
            totalFindingsInSession: sessionFindings.length,
            criticalCount: sessionFindings.filter(
              (f) => f.severity === 'critical',
            ).length,
            highCount: sessionFindings.filter((f) => f.severity === 'high')
              .length,
          }

          return {
            success: true,
            finding,
            summary,
            message: `${finding.severity.toUpperCase()} severity ${finding.type} vulnerability reported successfully`,
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to report finding',
          }
        }
      },
    }),
  }
}

// Utility function to get all findings for a session
export const getSessionFindings = (
  sessionId: string,
): VulnerabilityFinding[] => {
  return findingsStore.get(sessionId) || []
}

// Utility function to clear findings for a session
export const clearSessionFindings = (sessionId: string): void => {
  findingsStore.delete(sessionId)
}
