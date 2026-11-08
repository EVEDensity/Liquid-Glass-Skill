<div align="center">

# Liquid Glass UI

**设计可交互的液态玻璃控件，并将它们带入你的网页项目。**

[English](README.md) | **中文** | [日本語](README_JA.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-d97757)](SKILL.md)
[![Codex](https://img.shields.io/badge/Codex-skill-10a37f)](SKILL.md)

[演示](#演示) · [安装](#安装) · [使用](#使用) · [编辑器](#体验编辑器) · [接入指南](references/integration.md)

</div>

## 项目介绍

Liquid Glass UI 是一套 skill 和本地编辑器，用于设计具有折射效果的按钮、开关、滑杆、分段控件、明暗主题切换开关与其他玻璃界面。你可以调整形状、文字、图标和材质，再将选中的设计应用到已有页面，同时保留原有布局与操作。

运行时提供两种路径：任意实时 DOM 背景使用 CSS 玻璃；当应用能够提供可读取的背景像素时，可使用 WebGL2 折射。CSS 模糊不能真正折射任意 DOM 内容，也不能让它们融合。

## 演示

https://github.com/user-attachments/assets/9c0b9150-876c-46cf-9f29-7a22a7e907b4

18 秒产品演示 · [下载 4K MP4](https://github.com/EVEDensity/Liquid-Glass-Skill/raw/refs/heads/main/docs/media/liquid-glass-ui-demo.mp4)

## 安装

适用于 Claude Code、Codex 等编码助手。最简单的方式是将仓库地址交给助手：

```text
请帮我安装这个 skill：https://github.com/EVEDensity/Liquid-Glass-Skill
```

也可以克隆到个人 skill 目录。克隆后的文件夹内应直接包含 `SKILL.md`。以下命令需要 Git 和 GitHub 访问权限，并假设目标目录尚不存在。

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

如果只想在当前项目中使用 Claude Code，将其放在 `<项目>/.claude/skills/liquid-glass-ui/`。安装后如果没有立即显示，可以开启新会话。

## 使用

进入需要修改的项目，明确指出目标控件，并要求助手保留原有功能。

**Claude Code**

```text
/liquid-glass-ui 把日历的「上个月」按钮改成液态玻璃。打开编辑器让我选择设计，并保留现有背景和翻月功能。
```

**Codex**

```text
使用 $liquid-glass-ui 把日历的「上个月」按钮改成液态玻璃。打开编辑器让我选择设计，并保留现有背景和翻月功能。
```

| 你可以说 | 工作方式 |
| --- | --- |
| “让我先为保存按钮选择玻璃设计。” | Skill 打开本地编辑器，等待你选择设计后再修改目标。 |
| “把这个复制的设计应用到保存按钮。” | 粘贴 **Copy for AI** 的内容，skill 使用匹配的运行时代码并保留原操作。 |
| “给日历的上个月按钮加玻璃效果。” | 指定目标按钮，并保留背景与原有翻月功能。 |

如果尚未选择设计，skill 会先询问。交接数据和渲染限制见 [SKILL.md](SKILL.md) 与 [接入指南](references/integration.md)。

## 体验编辑器

在克隆后的 skill 目录中启动本地服务，并打开 [localhost:58423/demo/](http://localhost:58423/demo/)。需要安装 Node.js。

```bash
node scripts/serve.mjs
```

1. 点击控件进行编辑，或从空白画布拖动以多选。
2. 选择材质，添加或绘制形状，在侧栏调整文字、图标与尺寸。
3. 点击 **Copy for AI**，将结果粘贴给助手，或使用本地交接；点击 **Copy offline JS** 可获取独立模块。

编辑器也可导出自包含的按钮 JavaScript 模块。该导出在独立 frame 中保留捕获的场景；折射需要 WebGL2，宿主的内容安全策略还需允许 frame 内联脚本和样式。详见 [接入示例](references/integration.md)。

## 项目包含

| 内容 | 用途 |
| --- | --- |
| [SKILL.md](SKILL.md) | 编码助手的工作流程和设计交接 |
| `demo/` | 本地玻璃编辑器和离线导出 |
| `assets/` | CSS 玻璃、WebGL2 渲染器和按钮运行时代码 |
| [references/](references/integration.md) | 接入、材质和验收说明 |

## 环境要求与开发

运行本地编辑器需要 Node.js；克隆需要 Git 和 GitHub 访问权限。纹理折射需要 WebGL2，实时 DOM 背景可使用 CSS 玻璃。编辑器和运行时代码不需要安装 Playwright 开发依赖。

```bash
npm ci
```

```bash
npm test
```

```bash
npm run package
```

测试使用 Microsoft Edge 或 Playwright Chromium。测试范围与隔离端口见 [验证说明](references/validation.md)。可安装的压缩包位于 `dist/liquid-glass-ui.zip`。

## 许可与致谢

本项目新增的代码和文档采用 [MIT 许可](LICENSE)；素材与依赖说明见 [第三方声明](THIRD_PARTY_NOTICES.md)。视觉方向受到 [Good Machines Liquid Glass Lab](https://goodmachines.ai/lab/liquid-glass) 启发；本项目独立实现，并非 Apple 官方实现。
