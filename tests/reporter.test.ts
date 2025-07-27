import { describe, expect, it } from 'vitest'
import { createReporter } from '../src/reporter.js'
import type { VulnerabilityFinding } from '../src/types.js'

describe('reporter', () => {
  const createMockFinding = (
    overrides?: Partial<VulnerabilityFinding>,
  ): VulnerabilityFinding => ({
    id: 'test-1',
    type: 'XSS',
    severity: 'high',
    url: 'http://example.com',
    parameter: 'input',
    evidence: {
      request: {
        method: 'GET',
        url: 'http://example.com/?input=test',
        headers: {},
      },
      response: {
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<div>test</div>',
      },
      payload: '<script>alert(1)</script>',
    },
    description: 'Test XSS vulnerability',
    recommendation: 'Encode output',
    confidence: 0.9,
    timestamp: new Date(),
    ...overrides,
  })

  it('generates console report', () => {
    const reporter = createReporter()
    const findings = [createMockFinding()]

    const report = reporter.generateConsoleReport(findings)

    expect(report).toContain('Found 1 vulnerability')
    expect(report).toContain('XSS')
    expect(report).toContain('HIGH')
    expect(report).toContain('http://example.com')
  })

  it('generates html report', () => {
    const reporter = createReporter()
    const findings = [createMockFinding()]

    const html = reporter.generateHTMLReport({
      findings,
      targetUrl: 'http://example.com',
      duration: 1000,
      stepsExecuted: 10,
    })

    expect(html).toContain('<html>')
    expect(html).toContain('VulnAgent Security Report')
    expect(html).toContain('http://example.com')
    expect(html).toContain('XSS')
  })

  it('sorts findings by severity', () => {
    const reporter = createReporter()
    const findings = [
      createMockFinding({ severity: 'low' }),
      createMockFinding({ severity: 'critical' }),
      createMockFinding({ severity: 'medium' }),
    ]

    const report = reporter.generateConsoleReport(findings)

    // Check that findings are sorted in the report
    const criticalIndex = report.indexOf('CRITICAL')
    const mediumIndex = report.indexOf('MEDIUM')
    const lowIndex = report.indexOf('LOW')

    expect(criticalIndex).toBeGreaterThan(-1)
    expect(mediumIndex).toBeGreaterThan(-1)
    expect(lowIndex).toBeGreaterThan(-1)
    expect(criticalIndex).toBeLessThan(mediumIndex)
    expect(mediumIndex).toBeLessThan(lowIndex)
  })
})
