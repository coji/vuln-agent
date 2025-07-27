# Contributing to VulnAgent

Thank you for your interest in contributing to VulnAgent! We welcome contributions from the community and are grateful for your support.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/[YOUR_USERNAME]/vuln-agent.git
   cd vuln-agent
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 💻 Development Process

### Prerequisites

- Node.js 18+
- pnpm 10.12.4+
- An LLM API key for testing (OpenAI, Anthropic, or Google)

### Development Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format:fix

# Run all validations
pnpm validate

# Build the project
pnpm build
```

### Project Structure

```
src/
├── agent.ts        # AI agent core
├── cli.ts          # CLI interface
├── llm.ts          # LLM provider integrations
├── scanner.ts      # Vulnerability scanner
├── reporter.ts     # Report generation
├── tools/          # AI-powered tools
├── types.ts        # TypeScript types
└── utils.ts        # Utilities
```

## 🔧 Making Changes

### LLM-Native Philosophy

VulnAgent is built on a **100% LLM-native architecture**. When contributing:

- **No hardcoded rules**: All vulnerability detection must use LLM analysis
- **No regex patterns**: Use LLM for pattern recognition
- **No static payloads**: Generate payloads dynamically with LLM
- **Adaptive behavior**: Let the AI agent decide strategies

### Code Style

- Use functional programming (no classes)
- Prefer immutability
- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Use the Prettier and Biome configurations

### Adding New Features

1. **New Vulnerability Types**:
   - Add the type to `VulnerabilityType` in `types.ts`
   - The LLM will automatically handle detection

2. **New LLM Providers**:
   - Add the provider type to `LLMProviderType` in `types.ts`
   - Implement the provider in `llm.ts`
   - Update the environment variable mapping

3. **New Tools**:
   - Create a new tool in `src/tools/`
   - Follow the Vercel AI SDK tool pattern
   - Export from `src/tools/index.ts`

### Testing

- Write tests for new features
- Ensure all tests pass before submitting
- Use the mock provider for testing without API keys
- Integration tests go in `test/integration/`
- Unit tests go in `test/unit/`

## 📝 Submitting Changes

1. Ensure your code follows the style guide:

   ```bash
   pnpm validate
   ```

2. Write clear commit messages:

   ```
   feat: add support for XXE vulnerability detection
   fix: improve error handling in HTTP client
   docs: update README with new examples
   ```

3. Push to your fork and create a pull request

4. In your pull request:
   - Describe what changes you've made
   - Explain why the changes are necessary
   - Reference any related issues
   - Include screenshots if applicable

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

- Your environment (OS, Node.js version, pnpm version)
- The LLM provider you're using
- Steps to reproduce the issue
- Expected vs actual behavior
- Any error messages or logs

### Feature Requests

For feature requests:

- Explain the use case
- Describe the desired behavior
- Consider how it fits with the LLM-native approach
- Discuss potential implementation approaches

## 📚 Documentation

- Update the README.md for user-facing changes
- Update CLAUDE.md for development guidance
- Add JSDoc comments for new functions
- Include examples in your documentation

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:

1. **New LLM Provider Support**:
   - AWS Bedrock integration
   - Azure OpenAI support
   - Local LLM support (Ollama, etc.)

2. **Enhanced Detection Capabilities**:
   - More vulnerability types
   - Better payload generation
   - Improved filter bypass techniques

3. **Performance Optimizations**:
   - Parallel scanning
   - Caching mechanisms
   - Token usage optimization

4. **Developer Experience**:
   - Better error messages
   - Interactive mode improvements
   - VS Code extension

5. **Documentation**:
   - More examples
   - Video tutorials
   - Best practices guide

## 🙏 Recognition

Contributors will be:

- Listed in the project README
- Mentioned in release notes
- Given credit in commit messages

## 💬 Getting Help

- Open an issue for bugs or features
- Join discussions in GitHub Discussions
- Tag @coji in your pull requests

Thank you for contributing to making the web more secure with AI! 🛡️
