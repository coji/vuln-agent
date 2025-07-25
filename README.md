# vuln-agent

LLM-powered vulnerability scanner for your codebase. Supports multiple AI providers and can scan local files, directories, and GitHub repositories.

## Features

- 🤖 **Multiple LLM Providers**: OpenAI O3, Anthropic Sonnet 4, Gemini 2.5 Pro/Flash
- 📁 **Flexible Scanning**: Local files, directories, GitHub repos, and URLs
- 🎯 **Dual Detection**: Rule-based and LLM-based vulnerability detection
- 📊 **Multiple Output Formats**: Console, JSON, and Markdown reports
- ⚙️ **Configurable**: Project-specific settings via `.vuln-agentrc.json`
- 🔄 **CI/CD Ready**: GitHub Actions integration

## Installation

```bash
npm install -g vuln-agent
# or
pnpm add -g vuln-agent
```

## Quick Start

### Basic Usage

```bash
# Scan local directory with rule-based detection
vuln-agent ./src

# Scan with LLM
vuln-agent --llm gemini-2.5-flash ./src

# Scan GitHub repository
vuln-agent --llm anthropic-sonnet4 https://github.com/user/repo

# Output as Markdown
vuln-agent --format markdown ./src > report.md
```

### Environment Variables

Set API keys for LLM providers:

```bash
export OPENAI_O3_API_KEY="your-key"
export ANTHROPIC_SONNET4_API_KEY="your-key"
export GEMINI_2_5_PRO_API_KEY="your-key"
export GEMINI_2_5_FLASH_API_KEY="your-key"
export GITHUB_TOKEN="your-token"  # For higher GitHub API rate limits
```

## Configuration

Create `.vuln-agentrc.json` in your project root:

```json
{
  "llm": {
    "provider": "gemini-2.5-flash",
    "temperature": 0.1
  },
  "scan": {
    "extensions": [".js", ".ts", ".jsx", ".tsx", ".py"],
    "ignore": ["node_modules", ".git", "dist", "build"],
    "maxFileSize": 2097152
  },
  "output": {
    "format": "markdown"
  }
}
```

## GitHub Actions

### Basic Setup

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: coji/vuln-agent@v1
        with:
          llm-provider: 'gemini-2.5-flash'
          format: 'markdown'
          comment-on-pr: 'true'
        env:
          GEMINI_2_5_FLASH_API_KEY: ${{ secrets.GEMINI_2_5_FLASH_API_KEY }}
```

### Action Inputs

| Input                     | Description                           | Default                  |
| ------------------------- | ------------------------------------- | ------------------------ |
| `path`                    | Path to scan                          | `.`                      |
| `llm-provider`            | LLM provider to use                   | ``                       |
| `format`                  | Output format (console/json/markdown) | `console`                |
| `extensions`              | File extensions to scan               | `.js,.ts,.jsx,.tsx`      |
| `ignore`                  | Patterns to ignore                    | `node_modules,.git,dist` |
| `fail-on-vulnerabilities` | Fail if vulnerabilities found         | `true`                   |
| `upload-results`          | Upload scan results as artifact       | `false`                  |
| `comment-on-pr`           | Comment results on PR                 | `false`                  |

## CLI Options

```
vuln-agent [options] <target>

Options:
  --llm <provider>     LLM provider (openai-o3, anthropic-sonnet4, gemini-2.5-pro, gemini-2.5-flash)
  --format <format>    Output format (console, json, markdown)
  --extensions <ext>   File extensions to scan (comma-separated)
  --ignore <patterns>  Patterns to ignore (comma-separated)
  -h, --help          Show help
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run validations
pnpm validate
```

## License

ISC
