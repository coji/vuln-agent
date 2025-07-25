#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createScanCommand } from './commands/scan.js'
import { createInitCommand } from './commands/init.js'

// Get package.json version
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
)

const program = new Command()

program
  .name('vuln-agent')
  .description('LLM-powered vulnerability scanner for web applications and code')
  .version(packageJson.version)
  .addCommand(createScanCommand())
  .addCommand(createInitCommand())

// Default action when no command is specified
program
  .argument('[target]', 'Target URL or file/directory path')
  .option('--mode <mode>', 'Scan mode (code|web)', 'web')
  .option('--format <format>', 'Output format (console|json|markdown)', 'console')
  .option('--llm <provider>', 'LLM provider')
  .option('--extensions <ext>', 'File extensions to scan (comma-separated)')
  .option('--ignore <patterns>', 'Patterns to ignore (comma-separated)')
  .action(async (target) => {
    if (!target) {
      program.help()
      return
    }
    
    // Forward to scan command
    const scanCommand = program.commands.find(cmd => cmd.name() === 'scan')
    if (scanCommand) {
      await scanCommand.parseAsync([target, ...process.argv.slice(3)], { from: 'user' })
    }
  })

program.parse()
