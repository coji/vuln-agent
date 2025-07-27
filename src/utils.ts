import createDebug from 'debug'

// Create debug instances for different modules
export const debug = {
  cli: createDebug('vuln-agent:cli'),
  scanner: createDebug('vuln-agent:scanner'),
  http: createDebug('vuln-agent:http'),
  llm: createDebug('vuln-agent:llm'),
  vulnerability: createDebug('vuln-agent:vulnerability'),
  xss: createDebug('vuln-agent:xss'),
  sqli: createDebug('vuln-agent:sqli'),
}

// Helper function to enable all debug output
export const enableAllDebug = () => {
  createDebug.enable('vuln-agent:*')
}

// Helper function to enable specific debug output
export const enableDebug = (namespaces: string) => {
  createDebug.enable(namespaces)
}

// Logger interface for consistent logging
export interface Logger {
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  debug: (message: string, ...args: unknown[]) => void
}

// Create a logger instance
export const createLogger = (namespace: string): Logger => {
  const debugLog = createDebug(`vuln-agent:${namespace}`)

  return {
    info: (message: string, ...args: unknown[]) => {
      console.log(`ℹ️  ${message}`, ...args)
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`⚠️  ${message}`, ...args)
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`❌ ${message}`, ...args)
    },
    debug: (message: string, ...args: unknown[]) => {
      debugLog(message, ...args)
    },
  }
}

// Console output helpers (for user-facing messages)
export const output = {
  success: (message: string) => console.log(`✅ ${message}`),
  info: (message: string) => console.log(`ℹ️  ${message}`),
  warn: (message: string) => console.log(`⚠️  ${message}`),
  error: (message: string) => console.log(`❌ ${message}`),
  scanning: (message: string) => console.log(`🔍 ${message}`),
  found: (message: string) => console.log(`🎯 ${message}`),
  thinking: (message: string) => process.stdout.write(`🤔 ${message}`),
  tool: (name: string, params?: string) => {
    process.stdout.write(`\r🔧 ${name}`)
    if (params) process.stdout.write(` ${params}`)
    process.stdout.write('\n')
  },
  stream: (chunk: string) => process.stdout.write(chunk),
  clearLine: () => {
    process.stdout.write('\r\x1b[K')
  },
}

// Progress indicators
export const progress = {
  start: (message: string) => {
    process.stdout.write(`⏳ ${message}...`)
  },
  done: () => {
    process.stdout.write(' ✓\n')
  },
  fail: () => {
    process.stdout.write(' ✗\n')
  },
}

// Utility functions
export const parseUrl = (url: string): URL | null => {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}.00s`
}

export const sanitizeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export const calculateSeverityScore = (severity: string): number => {
  switch (severity) {
    case 'critical':
      return 10
    case 'high':
      return 8
    case 'medium':
      return 5
    case 'low':
      return 3
    case 'info':
      return 1
    default:
      return 0
  }
}
