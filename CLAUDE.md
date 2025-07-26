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

## LLM-Native Architecture Principles

VulnAgentは**完全にLLMネイティブ**なセキュリティツールとして設計されています。以下の原則を徹底してください：

### 1. ルールベース実装の完全排除

- **❌ 禁止事項**:
  - 正規表現による脆弱性パターンマッチング
  - ハードコードされた脆弱性シグネチャ
  - 事前定義されたペイロードリスト
  - 固定的な診断フロー
  - 静的なルールセット

- **✅ 推奨事項**:
  - LLMによる動的な脆弱性分析
  - コンテキストに基づく適応的テスト
  - LLMが生成する文脈依存のペイロード
  - AIエージェントによる自律的な診断戦略

### 2. Vercel AI SDK Tools中心の設計

```typescript
// ❌ 従来のルールベース実装
const detectXSS = (input: string) => {
  const xssPatterns = [/<script>/i, /javascript:/i, /onerror=/i]
  return xssPatterns.some(pattern => pattern.test(input))
}

// ✅ LLMネイティブな実装
const detectVulnerability = tool({
  description: 'Analyze response for security vulnerabilities using LLM',
  parameters: z.object({
    response: z.object({
      status: z.number(),
      headers: z.record(z.string()),
      body: z.string(),
    }),
    context: z.object({
      previousFindings: z.array(z.string()),
      targetInfo: z.any(),
    })
  }),
  execute: async ({ response, context }) => {
    // LLMが全ての分析を実行
    return await llm.analyze(response, context)
  }
})
```

### 3. 自律的なAIエージェント

- エージェントは100ステップの中で自律的に:
  - 診断戦略を決定
  - 次のアクションを選択
  - ペイロードを生成
  - 結果を評価
  - 戦略を動的に調整

### 4. 実装ガイドライン

1. **脆弱性検出**: すべての検出ロジックをLLMに委譲
2. **ペイロード生成**: LLMが文脈に応じて動的生成
3. **結果評価**: LLMによる包括的な分析
4. **戦略決定**: AIエージェントによる自律的判断

### 5. 既存コードのリファクタリング指針

現在のコードベースには以下のようなルールベース実装が残っています。これらは全て削除またはLLMベースに置き換える必要があります：

- `src/analyzers/pattern-matcher.ts` - 正規表現パターンマッチング → 削除
- `src/rules/default-rules.ts` - 静的ルールセット → 削除
- `src/scanners/vulnerabilities/` - ハードコードされたペイロード → LLM生成に変更

### 6. 例：XSS検出の実装

```typescript
// 完全にLLMに依存した実装
export const createXSSDetector = (llm: LLMProvider) => {
  return {
    detect: async (context: TestContext) => {
      // LLMにコンテキスト全体を渡して分析を依頼
      const analysis = await llm.generateObject({
        prompt: `Analyze this web application context for XSS vulnerabilities...`,
        schema: vulnerabilityAnalysisSchema,
        context: context
      })
      
      // LLMの判断に完全に従う
      return analysis
    }
  }
}
```

## TypeScript and Linting Guidelines

To avoid common lint errors, follow these guidelines:

### Type Safety

- **Never use `any` type** - Use `unknown` or specific types instead
  ```typescript
  // ❌ Don't use any
  const data: any = fetchData()
  
  // ✅ Use unknown or specific types
  const data: unknown = fetchData()
  const userData: UserData = fetchData()
  ```

- **Always initialize variables with types**
  ```typescript
  // ❌ Don't leave uninitialized without type
  let response  // implicitly any
  
  // ✅ Specify type or initialize
  let response: HttpResponse
  ```

- **Use proper type assertions carefully**
  ```typescript
  // ❌ Avoid type assertions when possible
  const server = result as Server
  
  // ✅ Use type guards or proper typing
  if (isServer(result)) {
    const server = result
  }
  ```

### Code Style

- **Use dot notation instead of bracket notation for known properties**
  ```typescript
  // ❌ Don't use bracket notation for known properties
  headers['Cookie'] = value
  
  // ✅ Use dot notation
  headers.Cookie = value
  ```

- **Use template literals instead of string concatenation**
  ```typescript
  // ❌ Don't concatenate strings
  console.log('Result: ' + value + '...')
  
  // ✅ Use template literals
  console.log(`Result: ${value}...`)
  ```

- **Avoid non-null assertions, use optional chaining**
  ```typescript
  // ❌ Don't use non-null assertion
  server!.close()
  
  // ✅ Use optional chaining
  server?.close()
  ```

### Error Handling

- **Use proper error type checking**
  ```typescript
  // ❌ Don't use any for catch blocks
  } catch (error: any) {
    if (error.name === 'AbortError') { ... }
  }
  
  // ✅ Use type guards
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') { ... }
  }
  ```

### Function Parameters

- **Use `unknown[]` instead of `any[]` for spread parameters**
  ```typescript
  // ❌ Don't use any[]
  function log(message: string, ...args: any[]) { }
  
  // ✅ Use unknown[]
  function log(message: string, ...args: unknown[]) { }
  ```

### Before Committing

- **Always run `pnpm lint` before committing** to catch any style issues
- **Run `pnpm validate`** to ensure all checks pass (format, lint, typecheck, tests)
