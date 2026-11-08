<div align="center">

# Liquid Glass UI

**操作できるガラス UI をデザインし、Web プロジェクトに取り込む。**

[English](README.md) | [中文](README_CN.md) | **日本語**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-d97757)](SKILL.md)
[![Codex](https://img.shields.io/badge/Codex-skill-10a37f)](SKILL.md)

[デモ](#デモ) · [インストール](#インストール) · [使い方](#使い方) · [エディター](#エディターを試す) · [統合ガイド](references/integration.md)

</div>

## できること

Liquid Glass UI は、屈折するボタン、スイッチ、スライダー、セグメントコントロール、ライト/ダークのテーマトグルなどをデザインするための skill とローカルエディターです。形状、テキスト、アイコン、マテリアルを調整し、既存ページのレイアウトと操作を維持しながらデザインを適用できます。

描画方法は 2 つあります。任意のライブ DOM 背景には CSS ガラス、アプリが背景を読み取り可能なピクセルとして提供できる場合には WebGL2 屈折を使います。CSS のぼかしでは、任意の DOM を実際に屈折・融合させることはできません。

## デモ

https://github.com/user-attachments/assets/9c0b9150-876c-46cf-9f29-7a22a7e907b4

18 秒のデモ · [4K MP4 をダウンロード](https://github.com/EVEDensity/Liquid-Glass-Skill/raw/refs/heads/main/docs/media/liquid-glass-ui-demo.mp4)

## インストール

Claude Code、Codex などのコーディングエージェントで利用できます。まずはエージェントにリポジトリ URL を渡す方法が簡単です。

```text
この skill をインストールしてください: https://github.com/EVEDensity/Liquid-Glass-Skill
```

または、個人用の skill ディレクトリにクローンします。クローン先のフォルダー直下に `SKILL.md` が必要です。以下のコマンドには Git と GitHub へのアクセスが必要で、保存先がまだ存在しないことを前提とします。

**Claude Code — macOS / Linux**

```bash
mkdir -p "$HOME/.claude/skills" && git clone https://github.com/EVEDensity/Liquid-Glass-Skill.git "$HOME/.claude/skills/liquid-glass-ui"
```

**Claude Code — Windows PowerShell**

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null; git clone https://github.com/EVEDensity/Liquid-Glass-Skill.git "$env:USERPROFILE\.claude\skills\liquid-glass-ui"
```

**Codex — macOS / Linux**

```bash
mkdir -p "$HOME/.agents/skills" && git clone https://github.com/EVEDensity/Liquid-Glass-Skill.git "$HOME/.agents/skills/liquid-glass-ui"
```

**Codex — Windows PowerShell**

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.agents\skills" | Out-Null; git clone https://github.com/EVEDensity/Liquid-Glass-Skill.git "$env:USERPROFILE\.agents\skills\liquid-glass-ui"
```

Claude Code でプロジェクト単位にインストールする場合は、`<project>/.claude/skills/liquid-glass-ui/` に配置します。インストール後すぐに表示されない場合は、新しいセッションを開始してください。

## 使い方

編集したいプロジェクトを開き、対象のコントロールを指定して既存の操作を維持するよう依頼します。

**Claude Code**

```text
/liquid-glass-ui カレンダーの前月ボタンをガラス風にしてください。エディターを開いてデザインを選ばせてください。背景と月の切り替え機能は維持してください。
```

**Codex**

```text
$liquid-glass-ui を使ってカレンダーの前月ボタンをガラス風にしてください。エディターでデザインを選び、背景と月の切り替え機能を維持してください。
```

| 依頼例 | 動作 |
| --- | --- |
| 「保存ボタンのガラスデザインを先に選びたい」 | skill がローカルエディターを開き、デザイン選択を待ってから対象を変更します。 |
| 「コピーしたデザインを保存ボタンに適用して」 | **Copy for AI** の内容を貼り付けます。skill が対応するランタイムを使い、元の操作を維持します。 |
| 「カレンダーの前月ボタンをガラス風にして」 | 対象を指定し、背景と既存の月移動を維持します。 |

デザインが未選択の場合、skill は先に確認します。受け渡しと描画の制約については [SKILL.md](SKILL.md) と [統合ガイド](references/integration.md) を参照してください。

## エディターを試す

クローンした skill ディレクトリでローカルサーバーを起動し、[localhost:58423/demo/](http://localhost:58423/demo/) を開きます。Node.js が必要です。

```bash
node scripts/serve.mjs
```

1. コントロールをクリックして編集します。空白のキャンバスからドラッグすると複数選択できます。
2. マテリアルを選択し、形状を追加・描画して、サイドバーでテキスト、アイコン、サイズを調整します。
3. **Copy for AI** をクリックして結果をエージェントに貼り付けるか、ローカルの受け渡しを使います。**Copy offline JS** は独立したモジュールを出力します。

エディターでは自己完結型のボタン JavaScript モジュールもコピーできます。取得したシーンは別フレームに保持されます。屈折には WebGL2 が必要で、ホストのコンテンツセキュリティポリシーがフレーム内のインラインスクリプトとスタイルを許可する必要があります。詳しくは [統合例](references/integration.md) を参照してください。

## 含まれるもの

| 内容 | 用途 |
| --- | --- |
| [SKILL.md](SKILL.md) | エージェントの作業手順とデザインの受け渡し |
| `demo/` | ローカルガラスエディターとオフライン出力 |
| `assets/` | CSS ガラス、WebGL2 レンダラー、ボタンのランタイム |
| [references/](references/integration.md) | 統合、マテリアル、受け入れ確認のガイド |

## 動作要件と開発

ローカルエディターには Node.js、クローンには Git と GitHub へのアクセスが必要です。テクスチャの屈折には WebGL2 が必要です。ライブ DOM の背景には CSS ガラスを使えます。エディターとランタイムの使用に Playwright の開発用依存関係は不要です。

```bash
npm ci
```

```bash
npm test
```

```bash
npm run package
```

上記の開発コマンドはリポジトリのソースディレクトリで実行します。テストには Microsoft Edge または Playwright Chromium を使用します。テスト範囲と分離ポートについては [検証メモ](references/validation.md) を参照してください。インストール用アーカイブは `dist/liquid-glass-ui.zip` です。展開したディレクトリで `node scripts/serve.mjs` を実行するとエディターが起動します。

## ライセンスと謝辞

本プロジェクトで新たに作成したコードと文書は [MIT ライセンス](LICENSE) です。アセットと依存関係については [サードパーティ通知](THIRD_PARTY_NOTICES.md) を参照してください。ビジュアルの方向性は [Good Machines Liquid Glass Lab](https://goodmachines.ai/lab/liquid-glass) に着想を得ています。本プロジェクトは独立した実装であり、Apple の公式実装ではありません。
