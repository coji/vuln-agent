#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInitCommand } from './commands/init.js'
import { createScanCommand } from './commands/scan.js'

// Get package.json version
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../../package.json'), 'utf-8'),
)

const program = new Command()

program
  .name('vuln-agent')
  .description(
    'LLM-powered vulnerability scanner for web applications and code',
  )
  .version(packageJson.version)
  .addCommand(createScanCommand())
  .addCommand(createInitCommand())

// Parse without default behavior to force subcommand usage

program.parse()
