import type { Rule } from '../core/types.js'

export const defaultRules: Rule[] = [
  {
    id: 'hardcoded-secret',
    name: 'Hardcoded Secret',
    description: 'Detects potential hardcoded secrets or API keys',
    severity: 'high',
    pattern:
      /(?:api[_-]?key|api[_-]?secret|password|secret[_-]?key|token)\s*[:=]\s*["'][\w\-/+=]{20,}["']/gi,
    message:
      'Potential hardcoded secret detected. Use environment variables instead.',
  },
  {
    id: 'sql-injection',
    name: 'SQL Injection',
    description: 'Detects potential SQL injection vulnerabilities',
    severity: 'critical',
    pattern: /(?:query|execute)\s*\(\s*["'`].*?\$\{.*?\}.*?["'`]/gi,
    message:
      'Potential SQL injection vulnerability. Use parameterized queries.',
  },
  {
    id: 'eval-usage',
    name: 'Eval Usage',
    description: 'Detects usage of eval() function',
    severity: 'high',
    pattern: /\beval\s*\(/g,
    message: 'Usage of eval() is dangerous and should be avoided.',
  },
  {
    id: 'weak-crypto',
    name: 'Weak Cryptography',
    description: 'Detects usage of weak cryptographic algorithms',
    severity: 'medium',
    pattern: /\b(md5|sha1)\s*\(/gi,
    message: 'Weak cryptographic algorithm detected. Use SHA-256 or stronger.',
  },
  {
    id: 'insecure-random',
    name: 'Insecure Random',
    description: 'Detects usage of Math.random() for security purposes',
    severity: 'medium',
    pattern: /Math\.random\(\)\s*\*\s*\d+.*(?:token|secret|password|key)/gi,
    message:
      'Math.random() is not cryptographically secure. Use crypto.randomBytes().',
  },
]
