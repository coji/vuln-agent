# VulnAgent LLMネイティブ変革 作業明細書（SOW）

## 1. プロジェクト概要

### 1.1 目的

VulnAgentを完全なLLMネイティブセキュリティツールに変革し、すべてのルールベース実装を排除して、Vercel AI SDK Toolsを基盤とした自律型AIエージェントシステムを構築する。

### 1.2 スコープ

- 既存のルールベース実装の完全削除
- Vercel AI SDK Tools の統合
- 自律型AIエージェントの実装
- 100ステップの自動探索機能
- LLM駆動の脆弱性検出システム

### 1.3 成果物

- LLMネイティブなVulnAgentの完全動作版
- 7つのVercel AI SDK Tools実装
- HTMLレポート生成機能
- 包括的なテストスイート
- ユーザードキュメント

## 2. フェーズ別作業計画

### フェーズ1: ルールベース実装の削除（1週間）

#### ステップ1.1: コードベースのクリーンアップ

**作業内容:**
1. 以下のディレクトリ/ファイルを削除:
   ```bash
   rm -rf src/analyzers/
   rm -rf src/rules/
   ```

2. 依存関係の削除:
   - `src/index.ts` から analyzer関連のエクスポートを削除
   - テストファイルから pattern-matcher, rules への参照を削除

**完了条件:**
- [ ] analyzers/ ディレクトリが削除されている
- [ ] rules/ ディレクトリが削除されている
- [ ] `pnpm typecheck` が成功する

#### ステップ1.2: ハードコードロジックの特定と削除

**作業内容:**
1. `src/scanners/web-scanner.ts` から以下を削除:
   - `checkSecurityHeaders` 関数
   - ハードコードされたヘッダーチェック

2. `src/scanners/vulnerabilities/` 内のハードコードペイロードを特定:
   ```bash
   grep -r "payload\|pattern" src/scanners/vulnerabilities/
   ```

**完了条件:**
- [ ] セキュリティヘッダーのハードコードチェックが削除されている
- [ ] 固定ペイロードリストが特定されている

### フェーズ2: Vercel AI SDK Tools基盤の構築（2週間）

#### ステップ2.1: プロジェクト構造の再編成

**作業内容:**
1. 新しいディレクトリ構造を作成:
   ```bash
   mkdir -p src/tools
   mkdir -p src/domain/models
   mkdir -p src/domain/services
   mkdir -p src/infrastructure/ai/tools
   ```

2. 基本的な型定義を作成:
   ```typescript
   // src/domain/models/scan-session.ts
   export interface ScanSession {
     id: string
     targetUrl: string
     startTime: Date
     currentStep: number
     maxSteps: number
     state: ScanState
   }
   ```

**完了条件:**
- [ ] 新しいディレクトリ構造が作成されている
- [ ] ドメインモデルの基本型が定義されている

#### ステップ2.2: AI SDK統合の準備

**作業内容:**
1. 必要な依存関係を追加:
   ```bash
   pnpm add ai@latest
   ```

2. Tool定義用の基本インターフェースを作成:
   ```typescript
   // src/tools/types.ts
   import { tool } from 'ai'
   import { z } from 'zod'
   
   export interface VulnAgentTool {
     name: string
     tool: ReturnType<typeof tool>
   }
   ```

**完了条件:**
- [ ] Vercel AI SDK がインストールされている
- [ ] Tool用の型定義が作成されている

### フェーズ3: 7つのCore Tools実装（3週間）

#### ステップ3.1: httpRequest Tool

**作業内容:**
1. `src/tools/http-request.ts` を作成:
   ```typescript
   import { tool } from 'ai'
   import { z } from 'zod'
   
   export const httpRequestTool = tool({
     description: 'Send HTTP request to target URL',
     parameters: z.object({
       url: z.string().url(),
       method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
       headers: z.record(z.string()).optional(),
       body: z.string().optional(),
     }),
     execute: async (params) => {
       // HTTPクライアントを使用した実装
     }
   })
   ```

2. レート制限とホワイトリスト機能を実装

**完了条件:**
- [ ] httpRequestTool が実装されている
- [ ] レート制限が機能している
- [ ] ホワイトリストチェックが動作している

#### ステップ3.2: analyzeResponse Tool

**作業内容:**
1. `src/tools/analyze-response.ts` を作成
2. LLMを使用した動的分析ロジックを実装
3. 脆弱性スキーマの定義

