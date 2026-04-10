# Gantt Chart App

Vite + React + AWS Amplify Gen2 で構築したシンプルなガントチャートアプリです。  
プロジェクトごとにタスクを管理し、ガントチャートで視覚的に確認できます。
<img width="1032" height="474" alt="image" src="https://github.com/user-attachments/assets/3b3f997d-4ff0-4102-83c8-6b875fa99fd9" />


## 機能

- メール認証によるサインアップ / ログイン (Amazon Cognito)
- プロジェクトの作成・削除
- タスクの追加・編集・削除・並び替え
- ガントチャート上でのドラッグによる日程変更・進捗変更
- Day / Week / Month ビュー切り替え
- モバイル対応 (タッチスクロール・レスポンシブレイアウト)

## 技術スタック

| 区分 | 内容 |
|---|---|
| フロントエンド | Vite + React 18 + TypeScript |
| UI / チャート | gantt-task-react |
| 認証 | Amazon Cognito (メール認証) |
| データベース | Amazon DynamoDB (Amplify Gen2 経由) |
| ホスティング | AWS Amplify Console |

---

## AWS Amplify へのデプロイ

AWS Amplify へデプロイすることで自前のサーバで簡単にホストできます。

### 1. GitHubリポジトリを用意する

このリポジトリをご自身の github にフォークするか新規にリポジトリを作成して push してください。

```bash
git remote add origin https://github.com/<your-username>/gant-chart-react-front.git
git branch -M main
git push -u origin main
```

### 2. Amplify Console でアプリを作成する

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/) を開く
2. **「Create new app」** をクリック
3. **「GitHub」** を選択し、OAuth 認証を許可する
4. リポジトリ `gant-chart-react-front`、ブランチ `main` を選択する
5. Build settings はデフォルトのまま（リポジトリ内の `amplify.yml` が自動検出される）
6. **「Save and deploy」** をクリックする

### 3. デプロイの流れ

Amplify Console が以下を自動で順番に実行します。

```
Backend phase:
  npm ci
  npx ampx pipeline-deploy
    ├─ DynamoDB テーブル (GanttProject / GanttTask) を作成
    ├─ Cognito ユーザープールを作成
    └─ amplify_outputs.json を自動生成

Frontend phase:
  npm run build  (tsc + vite build)
    └─ dist/ を CDN に配信
```

完了後、Amplify Console に表示された URL でアクセスできます。

### 継続的デプロイ

`main` ブランチに push するたびに Amplify Console が自動でビルド・デプロイを実行します。

---

## ローカル開発

### 前提条件

- Node.js (LTS) がインストール済み
- AWS アカウントを持っている
- AWS CLI の認証が設定済み ([参考](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html))

### セットアップ

```bash
# 依存パッケージをインストール
npm ci
```

### サンドボックス起動

Amplify のバックエンド (DynamoDB / Cognito) をローカル開発用に起動します。  
起動すると `amplify_outputs.json` が自動生成されます。

```bash
npx ampx sandbox
```

### フロントエンド起動

別ターミナルで実行してください。

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

### サンドボックスの停止・削除

```bash
npx ampx sandbox delete
```

---

## 注意事項

### `amplify_outputs.json` について

このファイルは Amplify がデプロイ時に自動生成するため、リポジトリには含まれていません (`.gitignore` で除外済み)。ローカル開発時は `npx ampx sandbox` を実行すると生成されます。

### npm audit について

`npm audit` を実行すると脆弱性が表示されますが、すべて `devDependencies` (ビルド時のみ使用するツール) です。プロダクションの bundle には含まれないためエンドユーザーへの影響はありません。

- `@aws-amplify/data-construct` 内の bundled 依存関係 → AWS Amplify 側の修正待ち
- `lodash` in graphql-codegen → 上流待ち
- `minimatch` → `overrides` で 10.2.5 以上に固定済み

`npm audit fix --force` は Amplify の CDK 系パッケージを破壊する可能性があるため実行しないでください。

