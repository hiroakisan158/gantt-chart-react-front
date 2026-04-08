# デプロイ手順

Vite + React + AWS Amplify Gen2 (DynamoDB / Cognito) 構成のガントチャートアプリを  
AWS Amplify Console にデプロイするための手順です。

---

## 前提条件

- Node.js (LTS) がインストール済み
- AWS アカウントを持っている
- GitHub アカウントを持っている

---

## 1. .gitignore を作成

プロジェクトルートに `.gitignore` を作成します。

```
node_modules/
dist/
amplify_outputs.json
.amplify/
```

---

## 2. Git リポジトリを初期化して GitHub に push

```bash
cd ~/amplify-projects/gant-chart-react-front

git init
git add .
git commit -m "initial commit"
```

GitHub でリポジトリを作成した後（https://github.com/new → 名前: `gant-chart-react-front`）:

```bash
git remote add origin https://github.com/<GitHubユーザー名>/gant-chart-react-front.git
git branch -M main
git push -u origin main
```

---

## 3. Amplify Console でアプリを作成

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/) を開く
2. **「Create new app」** をクリック
3. **「GitHub」** を選択し、リポジトリ `gant-chart-react-front` を選択
4. ブランチ: `main`
5. Build settings は変更不要（リポジトリ内の `amplify.yml` が自動検出される）
6. **「Save and deploy」** をクリック

---

## 4. デプロイの流れ

Amplify Console が以下を自動で順番に実行します。

```
Backend phase:
  npm ci
  npx ampx pipeline-deploy
    └─ DynamoDB テーブル (GanttProject / GanttTask) を作成
    └─ Cognito ユーザープールを作成
    └─ amplify_outputs.json を自動生成

Frontend phase:
  npm run build  (tsc + vite build)
    └─ amplify_outputs.json を参照してビルド
    └─ dist/ を CDN に配信
```

---

## 5. デプロイ後の確認

Amplify Console に表示された URL にアクセスして以下を確認してください。

- [ ] サインアップ・ログインができる
- [ ] プロジェクトを新規作成できる
- [ ] タスクを追加・編集・削除できる
- [ ] ガントチャートが表示される

---

## 6. ローカル開発

Amplify へのデプロイ前にローカルで動作確認したい場合は、サンドボックスを使います。

```bash
# バックエンドのサンドボックスを起動（amplify_outputs.json が生成される）
npx ampx sandbox

# 別ターミナルでフロントエンドを起動
npm run dev
```

サンドボックスを終了する場合:

```bash
npx ampx sandbox delete
```

---

## 7. 構成概要

| リソース | 内容 |
|---|---|
| フロントエンド | Vite + React + TypeScript |
| UI コンポーネント | gantt-task-react |
| 認証 | Amazon Cognito (メール認証) |
| データベース | Amazon DynamoDB (Amplify Gen2 経由) |
| ホスティング | AWS Amplify Console |

### DynamoDB テーブル

**GanttProject**

| フィールド | 型 | 説明 |
|---|---|---|
| id | String (PK) | 自動生成 |
| name | String | プロジェクト名 |
| displayOrder | Int | 表示順 |

**GanttTask**

| フィールド | 型 | 説明 |
|---|---|---|
| id | String (PK) | 自動生成 |
| projectId | String (GSI) | 所属プロジェクト ID |
| name | String | タスク名 |
| start | DateTime | 開始日時 |
| end | DateTime | 終了日時 |
| progress | Float | 進捗 (0〜100) |
| type | String | task / milestone / project |
| dependencies | [String] | 依存タスク ID リスト |
| displayOrder | Int | 表示順 |

---

## 8. 既知の注意事項

### npm audit の脆弱性について

`npm audit` を実行すると脆弱性が表示されますが、**全て devDependencies** (ビルド時のみ使用するツール) です。プロダクションの bundle には含まれないためエンドユーザーへの影響はありません。

- `@aws-amplify/data-construct` 内の bundled 依存関係 → AWS Amplify 側の修正待ち
- `lodash` in graphql-codegen → lodash 4.x に未修正パッチなし (上流待ち)
- `minimatch` → `overrides` で 10.2.5 以上に固定済み

`npm audit fix --force` は Amplify の CDK 系パッケージを破壊する可能性があるため**実行しないこと**。
