# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Management

- **Install dependencies**: `pnpm install`
- **Add a dependency**: `pnpm add <package>`
- **Add a dev dependency**: `pnpm add -D <package>`

### Code Quality

- **Format check**: `pnpm format`
- **Format fix**: `pnpm format:fix`
- **Lint**: `pnpm lint`
- **Type checking**: `pnpm typecheck`
- **Run tests**: `pnpm test`
- **Run all validations**: `pnpm validate` (runs format, lint, typecheck, and tests in parallel)

### Testing

- **Run tests**: `pnpm test`
- **Run tests in watch mode**: `pnpm test -- --watch`
- **Run a single test file**: `pnpm test <file-path>`
- **Run integration tests**: `pnpm test:integration`

## CLI Usage

### Debugging

The CLI supports verbose and debug output modes:

- **Verbose mode** (`-v, --verbose`): Shows scanner and vulnerability detection logs
- **Debug mode** (`-d, --debug`): Shows all internal debug logs

Examples:
```bash
# Normal run (minimal output)
node dist/src/cli/index.js scan https://example.com

# Verbose mode (shows what the scanner is doing)
node dist/src/cli/index.js scan https://example.com --verbose

# Debug mode (shows all internal operations)
node dist/src/cli/index.js scan https://example.com --debug

# Debug specific modules using DEBUG environment variable
DEBUG=vuln-agent:xss,vuln-agent:sqli node dist/src/cli/index.js scan https://example.com
```

Available debug namespaces:
- `vuln-agent:cli` - CLI operations
- `vuln-agent:scanner` - Scanner operations
- `vuln-agent:http` - HTTP client operations
- `vuln-agent:llm` - LLM operations
- `vuln-agent:vulnerability` - General vulnerability detection
- `vuln-agent:xss` - XSS detection details
- `vuln-agent:sqli` - SQL injection detection details

## Project Structure

This is a TypeScript project using:

- **Package Manager**: pnpm (v10.12.4)
- **Formatter**: Prettier with organize-imports plugin
- **Linter**: Biome
- **Test Runner**: Vitest
- **Build Tools**: Wrangler (for types), React Router (for type generation), TypeScript

The project appears to be in early stages with minimal source code structure established.

## Coding Style

- **Programming Paradigm**: Use functional programming style exclusively
  - Avoid classes - use functions and closures instead
  - Prefer pure functions and function composition
  - Use higher-order functions for abstraction
  - State management through function closures, not class instances

Example:

```typescript
// ❌ Don't use classes
class TaskManager {
  private tasks: Task[]
  addTask(task: Task) { ... }
}

// ✅ Use functions with closures
const createTaskManager = () => {
  const tasks: Task[] = []
  const addTask = (task: Task) => { ... }
  return { addTask }
}
```

## Important Instructions

- **NEVER use classes** - Always use functions and closures for encapsulation
- **Prefer immutability** - Return new objects/arrays rather than mutating
- **Use TypeScript strict mode** - Ensure type safety throughout the codebase
- **Follow existing patterns** - Check existing code for conventions before implementing
- **Temporary files** - Always create temporary test files in the `.tmp/` directory, never in the project root
  - Example: `.tmp/test-example.js` instead of `test-example.js`
  - The `.tmp/` directory is already in `.gitignore`
