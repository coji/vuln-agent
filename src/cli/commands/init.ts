import { Command } from 'commander'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const DEFAULT_CONFIG = `{
  "mode": "web",
  "format": "console",
  "extensions": [".js", ".ts", ".jsx", ".tsx"],
  "ignore": ["node_modules", ".git", "dist", "build"],
  "web": {
    "whitelist": []
  }
}
`

export const createInitCommand = () => {
  return new Command('init')
    .description('Initialize vuln-agent configuration')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      const configPath = path.join(process.cwd(), '.vulnagentrc.json')

      try {
        // Check if config already exists
        if (!options.force) {
          try {
            await fs.access(configPath)
            console.log(
              'Configuration file already exists. Use --force to overwrite.',
            )
            return
          } catch {
            // File doesn't exist, proceed
          }
        }

        // Write config file
        await fs.writeFile(configPath, DEFAULT_CONFIG, 'utf-8')
        console.log('✅ Created .vulnagentrc.json configuration file')
      } catch (error) {
        console.error('Error creating configuration:', error)
        process.exit(1)
      }
    })
}
