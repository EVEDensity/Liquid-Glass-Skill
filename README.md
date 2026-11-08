<div align="center">

# Liquid Glass UI

**Design interactive glass controls and bring them into your web project.**

**English** | [中文](README_CN.md) | [日本語](README_JA.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-d97757)](SKILL.md)
[![Codex](https://img.shields.io/badge/Codex-skill-10a37f)](SKILL.md)

[Demo](#demo) · [Install](#install) · [Use](#use) · [Editor](#try-the-editor) · [Integration](references/integration.md)

</div>

## What it does

Liquid Glass UI is a skill and local editor for designing refractive buttons, switches, sliders, segmented controls, light/dark theme toggles, and other glass surfaces. Adjust a control's shape, text, icon, and material, then bring the design into an existing page while preserving its original layout and actions.

The runtime offers two paths: CSS glass for arbitrary live DOM backgrounds, and WebGL2 refraction when the application can supply the backdrop as readable pixels. CSS blur does not refract or merge arbitrary DOM content.

## Demo

https://github.com/user-attachments/assets/9c0b9150-876c-46cf-9f29-7a22a7e907b4

18-second product demo · [Download the 4K MP4](https://github.com/EVEDensity/Liquid-Glass-Skill/raw/refs/heads/main/docs/media/liquid-glass-ui-demo.mp4)

## Install

Built for coding agents including Claude Code and Codex. The simplest option is to give your agent the repository URL:

```text
Install this skill for me: https://github.com/EVEDensity/Liquid-Glass-Skill
```

Or clone it into the appropriate personal skill directory. The cloned folder must contain `SKILL.md` directly. These commands require Git and access to GitHub; they assume the destination does not already exist.

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

For a project-only Claude Code installation, use `<project>/.claude/skills/liquid-glass-ui/` instead. Start a new session if the installed skill does not appear immediately.

## Use

In the project you want to edit, identify the controls and ask the agent to preserve their behavior.

**Claude Code**

```text
/liquid-glass-ui Restyle the previous-month button. Open the editor so I can choose a design; keep the existing background and month navigation.
```

**Codex**

```text
Use $liquid-glass-ui to restyle the previous-month button. Open the editor so I can choose a design; keep the existing background and month navigation.
```

| Request | Workflow |
| --- | --- |
| “Let me choose a glass design for my Save button.” | The skill opens the local editor and waits for a selected design before changing the target. |
| “Apply this copied design to my Save button.” | Paste the **Copy for AI** payload; the skill uses the matching runtime and preserves the original action. |
| “Use glass on the calendar's previous-month button.” | Name the target and keep its existing month navigation and background. |

The skill asks for a design when none has been selected. See [SKILL.md](SKILL.md) and the [integration guide](references/integration.md) for the handoff and rendering constraints.

## Try the editor

From the cloned skill directory, run the local server and open [localhost:58423/demo/](http://localhost:58423/demo/). Node.js is required.

```bash
node scripts/serve.mjs
```

1. Select a control, or drag from empty canvas to select several.
2. Choose a material, add or draw a shape, and adjust text, icons, and geometry in the sidebar.
3. Click **Copy for AI** and paste the result into your agent, or use the local handoff. Use **Copy offline JS** for a standalone module.

You can also use the editor's button export to copy a self-contained JavaScript module. It preserves a captured scene in a separate frame and needs WebGL2 for refraction; host content security policy must permit the frame's inline script and styles. See [integration recipes](references/integration.md).

## What you get

| Component | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Agent workflow and design handoff |
| `demo/` | Local glass editor and offline export |
| `assets/` | CSS glass, WebGL2 renderer, and button runtimes |
| [references/](references/integration.md) | Integration, material, and acceptance guidance |

## Requirements and development

Node.js is needed to run the local editor; Git and GitHub access are needed for cloning. WebGL2 is required for texture refraction; CSS glass provides an alternative for live DOM backgrounds. The editor and runtime do not require the Playwright development dependency.

```bash
npm ci
```

```bash
npm test
```

```bash
npm run package
```

Tests use Microsoft Edge or Playwright Chromium. See [validation notes](references/validation.md) for coverage and an isolated test port. The installable archive is `dist/liquid-glass-ui.zip`.

## License and credits

New project code and documentation are [MIT licensed](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for assets and dependencies. The visual direction is inspired by [Good Machines Liquid Glass Lab](https://goodmachines.ai/lab/liquid-glass); this project is independently implemented and is not an official Apple implementation.
