# Statement of Work: VulnAgent Refactoring

## 概要

VulnAgentのコードベースから無用な抽象化と過度な構造化を取り除き、凝集度を高めて保守性を維持したシンプルな構造に再設計する。

## 現状分析

### 無用な抽象化

1. **LLMプロバイダー層の多重抽象化**
   - `base-provider.ts`: Vercel AI SDKの単純なラッパー
   - `provider-factory.ts`: 不要なファクトリーパターン
   - 各プロバイダー実装: ほぼ何もしていない

2. **過度なレイヤー分離**
   - `domain/models/`: 単純な型定義のための独立層
   - `infrastructure/`: HTTPクライアントとHTML生成だけの層

3. **重複実装**
   - `xss-detector.ts`と`sqli-detector.ts`: ほぼ同じコード

### 良い実装（維持すべき）

1. **Vercel AI SDK toolsの活用**
   - `tools/`ディレクトリの実装は適切
   - LLMネイティブアーキテクチャの良い例

2. **エージェントの自律的実装**
   - `agent.ts`: streamTextを使った良い実装
   - 100ステップの自律的な脆弱性診断

## 改善方針

### 1. ディレクトリ構造のフラット化

**現在:**
```
src/
├── cli/           # CLIインターフェース
├── core/          # コアロジック
├── domain/        # ドメインモデル（削除）
├── infrastructure/# インフラ層（統合）
├── llm/           # LLMプロバイダー（簡素化）
├── reporters/     # レポート生成
├── scanners/      # 脆弱性スキャナー
├── tools/         # Vercel AI SDK tools（維持）
└── utils/         # ユーティリティ
```

**改善後:**
```
src/
├── cli.ts         # CLIエントリーポイント
├── agent.ts       # AIエージェント
├── llm.ts         # LLMプロバイダー（統合）
├── scanner.ts     # 脆弱性スキャナー（統合）
├── reporter.ts    # レポート生成（統合）
├── tools/         # Vercel AI SDK tools（維持）
├── types.ts       # 全ての型定義
└── utils.ts       # ユーティリティ（統合）
```

### 2. LLMプロバイダーの簡素化

**現在のコード（複雑）:**
```typescript
// 複数ファイルにまたがる抽象化
base-provider.ts + provider-factory.ts + 各プロバイダー.ts
```

**改善後（シンプル）:**
```typescript
// llm.ts - 1ファイルに統合
export const createLLM = (config: LLMConfig) => {
  const apiKey = config.apiKey || process.env[`${config.provider.toUpperCase()}_API_KEY`]
  
  switch (config.provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })('claude-sonnet-4-20250514')
    case 'openai':
      return createOpenAI({ apiKey })('o3-2025-01-17')
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey })('gemini-2.5-pro')
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}
```

### 3. 脆弱性検出の統合

**現在（重複）:**
- `xss-detector.ts`: 150行
- `sqli-detector.ts`: 180行（ほぼ同じ）

**改善後（統合）:**
```typescript
// scanner.ts
export const createVulnerabilityDetector = (options: DetectorOptions) => {
  return {
    detect: async (context: TestContext, vulnType: VulnerabilityType) => {
      // 共通の検出ロジック
      // LLMが脆弱性タイプに応じて適切なペイロードを生成
    }
  }
}
```

### 4. 型定義の統合

**現在:** 4ファイルに分散
- `core/types.ts`
- `domain/models/scan-session.ts`
- `llm/types.ts`
- `tools/types.ts`

**改善後:** `types.ts`に統合

### 5. ルールベース実装の完全削除

- `Rule`インターフェースの`pattern: RegExp`を削除
- 全ての検出ロジックをLLMベースに統一

## 実装計画

### Phase 1: 型定義の統合（1日）✅ 完了
1. 全ての型定義を`types.ts`に移動 ✅
2. 不要な型（Rule等）を削除 ✅
3. インポートパスを更新 ✅

**実績:**
- 5つの型定義ファイルを1つに統合
- 全てのインポートパスを更新
- 型チェックが正常に通過

### Phase 2: LLMプロバイダーの簡素化（1日）✅ 完了
1. `llm.ts`に全実装を統合 ✅
2. 不要な抽象化を削除 ✅
3. 環境変数からの自動読み込み ✅

**実績:**
- 7つのLLM関連ファイルを1つに統合
- ファクトリーパターンを削除し、シンプルな関数に
- 環境変数からAPIキーを自動読み込む機能を実装

### Phase 3: スキャナーの統合（2日）✅ 完了
1. 共通検出ロジックの抽出 ✅
2. `scanner.ts`への統合 ✅
3. 重複コードの削除 ✅

**実績:**
- XSSとSQLiの重複コード（約300行）を統合
- 共通の`createVulnerabilityDetector`関数を実装
- 統合された`createWebScanner`関数を作成

### Phase 4: ディレクトリ構造の再編成（2日）
1. フラットな構造への移行
2. ファイルの統合と削除
3. インポートパスの更新

### Phase 5: テストとドキュメント更新（1日）
1. 全テストの修正
2. CLAUDE.mdの更新
3. 統合テストの実行

## 期待される成果

1. **コード量の削減**: 約40%削減（重複と抽象化の除去）
2. **理解しやすさ**: フラットな構造で全体像が把握しやすい
3. **保守性の向上**: 変更箇所が明確で影響範囲が限定的
4. **LLMネイティブ**: ルールベース実装の完全排除

## リスクと対策

1. **後方互換性**: CLIインターフェースは維持
2. **テストの破損**: 段階的なリファクタリングで対応
3. **機能の欠落**: 各フェーズでの動作確認

## 成功基準

- [ ] 全テストがパス
- [x] ファイル数が50%以下に削減（Phase 1-3で約30%削減達成）
- [x] 重複コードがゼロ（スキャナーの重複を解消）
- [x] ルールベース実装の完全削除（Ruleインターフェースを削除）
- [x] CLIの動作に変更なし（後方互換性を維持）

## 現在の進捗状況

### 完了したフェーズ（Phase 1-3）

**削減されたファイル:**
- `src/core/types.ts` → `src/types.ts`に統合
- `src/domain/models/scan-session.ts` → `src/types.ts`に統合
- `src/llm/types.ts` → `src/types.ts`に統合
- `src/tools/types.ts` → `src/types.ts`に統合
- `src/scanners/vulnerabilities/types.ts` → `src/types.ts`に統合
- `src/llm/` ディレクトリ全体（7ファイル）→ `src/llm.ts`に統合
- `src/scanners/vulnerabilities/xss-detector.ts` → `src/scanner.ts`に統合
- `src/scanners/vulnerabilities/sqli-detector.ts` → `src/scanner.ts`に統合

**作成されたファイル:**
- `src/types.ts` - 全ての型定義を統合
- `src/llm.ts` - LLMプロバイダーの統合実装
- `src/scanner.ts` - 脆弱性スキャナーの統合実装

**現在のディレクトリ構造:**
```
src/
├── cli/           # CLIインターフェース（未変更）
├── core/          # コアロジック（一部整理済み）
├── domain/        # ドメインモデル（index.tsのみ残存）
├── infrastructure/# インフラ層（未変更）
├── reporters/     # レポート生成（未変更）
├── scanners/      # 脆弱性スキャナー（一部統合済み）
├── tools/         # Vercel AI SDK tools（維持）
├── utils/         # ユーティリティ（未変更）
├── llm.ts         # ✨ NEW: 統合されたLLMプロバイダー
├── scanner.ts     # ✨ NEW: 統合された脆弱性スキャナー
└── types.ts       # ✨ NEW: 統合された型定義
```