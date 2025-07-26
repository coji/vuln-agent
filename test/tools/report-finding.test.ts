import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSessionFindings,
  createReportFindingTool,
  getSessionFindings,
} from '../../src/tools/report-finding.js'

describe('reportFindingTool', () => {
  const sessionId = 'test-session-123'

  beforeEach(() => {
    clearSessionFindings(sessionId)
  })

  it('should create a tool with correct name', () => {
    const tool = createReportFindingTool()
    expect(tool.name).toBe('reportFinding')
  })

  it('should report a finding successfully', async () => {
    const tool = createReportFindingTool()

    const result = await tool.tool.execute({
      sessionId,
      finding: {
        type: 'XSS',
        severity: 'high',
        url: 'https://example.com/search',
        parameter: 'q',
        evidence: {
          request: {
            method: 'GET',
            url: 'https://example.com/search?q=test',
          },
          response: {
            status: 200,
            headers: {},
            body: '<html>test</html>',
          },
          payload: '<script>alert(1)</script>',
        },
        description: 'XSS vulnerability in search parameter',
        recommendation: 'Encode user input',
        confidence: 0.95,
      },
    })

    const typedResult = result as {
      success: boolean
      finding: unknown
      summary: { totalFindingsInSession: number; highCount: number }
    }
    expect(typedResult.success).toBe(true)
    expect(typedResult.finding).toBeDefined()
    expect(typedResult.summary.totalFindingsInSession).toBe(1)
    expect(typedResult.summary.highCount).toBe(1)
  })

  it('should store and retrieve findings', async () => {
    const tool = createReportFindingTool()

    // Report two findings
    await tool.tool.execute({
      sessionId,
      finding: {
        type: 'XSS',
        severity: 'high',
        url: 'https://example.com/1',
        description: 'First finding',
        recommendation: 'Fix it',
        confidence: 0.9,
        evidence: {
          request: { method: 'GET', url: 'https://example.com/1' },
          response: { status: 200, headers: {}, body: '' },
        },
      },
    })

    await tool.tool.execute({
      sessionId,
      finding: {
        type: 'SQLi',
        severity: 'critical',
        url: 'https://example.com/2',
        description: 'Second finding',
        recommendation: 'Fix it',
        confidence: 0.95,
        evidence: {
          request: { method: 'GET', url: 'https://example.com/2' },
          response: { status: 500, headers: {}, body: 'SQL error' },
        },
      },
    })

    const findings = getSessionFindings(sessionId)
    expect(findings).toHaveLength(2)
    expect(findings[0].type).toBe('XSS')
    expect(findings[1].type).toBe('SQLi')
  })
})
