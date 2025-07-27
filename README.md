# 🛡️ VulnAgent - AI-Powered Web Security Scanner

VulnAgent uses AI to find security vulnerabilities in web applications. No rules, no patterns - just intelligent analysis.

## 🚀 Quick Start

```bash
# 1. Set up your API key (one-time setup)
npx vuln-agent init --interactive

# 2. Scan any website
npx vuln-agent scan https://example.com --llm claude-sonnet-4
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
npx vuln-agent scan https://example.com --llm claude-sonnet-4
```

### Scan localhost

```bash
npx vuln-agent scan http://localhost:3000 --llm claude-sonnet-4
```

### Generate HTML report

```bash
npx vuln-agent scan https://example.com --llm claude-sonnet-4 -f html
```

### See what the AI is doing

```bash
npx vuln-agent scan https://example.com --llm claude-sonnet-4 --verbose
```

## 🤖 Supported AI Models

- `claude-sonnet-4` - Anthropic Claude (recommended)
- `openai-o3` - OpenAI GPT
- `gemini-2.5-pro` - Google Gemini Pro
- `gemini-2.5-flash` - Google Gemini Flash (faster, cheaper)

## 🔧 Configuration

### First-time setup (recommended)

```bash
npx vuln-agent init --interactive
```

This saves your API keys so you don't need to set them every time.

### Alternative: Environment variables

```bash
export ANTHROPIC_API_KEY=your-key-here
npx vuln-agent scan https://example.com --llm claude-sonnet-4
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
  -l, --llm <provider>     LLM provider (required)
  -w, --whitelist <hosts>  Allowed hosts (comma-separated)
  -v, --verbose            Show AI agent actions
  -d, --debug              Show debug information
```

### `vuln-agent init`

```bash
vuln-agent init [options]

Options:
  --interactive            Interactive setup mode
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

## 🛠️ Advanced Usage

### For Developers

```bash
# Clone and build from source
git clone https://github.com/coji/vuln-agent.git
cd vuln-agent
pnpm install
pnpm build

# Run from source
node dist/src/cli.js scan https://example.com --llm claude-sonnet-4
```

## ⚠️ Responsible Use

Only scan websites you own or have permission to test. VulnAgent is a powerful tool that should be used responsibly.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Questions?** Open an issue at [github.com/coji/vuln-agent](https://github.com/coji/vuln-agent/issues)
