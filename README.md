# Liquid Glass UI

A coding-agent skill and local editor for interactive liquid-glass buttons, switches, sliders, and segmented controls. Design a control in the browser and take its shape, typography, material, and motion into an existing page.

## Product demo

[Watch the 18-second demo · 宣传片 (4K MP4)](https://github.com/EVEDensity/Liquid-Glass-Skill/blob/main/docs/media/liquid-glass-ui-demo.mp4)

The video shows refraction, glass fusion, slider motion, shape editing, and a copied design wired to a calendar's existing previous-month action.

## Try the editor

Run this command from the repository root, then open [the local playground](http://localhost:58423/demo/). The editor runs with Node.js and needs no npm install.

```sh
node scripts/serve.mjs
```

- Click a control to select it. Drag from an empty part of the canvas to select several.
- Choose **Add shape** or **Draw shape**, then edit size, rotation, text, icons, and material in the right sidebar. The canvas toolbar's **T** focuses the selected control's text field.
- Drag the glass circle across a fixed rail to see refraction, or bring it close to another glass surface to see the contours join.
- Click **Copy for AI** in the canvas toolbar and paste the result into your coding agent. **Copy offline JS** in the sidebar exports a local JavaScript module.

## Use it as a skill

Place the folder named `liquid-glass-ui`, with [SKILL.md](SKILL.md) at its root, in your coding agent's skills directory. In Codex, run `$liquid-glass-ui` and name the controls you want to change. If you are still choosing the style, the agent can open the playground and read your next **Copy for AI** selection from the local server.

The clipboard and local skill use the same design configuration and runtime. For pixel comparisons, match the readable backdrop, crop, stage dimensions, placement, browser, and device scale. On arbitrary page content, use the CSS fallback.

[Integrate a button or control selection](references/integration.md) · [Material settings](references/design-system.md) · [Acceptance checks](references/acceptance.md)

## Development

```sh
npm ci
npm test
npm run package
```

The tests use Microsoft Edge or Playwright Chromium. Set `GLASS_BROWSER_PATH` to use a different browser. See the [validation notes](references/validation.md) for coverage.

The package command writes `dist/liquid-glass-ui.zip` with the installable skill, runtime, demo, tests, and documentation. The promotional video is distributed separately from the skill package.

## License

The implementation is [MIT licensed](LICENSE). The project was visually inspired by the public [Good Machines Liquid Glass lab](https://goodmachines.ai/lab/liquid-glass). See the [third-party notices](THIRD_PARTY_NOTICES.md) for asset and dependency attribution.