**完了条件:**
- [ ] analyzeResponseTool が実装されている
- [ ] LLMによる分析が機能している
- [ ] 構造化された脆弱性レポートが生成される

#### ステップ3.3: extractLinks Tool

**作業内容:**
1. `src/tools/extract-links.ts` を作成
2. LLMベースのエンドポイント抽出
3. SPA検出ロジック

**完了条件:**
- [ ] extractLinksTool が実装されている
- [ ] HTML/JavaScriptからのリンク抽出が機能する
- [ ] APIエンドポイントの推測が動作する

#### ステップ3.4: testPayload Tool

**作業内容:**
1. `src/tools/test-payload.ts` を作成
2. LLMによる動的ペイロード生成
3. 脆弱性判定ロジック

**完了条件:**
- [ ] testPayloadTool が実装されている
- [ ] LLMがコンテキストに応じたペイロードを生成する
- [ ] 脆弱性の判定が正確に行われる

#### ステップ3.5: reportFinding Tool

**作業内容:**
1. `src/tools/report-finding.ts` を作成
2. 構造化された脆弱性レポート機能
3. エビデンス管理

**完了条件:**
- [ ] reportFindingTool が実装されている
- [ ] 詳細な脆弱性情報が記録される
- [ ] エビデンスが適切に保存される

#### ステップ3.6: manageTasks Tool

**作業内容:**
1. `src/tools/manage-tasks.ts` を作成
2. タスク管理ステート実装
3. 優先順位付けロジック

**完了条件:**
- [ ] manageTasksTool が実装されている
- [ ] タスクの追加/更新/完了が機能する
- [ ] LLMによる優先順位付けが動作する

#### ステップ3.7: updateStrategy Tool

**作業内容:**
1. `src/tools/update-strategy.ts` を作成
2. 診断戦略の動的調整
3. 残ステップ管理

**完了条件:**
- [ ] updateStrategyTool が実装されている
- [ ] 戦略が動的に更新される
- [ ] 効率的な診断フローが実現される

### フェーズ4: 自律型AIエージェントの実装（2週間）

#### ステップ4.1: エージェントコアの実装

**作業内容:**
1. `src/core/agent.ts` を作成:
   ```typescript
   export const createVulnAgent = (config: AgentConfig) => {
     return {
       async scan(targetUrl: string) {
         // 100ステップの自律探索ロジック
       }
     }
   }
   ```

2. ステート管理システムの実装
3. Tool実行エンジンの構築

**完了条件:**
- [ ] エージェントが自律的に動作する
- [ ] 100ステップの制限が機能する
- [ ] Toolの選択と実行が適切に行われる

#### ステップ4.2: LLMプロンプトエンジニアリング

**作業内容:**
1. システムプロンプトの設計
2. Tool選択ロジックの最適化
3. コンテキスト管理の実装

**完了条件:**
- [ ] エージェントが適切なToolを選択する
- [ ] コンテキストが保持される
- [ ] 効率的な診断が実行される

### フェーズ5: 既存機能の移行（1週間）

#### ステップ5.1: XSS/SQLi検出の完全LLM化

**作業内容:**
1. 既存のXSS/SQLi検出器を削除
2. LLMベースの新実装:
   ```typescript
   // src/scanners/vulnerabilities/llm-xss-detector.ts
   export const createLLMXSSDetector = (llm: LLMProvider) => {
     return {
       async detect(context: TestContext) {
         // 完全にLLMに依存した実装
       }
     }
   }
   ```

**完了条件:**
- [ ] ハードコードされたペイロードが削除されている
- [ ] LLMが動的にXSSを検出する
- [ ] LLMが動的にSQLiを検出する

#### ステップ5.2: セキュリティヘッダー分析のLLM化

**作業内容:**
1. ハードコードされたヘッダーチェックを削除
2. LLMによる包括的なヘッダー分析

**完了条件:**
- [ ] 固定的なヘッダーリストが削除されている
- [ ] LLMが文脈に応じたヘッダー分析を行う

### フェーズ6: HTMLレポート機能（1週間）

#### ステップ6.1: HTMLジェネレーターの実装

**作業内容:**
1. `src/infrastructure/storage/html-generator.ts` を作成
2. テンプレートエンジンの統合
3. グラフ/チャート機能

