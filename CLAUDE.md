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
