import type { AgentScanResult } from '../../core/agent.js'

export const generateHTMLReport = (result: AgentScanResult): string => {
  const severityColors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#3b82f6',
    info: '#6b7280',
  }

  const severityCounts = {
    critical: result.findings.filter(f => f.severity === 'critical').length,
    high: result.findings.filter(f => f.severity === 'high').length,
    medium: result.findings.filter(f => f.severity === 'medium').length,
    low: result.findings.filter(f => f.severity === 'low').length,
    info: result.findings.filter(f => f.severity === 'info').length,
  }

  const findingCards = result.findings.map((finding) => `
    <div class="finding-card ${finding.severity}">
      <div class="finding-header">
        <span class="finding-type">${finding.type}</span>
        <span class="severity-badge ${finding.severity}">${finding.severity.toUpperCase()}</span>
      </div>
      <h3>${finding.description}</h3>
      <div class="finding-details">
        <p><strong>URL:</strong> <code>${finding.url}</code></p>
        ${finding.parameter ? `<p><strong>Parameter:</strong> <code>${finding.parameter}</code></p>` : ''}
        ${finding.evidence.payload ? `<p><strong>Payload:</strong> <code>${escapeHtml(finding.evidence.payload)}</code></p>` : ''}
        <p><strong>Confidence:</strong> ${Math.round(finding.confidence * 100)}%</p>
      </div>
      <div class="recommendation">
        <h4>Recommendation</h4>
        <p>${finding.recommendation}</p>
      </div>
      <details class="evidence-details">
        <summary>Technical Evidence</summary>
        <pre>${JSON.stringify(finding.evidence, null, 2)}</pre>
      </details>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VulnAgent Security Scan Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      background: #111827;
      color: white;
      padding: 2rem 0;
      margin-bottom: 2rem;
      border-radius: 0.5rem;
    }
    
    header h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    
    header p {
      text-align: center;
      opacity: 0.8;
    }
    
    .summary {
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    
    .summary h2 {
      margin-bottom: 1rem;
      color: #111827;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .stat-card {
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 0.375rem;
      text-align: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }
    
    .stat-label {
      color: #6b7280;
      font-size: 0.875rem;
    }
    
    .severity-chart {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-top: 1rem;
    }
    
    .severity-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .severity-dot {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
    }
    
    .findings {
      margin-bottom: 2rem;
    }
    
    .findings h2 {
      margin-bottom: 1rem;
      color: #111827;
    }
    
    .finding-card {
      background: white;
      padding: 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 1rem;
      border-left: 4px solid #6b7280;
    }
    
    .finding-card.critical {
      border-left-color: #dc2626;
    }
    
    .finding-card.high {
      border-left-color: #ea580c;
    }
    
    .finding-card.medium {
      border-left-color: #f59e0b;
    }
    
    .finding-card.low {
      border-left-color: #3b82f6;
    }
    
    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .finding-type {
      font-weight: 600;
      color: #4b5563;
    }
    
    .severity-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
    }
    
    .severity-badge.critical {
      background: #dc2626;
    }
    
    .severity-badge.high {
      background: #ea580c;
    }
    
    .severity-badge.medium {
      background: #f59e0b;
    }
    
    .severity-badge.low {
      background: #3b82f6;
    }
    
    .severity-badge.info {
      background: #6b7280;
    }
    
    .finding-details {
      margin: 1rem 0;
      color: #4b5563;
    }
    
    .finding-details p {
      margin-bottom: 0.5rem;
    }
    
    .finding-details code {
      background: #f3f4f6;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.875rem;
    }
    
    .recommendation {
      background: #f0fdf4;
      padding: 1rem;
      border-radius: 0.375rem;
      margin: 1rem 0;
    }
    
    .recommendation h4 {
      color: #166534;
      margin-bottom: 0.5rem;
    }
    
    .evidence-details {
      margin-top: 1rem;
    }
    
    .evidence-details summary {
      cursor: pointer;
      color: #6b7280;
      font-size: 0.875rem;
    }
    
    .evidence-details pre {
      margin-top: 0.5rem;
      background: #f9fafb;
      padding: 1rem;
      border-radius: 0.375rem;
      overflow-x: auto;
      font-size: 0.75rem;
    }
    
    footer {
      text-align: center;
      color: #6b7280;
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }
    
    .copy-button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
    
    .copy-button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🛡️ VulnAgent Security Report</h1>
      <p>AI-Powered Vulnerability Assessment</p>
    </header>
    
    <div class="summary">
      <h2>Scan Summary</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${result.findings.length}</div>
          <div class="stat-label">Total Findings</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${severityCounts.critical + severityCounts.high}</div>
          <div class="stat-label">Critical/High</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${result.stepsExecuted}</div>
          <div class="stat-label">AI Steps Executed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(result.duration / 1000).toFixed(1)}s</div>
          <div class="stat-label">Scan Duration</div>
        </div>
      </div>
      
      <div class="severity-chart">
        <strong>Severity Distribution:</strong>
        ${Object.entries(severityCounts).map(([severity, count]) => `
          <div class="severity-item">
            <div class="severity-dot" style="background: ${severityColors[severity as keyof typeof severityColors]}"></div>
            <span>${severity}: ${count}</span>
          </div>
        `).join('')}
      </div>
      
      <p style="margin-top: 1rem;">
        <strong>Target:</strong> ${result.targetUrl}<br>
        <strong>Session ID:</strong> ${result.sessionId}<br>
        <strong>Scan Date:</strong> ${new Date().toLocaleString()}
      </p>
      
      <button class="copy-button" onclick="copyMarkdown()">Copy as Markdown</button>
    </div>
    
    ${result.findings.length > 0 ? `
      <div class="findings">
        <h2>Vulnerability Findings</h2>
        ${findingCards}
      </div>
    ` : `
      <div class="summary">
        <h2>No Vulnerabilities Found</h2>
        <p>The AI agent completed ${result.stepsExecuted} steps but did not identify any security vulnerabilities in the target application.</p>
      </div>
    `}
    
    <footer>
      <p>Generated by VulnAgent - LLM-Native Security Scanner</p>
      <p>🤖 Powered by AI • 100% Rule-Free • Adaptive Testing</p>
    </footer>
  </div>
  
  <script>
    function copyMarkdown() {
      const markdown = generateMarkdown();
      navigator.clipboard.writeText(markdown).then(() => {
        alert('Report copied to clipboard as Markdown!');
      });
    }
    
    function generateMarkdown() {
      const result = ${JSON.stringify(result)};
      let md = '# VulnAgent Security Report\\n\\n';
      md += '## Summary\\n\\n';
      md += \`- **Target**: \${result.targetUrl}\\n\`;
      md += \`- **Total Findings**: \${result.findings.length}\\n\`;
      md += \`- **AI Steps**: \${result.stepsExecuted}\\n\`;
      md += \`- **Duration**: \${(result.duration / 1000).toFixed(1)}s\\n\\n\`;
      
      if (result.findings.length > 0) {
        md += '## Findings\\n\\n';
        result.findings.forEach((finding, i) => {
          md += \`### \${i + 1}. \${finding.description}\\n\\n\`;
          md += \`- **Type**: \${finding.type}\\n\`;
          md += \`- **Severity**: \${finding.severity}\\n\`;
          md += \`- **URL**: \${finding.url}\\n\`;
          if (finding.parameter) md += \`- **Parameter**: \${finding.parameter}\\n\`;
          if (finding.evidence.payload) md += \`- **Payload**: \\\`\${finding.evidence.payload}\\\`\\n\`;
          md += \`- **Confidence**: \${Math.round(finding.confidence * 100)}%\\n\\n\`;
          md += \`**Recommendation**: \${finding.recommendation}\\n\\n\`;
        });
      }
      
      return md;
    }
  </script>
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}