**完了条件:**
- [ ] HTMLレポートが生成される
- [ ] 視覚的なダッシュボードが表示される
- [ ] Markdownコピー機能が動作する

#### ステップ6.2: レポートの自動保存

**作業内容:**
1. ファイルシステムへの保存機能
2. エビデンスファイルの管理
3. ブラウザ自動起動オプション

**完了条件:**
- [ ] レポートが自動保存される
- [ ] エビデンスが整理される
- [ ] ブラウザで自動表示される

### フェーズ7: テストとドキュメント（1週間）

#### ステップ7.1: 統合テストの作成

**作業内容:**
1. E2Eテストシナリオの作成
2. モックLLMプロバイダーの改良
3. CI/CD統合

**完了条件:**
- [ ] 主要な診断フローがテストされている
- [ ] テストカバレッジ80%以上
- [ ] CIが正常に動作する

#### ステップ7.2: ドキュメントの更新

**作業内容:**
1. README.mdの全面改訂
2. 使用例の追加
3. APIドキュメントの生成

**完了条件:**
- [ ] LLMネイティブアーキテクチャが説明されている
- [ ] 使用方法が明確である
- [ ] 貢献ガイドラインが更新されている

## 3. リスクと対策

### 3.1 技術的リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| LLM APIのレート制限 | 高 | バックオフとリトライ戦略の実装 |
| LLMの誤検出 | 中 | 複数回の検証と信頼度スコア |
| 実行時間の増加 | 中 | 並列実行とキャッシング |

### 3.2 スケジュールリスク

| リスク | 影響 | 対策 |
|--------|------|------|
| Tool実装の複雑性 | 高 | 段階的な実装とテスト |
| 既存機能の破壊 | 中 | フィーチャーフラグの使用 |

## 4. 受け入れ基準

### 4.1 機能要件

- [ ] すべてのルールベース実装が削除されている
- [ ] 7つのToolsが完全に実装されている
- [ ] 100ステップの自律探索が機能する
- [ ] HTMLレポートが生成される

### 4.2 品質要件

- [ ] テストカバレッジ80%以上
- [ ] TypeScript strictモードでエラーなし
- [ ] `pnpm validate` が成功する
- [ ] ドキュメントが完備している

### 4.3 パフォーマンス要件

- [ ] 中規模サイト（100ページ）を30分以内に診断
- [ ] メモリ使用量512MB以下
- [ ] LLM API呼び出しの最適化

## 5. 実装優先順位

1. **即座に実行（フェーズ1）**
   - ルールベース実装の削除

2. **最優先（フェーズ2-3）**
   - Vercel AI SDK Tools基盤
   - 7つのCore Tools

3. **高優先（フェーズ4）**
   - 自律型AIエージェント

4. **中優先（フェーズ5-6）**
   - 既存機能の移行
   - HTMLレポート

5. **低優先（フェーズ7）**
   - テストとドキュメント

## 6. 推定工期

| フェーズ | 期間 | 累計 |
|---------|------|------|
| フェーズ1 | 1週間 | 1週間 |
| フェーズ2 | 2週間 | 3週間 |
| フェーズ3 | 3週間 | 6週間 |
| フェーズ4 | 2週間 | 8週間 |
| フェーズ5 | 1週間 | 9週間 |
| フェーズ6 | 1週間 | 10週間 |
| フェーズ7 | 1週間 | 11週間 |

**総工期: 11週間**

## 7. 成功指標

1. **技術的成功**
   - 完全なLLMネイティブアーキテクチャ
   - ルールベース実装ゼロ
   - 自律的な脆弱性診断

2. **ビジネス成功**
   - 既知の脆弱性の80%以上を検出
   - 誤検出率10%以下
   - ユーザー満足度の向上

3. **運用成功**
   - メンテナンス性の向上
   - 拡張性の確保
   - コミュニティの成長

## 8. 次のアクション

1. **今すぐ実行**
   ```bash
   git checkout -b feat/llm-native-transformation
   rm -rf src/analyzers/ src/rules/
   git add -A
   git commit -m "chore: remove rule-based implementations"
   ```

2. **今週中に実行**
   - Vercel AI SDK の詳細調査
   - Tool実装の開始
   - テスト環境の準備

3. **継続的に実行**
   - 進捗の週次レビュー
   - ステークホルダーへの報告
   - リスクの監視と対策

---

このSOWに従って、VulnAgentを真のLLMネイティブツールに変革しましょう。
