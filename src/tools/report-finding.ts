import { tool } from 'ai'
import { z } from 'zod'
import type { VulnAgentTool, VulnerabilityFinding } from '../types.js'

// In-memory storage for findings (will be replaced with proper storage later)
const findingsStore = new Map<string, VulnerabilityFinding[]>()

export const createReportFindingTool = (): VulnAgentTool => {
  return {
    name: 'reportFinding',
    tool: tool({
      description: 'Report and store a confirmed vulnerability finding',
      parameters: z.object({
        sessionId: z.string().describe('Current scan session ID'),
        finding: z
          .object({
            type: z.enum([
              'XSS',
              'SQLi',
              'Authentication',
              'Configuration',
              'Other',
            ]),
            severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
            url: z.string(),
            parameter: z.string().optional(),
            evidence: z.object({
              request: z.object({
                method: z.string(),
                url: z.string(),
                headers: z.record(z.string()).optional(),
                body: z.string().optional(),
              }),
              response: z.object({
                status: z.number(),
                headers: z.record(z.string()),
                body: z.string(),
              }),
              payload: z.string().optional(),
            }),
            description: z.string(),
            recommendation: z.string(),
            confidence: z.number().min(0).max(1),
          })
          .describe('Vulnerability details to report'),
        metadata: z
          .object({
            technique: z.string().optional(),
            cwe: z.string().optional(),
            owasp: z.string().optional(),
            references: z.array(z.string()).optional(),
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
