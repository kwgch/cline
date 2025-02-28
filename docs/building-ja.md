# Cline拡張機能のビルド

このガイドでは、Cline VSCode拡張機能をソースからビルドし、配布用のVSIXパッケージを作成する方法について説明します。

## 前提条件

始める前に、以下がインストールされていることを確認してください：

- [Node.js](https://nodejs.org/)（LTSバージョン推奨）
- [npm](https://www.npmjs.com/)（Node.jsに付属）
- [Git](https://git-scm.com/) と [git-lfs](https://git-lfs.com/)（大容量ファイルストレージ用）
- [Visual Studio Code](https://code.visualstudio.com/)
- [vsce](https://github.com/microsoft/vscode-vsce) - VS Code拡張機能マネージャー

vsceをグローバルにインストールするには：

```bash
npm install -g @vscode/vsce
```

## 開発環境のセットアップ

1. リポジトリをクローンします：

```bash
git clone https://github.com/cline/cline.git
```

2. プロジェクトディレクトリに移動します：

```bash
cd cline
```

3. 拡張機能とwebview UIの両方の依存関係をインストールします：

```bash
npm run install:all
```

## 拡張機能のビルド

Cline拡張機能は主に2つの部分で構成されています：
- コア拡張機能（`src`ディレクトリ内のTypeScriptコード）
- webview UI（`webview-ui`ディレクトリ内のReactアプリケーション）

### 開発ビルド

開発とテスト用：

```bash
npm run compile
```

これにより以下が実行されます：
- TypeScriptによる型チェック
- ESLintの実行
- esbuildによる拡張機能のバンドル

### 本番ビルド

本番ビルドを作成するには：

```bash
npm run package
```

これにより以下が実行されます：
- webview UIのビルド
- TypeScriptによる型チェック
- ESLintの実行
- 最小化を含むesbuildによる本番用拡張機能のバンドル

## VSIXファイルの作成

VSIXファイルは、VS Code拡張機能を配布するためのパッケージ形式です。VSIXファイルを作成するには2つの方法があります：

### 効率化されたパッケージング処理（推奨）

VSIXパッケージを作成するための推奨方法は、効率化されたパッケージングスクリプトを使用することです：

```bash
# すべてのチェックを含む完全ビルド
npm run package:vsix

# 非必須チェックをスキップする高速ビルド
npm run package:vsix:quick
```

効率化されたパッケージングスクリプトには以下の利点があります：
- 再ビルドが必要なコンポーネントを自動的に検出
- 明確なエラーメッセージによる優れたエラー処理
- 非必須チェックをスキップする「パッケージのみ」モードを含む
- プロセスが安全に中断できるようにバックアップを作成

詳細とその他のオプションについては、[VSIXパッケージングノート](./vsix-packaging-notes.md)を参照してください。

### 標準パッケージング処理

または、標準的な処理を使用することもできます：

1. 拡張機能が本番用にビルドされていることを確認します：

```bash
npm run package
```

2. vsceを使用して拡張機能をパッケージ化します：

```bash
vsce package
```

これにより、プロジェクトのルートディレクトリに`claude-dev-3.4.9.vsix`のような名前の`.vsix`ファイルが作成されます（バージョン番号は異なる場合があります）。

### プレリリースVSIXの作成

プレリリースバージョンを作成したい場合：

```bash
vsce package --pre-release
```

または、効率化された処理を使用する場合：

```bash
npm run package:vsix -- --pre-release
```

## VSIXファイルのインストール

VSIXファイルをインストールするには、いくつかの方法があります：

### VS Code UIを使用

1. VS Codeを開きます
2. 拡張機能ビュー（Ctrl+Shift+X）に移動します
3. 拡張機能ビューの右上にある「...」メニューをクリックします
4. 「VSIXからインストール...」を選択します
5. VSIXファイルに移動して選択します

### VS Code CLIを使用

```bash
code --install-extension claude-dev-3.4.9.vsix
```

### vsceを使用

```bash
vsce install claude-dev-3.4.9.vsix
```

## マーケットプレイスへの公開

Cline拡張機能は、公開用に2つのスクリプトを使用しています：

- 通常リリース用：
  ```bash
  npm run publish:marketplace
  ```

- プレリリース用：
  ```bash
  npm run publish:marketplace:prerelease
  ```

これらのコマンドは、VS Code MarketplaceとOpen VSX Registryの両方に拡張機能を公開します。

> **注意：** 公開には両方のマーケットプレイスに対する適切な認証情報と権限が必要です。

## トラブルシューティング

### 一般的な問題

1. **依存関係の欠落**
   - すべての依存関係をインストールするために`npm run install:all`を実行したことを確認してください

2. **ビルドエラー**
   - 特定の問題についてエラーメッセージを確認してください
   - リンティングエラーを確認するために`npm run lint`を実行してください
   - 型エラーを確認するために`npm run check-types`を実行してください

3. **VSIX作成の失敗**
   - `package.json`に必要なフィールドがすべて含まれていることを確認してください
   - `package.json`で参照されているすべてのファイルが存在することを確認してください
   - `.vscodeignore`ファイルが必要なファイルを除外していないことを確認してください

### ヘルプの取得

ここで扱われていない問題が発生した場合は、以下を確認してください：
- [GitHubのissues](https://github.com/cline/cline/issues)
- [Discordコミュニティ](https://discord.gg/cline)に参加する
