# 🛡️ VulnAgent - LLM-Native Security Scanner

VulnAgent is a **100% LLM-native** web vulnerability scanner that uses AI to autonomously discover and test security vulnerabilities. Unlike traditional scanners that rely on predefined rules and patterns, VulnAgent leverages the power of Large Language Models to adaptively test web applications.

## 🚀 Features

- **Fully LLM-Native**: No hardcoded rules or patterns - all vulnerability detection is powered by AI
- **Autonomous Testing**: AI agent autonomously explores and tests your application with up to 100 intelligent steps
- **Adaptive Strategy**: Dynamically adjusts testing approach based on discoveries
- **Comprehensive Coverage**: Tests for XSS, SQL Injection, Authentication issues, and more
- **Beautiful Reports**: Generates interactive HTML reports with findings and remediation advice
- **Multi-LLM Support**: Works with OpenAI, Anthropic Claude, and Google Gemini

## 📋 Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- An API key for your preferred LLM provider:
  - OpenAI API key
  - Anthropic API key
  - Google API key (for Gemini)

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/coji/vuln-agent.git
cd vuln-agent

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## 🔧 Configuration

Set your LLM provider API key as an environment variable:

```bash
# For OpenAI
export OPENAI_API_KEY=your-api-key

# For Anthropic Claude
export ANTHROPIC_API_KEY=your-api-key

# For Google Gemini
export GOOGLE_API_KEY=your-api-key
```

## 🎯 Usage

### Basic Web Vulnerability Scan

```bash
# Scan a website with your preferred LLM
node dist/src/cli/index.js scan https://example.com --llm anthropic-sonnet4

# Available LLM providers:
# - openai-o3
# - anthropic-sonnet4
# - gemini-2.5-pro
# - gemini-2.5-flash
```

### Scan Options

```bash
vuln-agent scan [options] <target>

Options:
  -m, --mode <mode>        Scan mode (web only for now) (default: "web")
  -f, --format <format>    Output format (console|json|markdown) (default: "console")
  -l, --llm <provider>     LLM provider (required)
  -w, --whitelist <hosts>  Allowed hosts for web scanning (comma-separated)
  -v, --verbose            Show detailed agent actions
  -d, --debug              Show all debug information
  -h, --help               Display help
```

### Output Formats

```bash
# Console output (default)
node dist/src/cli/index.js scan https://example.com --llm anthropic-sonnet4

# JSON output
node dist/src/cli/index.js scan https://example.com --llm anthropic-sonnet4 -f json

# Markdown output
node dist/src/cli/index.js scan https://example.com --llm anthropic-sonnet4 -f markdown
```

### Verbose Mode

```bash
# See what the AI agent is doing at each step
node dist/src/cli/index.js scan https://example.com --llm anthropic-sonnet4 --verbose
```

## 📊 HTML Report

When vulnerabilities are found, VulnAgent automatically generates a comprehensive HTML report with:

- Visual severity distribution
- Detailed findings with evidence
- Remediation recommendations
- Copy-to-markdown functionality

The report is saved as `vuln-report-[timestamp].html` in your current directory.

## 🤖 How It Works

VulnAgent uses a revolutionary **LLM-native architecture** with 7 AI-powered tools:

1. **httpRequest** - Sends intelligent HTTP requests to discover endpoints
2. **analyzeResponse** - Uses AI to analyze responses for vulnerabilities
3. **extractLinks** - Intelligently extracts and categorizes links and endpoints
4. **testPayload** - Generates context-aware vulnerability payloads
5. **reportFinding** - Documents confirmed vulnerabilities with AI analysis
6. **manageTasks** - AI-driven task prioritization and management
7. **updateStrategy** - Dynamically adjusts testing strategy based on findings

The AI agent autonomously:

- Maps your application structure
- Identifies high-value testing targets
- Generates appropriate test payloads
- Adapts to defensive measures (WAFs, filters)
- Provides detailed vulnerability analysis

## 🔍 Example Scan

```bash
# Scan a test application
node dist/src/cli/index.js scan https://juice-shop.herokuapp.com --llm anthropic-sonnet4 --verbose

# Output
🔍 Initializing AI agent with 100 max steps...
🔍 Step 1/100
ℹ️  Agent action: httpRequest - Fetching the target URL to analyze structure
🔍 Step 2/100
ℹ️  Agent action: extractLinks - Identifying endpoints and forms
🔍 Step 3/100
ℹ️  Agent action: analyzeResponse - Checking for security headers and information disclosure
...
✅ Scan completed: 5 vulnerabilities found in 47 steps

# HTML report generated: vuln-report-1234567890.html
```

## 🏗️ Architecture

VulnAgent represents a paradigm shift in security testing:

- **No Rules, Pure AI**: All vulnerability detection logic is handled by LLMs
- **Vercel AI SDK**: Built on top of the Vercel AI SDK for robust tool calling
- **Adaptive Testing**: The agent learns from each response and adjusts its approach
- **Context-Aware**: Generates payloads specific to the technology stack and defenses
- **Extensible**: Easy to add new vulnerability types without writing detection rules

### Testing Phases

The AI agent follows a structured approach:

1. **Reconnaissance** (Steps 1-10): Maps application structure and identifies technologies
2. **Deep Analysis** (Steps 11-40): Tests authentication, forms, and input validation
3. **Advanced Testing** (Steps 41-70): Attempts sophisticated attacks and filter bypasses
4. **Verification** (Steps 71-90): Confirms findings and explores attack chains
5. **Reporting** (Steps 91-100): Finalizes and documents all discoveries

## 🧪 Development

```bash
# Run tests
pnpm test

# Run linter
pnpm lint

# Type checking
pnpm typecheck

# Run all validations
pnpm validate

# Format code
pnpm format:fix
```

### Project Structure

```
vuln-agent/
├── src/
│   ├── core/           # Agent core and prompts
│   ├── tools/          # AI-powered tools
│   ├── domain/         # Domain models
│   ├── scanners/       # Scanner implementations
│   ├── llm/            # LLM provider integrations
│   └── cli/            # CLI interface
├── test/               # Test files
└── docs/               # Documentation
```

## ⚠️ Responsible Use

VulnAgent is designed for:

- Testing your own applications
- Authorized penetration testing
- Security research with permission

**Never use VulnAgent on systems you don't own or lack permission to test.**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

Key areas for contribution:

- Additional LLM provider support
- New vulnerability detection capabilities
- Performance optimizations
- Documentation improvements

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vercel AI SDK](https://sdk.vercel.ai/)
- Inspired by the need for adaptive, intelligent security testing
- Thanks to all contributors and the security community

---

**Note**: VulnAgent is a powerful tool that should be used responsibly. Always ensure you have proper authorization before testing any system.
