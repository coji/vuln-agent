export const VULNERABILITY_ANALYSIS_PROMPT = `You are a security expert analyzing code for vulnerabilities. Analyze the following code and identify potential security issues.

Code to analyze:
\`\`\`
{code}
\`\`\`

{context}

Please provide a detailed analysis in the following JSON format:
{
  "vulnerabilities": [
    {
      "type": "Type of vulnerability (e.g., SQL Injection, XSS, etc.)",
      "severity": "critical|high|medium|low|info",
      "description": "Detailed description of the vulnerability",
      "location": {
        "startLine": <number>,
        "endLine": <number>,
        "snippet": "The vulnerable code snippet"
      },
      "recommendation": "How to fix this vulnerability",
      "cwe": "CWE-XXX (if applicable)"
    }
  ],
  "summary": "Overall security assessment",
  "confidence": <0-1, your confidence level in this analysis>
}

Focus on:
1. Injection vulnerabilities (SQL, Command, LDAP, etc.)
2. Authentication and session management flaws
3. Cross-site scripting (XSS)
4. Insecure direct object references
5. Security misconfiguration
6. Sensitive data exposure
7. Missing access controls
8. Cross-site request forgery (CSRF)
9. Using components with known vulnerabilities
10. Insufficient logging and monitoring

Be thorough but avoid false positives. Only report issues you're confident about.`

export const formatPrompt = (code: string, context?: string): string => {
  return VULNERABILITY_ANALYSIS_PROMPT
    .replace('{code}', code)
    .replace('{context}', context ? `Additional context:\n${context}` : '')
}