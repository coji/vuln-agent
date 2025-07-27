# Vulnerable Test Application

This is a deliberately vulnerable web application designed for testing VulnAgent.

## ⚠️ WARNING

**This application contains intentional security vulnerabilities!**
- Only run in a safe, isolated environment
- Never deploy to production
- Use only for testing security scanners

## Vulnerabilities Included

1. **Reflected XSS** - Search functionality
2. **SQL Injection** - User lookup endpoint
3. **Stored XSS** - Comments system
4. **Authentication Bypass** - Login form
5. **Information Disclosure** - Debug endpoint

## Running the App

```bash
cd examples/vulnerable-app
pnpm install
pnpm start
```

The app will run on http://localhost:3000

## Testing with VulnAgent

```bash
# From the project root
npx vuln-agent scan http://localhost:3000 --llm claude-sonnet-4 --verbose
```