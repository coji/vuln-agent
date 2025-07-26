import type { AnalysisResult } from '../../core/types.js'

export const displayProgress = (message: string) => {
  process.stdout.write(`\r\x1b[K${message}`)
}

export const displayProgressDone = () => {
  process.stdout.write('\n')
}

export const displayBanner = () => {
  console.log(`
\x1b[35m╦  ╦╦ ╦╦  ╔╗╔  ╔═╗╔═╗╔═╗╔╗╔╔╦╗
\x1b[35m╚╗╔╝║ ║║  ║║║  ╠═╣║ ╦║╣ ║║║ ║ 
\x1b[35m ╚╝ ╚═╝╩═╝╝╚╝  ╩ ╩╚═╝╚═╝╝╚╝ ╩ \x1b[0m
\x1b[90mLLM-powered vulnerability scanner\x1b[0m
`)
}

export const displayScanStart = (target: string, mode: string) => {
  console.log(`\n🔍 Starting ${mode} scan on: \x1b[36m${target}\x1b[0m\n`)
}

export const displayScanComplete = (result: AnalysisResult) => {
  console.log(`\n✅ Scan complete!\n`)
  console.log(`📊 Summary:`)
  console.log(`   Files scanned: ${result.scannedFiles}`)
  console.log(`   Vulnerabilities found: ${result.vulnerabilities.length}`)
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s\n`)
}

export const formatSeverity = (severity: string): string => {
  const colors: Record<string, string> = {
    critical: '\x1b[31m', // red
    high: '\x1b[33m', // yellow
    medium: '\x1b[35m', // magenta
    low: '\x1b[36m', // cyan
    info: '\x1b[90m', // gray
  }

  const color = colors[severity.toLowerCase()] || '\x1b[0m'
  return `${color}${severity.toUpperCase()}\x1b[0m`
}
