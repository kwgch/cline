# 拡張開発サーバー

このドキュメントでは、Clineの拡張開発サーバー機能の使用方法について説明します。この機能は、頻繁な再ビルドの必要性を減らすことで開発ワークフローを改善します。

## 概要

拡張開発サーバーは以下の機能を提供します：

1. **ホットモジュールリプレイスメント（HMR）** - コードの変更が自動的に適用され、ページの完全な再読み込みが不要になります。
2. **開発プロキシサーバー** - ブラウザと開発サーバーの間に位置するプロキシサーバーで、デバッグとHMRを可能にします。
3. **選択的再ビルドによるウォッチモード** - ファイルウォッチャーが指定されたディレクトリを監視し、関連するファイルが変更された場合にのみ再読み込みをトリガーします。

## 開発サーバーの使用方法

### 開発サーバーの起動

`DevServerManager`クラスを使用して開発サーバーを起動できます：

```typescript
import { DevServerManager, DevServerType } from "../integrations/dev-server";
import { TerminalManager } from "../integrations/terminal/TerminalManager";

// ターミナルマネージャーを作成
const terminalManager = new TerminalManager();

// 開発サーバーマネージャーを作成
const devServerManager = new DevServerManager(terminalManager);

// 開発サーバーを起動
const serverInfo = await devServerManager.startServer({
  name: "My App",
  cwd: "/path/to/project",
  command: "npm run dev",
  type: DevServerType.React, // その他のタイプ: Node, Vue, Angular, Next, Vite, Webpack, Custom
  port: 3000, // 開発サーバーが実行されるポート
  watchPaths: ["/path/to/project/src"], // 変更を監視するディレクトリ
  proxyEnabled: true, // プロキシサーバーを有効にする
  proxyPort: 3001, // プロキシサーバーのポート
  hotReloadEnabled: true, // ホットモジュールリプレイスメントを有効にする
});

// サーバーURLはserverInfo.urlで利用可能
console.log(`サーバーが${serverInfo.url}で実行中`);
```

### 開発サーバーの停止

開発サーバーを停止するには：

```typescript
await devServerManager.stopServer(serverInfo.id);
```

### 開発サーバーの再読み込み

開発サーバーの再読み込みをトリガーするには：

```typescript
await devServerManager.reloadServer(serverInfo.id);
```

### サーバー情報の取得

実行中のすべてのサーバーに関する情報を取得するには：

```typescript
const servers = devServerManager.getAllServers();
```

特定のサーバーに関する情報を取得するには：

```typescript
const server = devServerManager.getServer(serverId);
```

ステータスによってサーバーを取得するには：

```typescript
const runningServers = devServerManager.getServersByStatus(DevServerStatus.Running);
```

## 設定オプション

開発サーバーを起動する際に、以下のオプションを設定できます：

| オプション | 型 | 説明 |
|--------|------|-------------|
| `name` | string | サーバーの名前 |
| `cwd` | string | サーバーの作業ディレクトリ |
| `command` | string | サーバーを起動するコマンド |
| `type` | DevServerType | サーバーのタイプ（Node, React, Vue, Angular, Next, Vite, Webpack, Custom） |
| `port` | number | サーバーが実行されるポート |
| `watchPaths` | string[] | 変更を監視するディレクトリ |
| `proxyEnabled` | boolean | プロキシサーバーを有効にするかどうか |
| `proxyPort` | number | プロキシサーバーのポート |
| `hotReloadEnabled` | boolean | ホットモジュールリプレイスメントを有効にするかどうか |

## サーバータイプ

以下のサーバータイプがサポートされています：

- `DevServerType.Node` - Node.jsサーバー
- `DevServerType.React` - Reactアプリケーション
- `DevServerType.Vue` - Vue.jsアプリケーション
- `DevServerType.Angular` - Angularアプリケーション
- `DevServerType.Next` - Next.jsアプリケーション
- `DevServerType.Vite` - Viteアプリケーション
- `DevServerType.Webpack` - Webpackアプリケーション
- `DevServerType.Custom` - カスタムサーバータイプ

## サーバーステータス

サーバーは以下のステータスを持つことができます：

- `DevServerStatus.Starting` - サーバーが起動中
- `DevServerStatus.Running` - サーバーが実行中
- `DevServerStatus.Stopping` - サーバーが停止中
- `DevServerStatus.Stopped` - サーバーが停止
- `DevServerStatus.Error` - サーバーがエラーに遭遇

## イベント

`DevServerManager`は以下のイベントを発行します：

- `started` - サーバーが起動したときに発行
- `stopped` - サーバーが停止したときに発行
- `reloaded` - サーバーが再読み込みされたときに発行
- `error` - サーバーがエラーに遭遇したときに発行
- `log` - サーバーがメッセージをログに記録したときに発行

## 例：Reactアプリケーション

Reactアプリケーション用の開発サーバーを起動する例：

```typescript
const serverInfo = await devServerManager.startServer({
  name: "React App",
  cwd: "/path/to/react-app",
  command: "npm start",
  type: DevServerType.React,
  port: 3000,
  watchPaths: ["/path/to/react-app/src"],
  proxyEnabled: true,
  proxyPort: 3001,
  hotReloadEnabled: true,
});
```

## 例：Node.jsサーバー

Node.jsサーバー用の開発サーバーを起動する例：

```typescript
const serverInfo = await devServerManager.startServer({
  name: "Node Server",
  cwd: "/path/to/node-server",
  command: "npm run dev",
  type: DevServerType.Node,
  port: 3000,
  watchPaths: ["/path/to/node-server/src"],
  proxyEnabled: true,
  proxyPort: 3001,
  hotReloadEnabled: true,
});
```

## トラブルシューティング

### 一般的な問題

1. **サーバーが起動しない**
   - コマンドが正しいか確認する
   - 作業ディレクトリが正しいか確認する
   - ターミナル出力でエラーを確認する

2. **ホットリロードが機能しない**
   - `hotReloadEnabled`が`true`に設定されているか確認する
   - `watchPaths`が正しいか確認する
   - プロキシサーバーが有効で正しく設定されているか確認する

3. **プロキシサーバーが機能しない**
   - `proxyEnabled`が`true`に設定されているか確認する
   - `proxyPort`が利用可能か確認する
   - メインサーバーのポートが正しいか確認する

### ヘルプの取得

ここで扱われていない問題が発生した場合は、以下を確認してください：
- [GitHubのissues](https://github.com/cline/cline/issues)
- [Discordコミュニティ](https://discord.gg/cline)に参加する
