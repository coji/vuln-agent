# 🛡️ VulnAgent - AI-Powered Web Security Scanner

VulnAgent uses AI to find security vulnerabilities in web applications. No rules, no patterns - just intelligent analysis.

## 🚀 Quick Start

```bash
# 1. Set up your API key and default LLM (one-time setup)
npx vuln-agent init

# 2. Scan any website (uses your default LLM)
npx vuln-agent scan https://example.com
```

That's it! VulnAgent will analyze the site and report any vulnerabilities found.

## 📋 Prerequisites

- Node.js 18+
- An API key from one of these providers:
  - [Anthropic](https://console.anthropic.com/) (Claude)
  - [OpenAI](https://platform.openai.com/)
  - [Google AI Studio](https://aistudio.google.com/) (Gemini)

## 🎯 Basic Usage

### Scan a website

```bash
# Using default LLM (configured during init)
npx vuln-agent scan https://example.com

# Override with a specific LLM
npx vuln-agent scan https://example.com --llm gemini-2.5-flash
```

### Scan localhost

```bash
npx vuln-agent scan http://localhost:3000
```

### Generate HTML report

```bash
npx vuln-agent scan https://example.com -f html
```

### See what the AI is doing

```bash
npx vuln-agent scan https://example.com --verbose
```

### Limit AI agent steps (for faster scans)

```bash
npx vuln-agent scan https://example.com --max-steps 50
```

## 🤖 Supported AI Models

- `claude-sonnet-4` - Anthropic Claude (recommended)
- `openai-o3` - OpenAI GPT
- `gemini-2.5-pro` - Google Gemini Pro
- `gemini-2.5-flash` - Google Gemini Flash (faster, cheaper)

## 🔧 Configuration

### First-time setup (recommended)

```bash
npx vuln-agent init
```

This will:

1. Ask you to select your preferred LLM provider
2. Save the corresponding API key
3. Set your default configuration

After setup, you can scan without specifying the LLM each time!

### Alternative: Environment variables

```bash
export ANTHROPIC_API_KEY=your-key-here
npx vuln-agent scan https://example.com --llm claude-sonnet-4
```

### Configuration file

VulnAgent saves configuration to:

- **Global**: `~/.config/vuln-agent/config.json` (Linux/Mac) or `%APPDATA%/vuln-agent/config.json` (Windows)
- **Local**: `.vulnagentrc.json` in current directory

Example configuration:

```json
{
  "defaultLLM": "gemini-2.5-flash",
  "maxSteps": 200,
  "format": "console",
  "web": {
    "whitelist": []
  },
  "apiKeys": {
    "google": "your-api-key-here"
  }
}
```

## 📊 Output Formats

- **Console** (default) - Human-readable output in terminal
- **JSON** (`-f json`) - Machine-readable format for automation
- **Markdown** (`-f markdown`) - Great for documentation
- **HTML** (`-f html`) - Interactive report with charts

## 🔍 Command Reference

### `vuln-agent scan`

```bash
vuln-agent scan [options] <target>

Options:
  -f, --format <format>    Output format (console|json|markdown|html)
  -l, --llm <provider>     LLM provider (uses default if not specified)
  -w, --whitelist <hosts>  Allowed hosts (comma-separated)
  -s, --max-steps <number> Maximum AI agent steps (default: 100)
  -v, --verbose            Show AI agent actions
  -d, --debug              Show debug information
```

### `vuln-agent init`

```bash
vuln-agent init [options]

Options:
  --non-interactive        Skip interactive setup
  --openai-key <key>       Set OpenAI API key
  --anthropic-key <key>    Set Anthropic API key
  --google-key <key>       Set Google API key
  --local                  Save to current directory
  --global                 Save globally (default)
```

## 🏗️ How It Works

VulnAgent uses AI to:

1. **Explore** - Maps your application structure
2. **Analyze** - Identifies potential vulnerabilities
3. **Test** - Generates and tests attack payloads
4. **Verify** - Confirms findings are real vulnerabilities
5. **Report** - Provides detailed findings with fixes

The AI adapts its strategy based on what it discovers, making it more effective than rule-based scanners.

## 🐛 Debugging

```bash
# Show all debug logs
npx vuln-agent scan https://example.com --debug

# Debug specific modules
DEBUG=vuln-agent:http npx vuln-agent scan https://example.com
DEBUG=vuln-agent:llm,vuln-agent:scanner npx vuln-agent scan https://example.com
```

Available debug namespaces:

- `vuln-agent:cli` - CLI operations
- `vuln-agent:scanner` - Scanner operations
- `vuln-agent:http` - HTTP requests/responses
- `vuln-agent:llm` - LLM interactions
- `vuln-agent:vulnerability` - Vulnerability detection details

## 🧪 Try It Out

We provide a vulnerable test application to demonstrate VulnAgent's capabilities:

```bash
# 1. Start the vulnerable test app
cd examples/vulnerable-app
pnpm install
pnpm start

# 2. In another terminal, scan it with VulnAgent
npx vuln-agent scan http://localhost:3000 -v

# 3. Generate an HTML report
npx vuln-agent scan http://localhost:3000 -f html
```

The test app includes common vulnerabilities like XSS, SQL injection, and authentication bypass. VulnAgent should detect these and provide detailed reports.

⚠️ **Warning**: Only run the test app in a safe, isolated environment!

## 🛠️ Advanced Usage

### For Developers

```bash
# Clone and build from source
git clone https://github.com/coji/vuln-agent.git
cd vuln-agent
pnpm install
pnpm build

# Run from source
node dist/src/cli.js scan https://example.com
```

## ⚠️ Responsible Use

Only scan websites you own or have permission to test. VulnAgent is a powerful tool that should be used responsibly.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Questions?** Open an issue at [github.com/coji/vuln-agent](https://github.com/coji/vuln-agent/issues)
