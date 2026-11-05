<div align="center">

# Liquid Glass UI

**Design interactive glass controls and bring them into your web project.**

[Demo](#demo) · [Install](#install) · [Use in Codex](#use-in-codex) · [Integration guide](references/integration.md)

</div>

## Demo

https://github.com/user-attachments/assets/9c0b9150-876c-46cf-9f29-7a22a7e907b4

18-second product demo · [Download the 4K MP4](https://github.com/EVEDensity/Liquid-Glass-Skill/raw/refs/heads/main/docs/media/liquid-glass-ui-demo.mp4)

## What it does

Design refractive buttons, switches, sliders, and segmented controls in a local editor. Adjust their geometry, text, icons, and material, then carry the design into an existing page with **Copy for AI** or the Liquid Glass UI skill. The video shows the same workflow ending with an existing calendar button that still changes the month.

## Install

Give your coding agent this prompt. The repository requires GitHub access.

```text
Install this skill for me: https://github.com/EVEDensity/Liquid-Glass-Skill
```

Or install directly into the personal Codex skills directory.

**Windows (PowerShell)**

```powershell
$skillsDir = Join-Path $env:USERPROFILE '.agents/skills'
New-Item -ItemType Directory -Force $skillsDir | Out-Null
git clone https://github.com/EVEDensity/Liquid-Glass-Skill.git (Join-Path $skillsDir 'liquid-glass-ui')
```

**macOS or Linux**

```sh
mkdir -p "$HOME/.agents/skills"
git clone https://github.com/EVEDensity/Liquid-Glass-Skill.git "$HOME/.agents/skills/liquid-glass-ui"
```

## Use in Codex

From the project you want to edit, invoke [`$liquid-glass-ui`](SKILL.md) and name the controls.

```text
Use $liquid-glass-ui to restyle the previous-month button in this project.
Open the editor so I can choose the design. Keep the existing background and click behavior.
```

| Say | What happens |
| --- | --- |
| `Use $liquid-glass-ui for my Save button. Let me choose the design first.` | Codex opens the local playground and waits for your next **Copy for AI** selection. |
| `Use $liquid-glass-ui to apply this copied design to the Save button.` Then paste the clipboard text. | Codex mounts the supplied design using its matching runtime and reconnects the original action. |
| `使用 $liquid-glass-ui，把我选好的样式用到「上月」按钮上，保留背景和翻月功能。` | Codex uses your selected control design and keeps the calendar's existing month navigation. |

## Try the editor

Run from the skill folder and open [the local playground](http://localhost:58423/demo/). It needs Node.js.

```sh
node scripts/serve.mjs
```

1. Click a control to edit it, or drag from empty canvas to select several.
2. Pick a material, add or draw a shape, or adjust the selected control in the right sidebar.
3. Click **Copy for AI** in the canvas toolbar. Paste the result into Codex, or let the active skill read the selection from the local server. Use **Copy offline JS** for a standalone module.

The clipboard and skill use the same design data. For true refraction, supply readable pixels from the target backdrop. Use the CSS fallback for arbitrary DOM content. See the [integration guide](references/integration.md), [material settings](references/design-system.md), and [acceptance checks](references/acceptance.md).

## Development

```sh
npm ci
npm test
npm run package
```

Tests use Microsoft Edge or Playwright Chromium. See the [validation notes](references/validation.md) for coverage and an isolated test port. The installable archive is `dist/liquid-glass-ui.zip`.

## License

[MIT](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md). Visually inspired by the [Good Machines Liquid Glass lab](https://goodmachines.ai/lab/liquid-glass).
