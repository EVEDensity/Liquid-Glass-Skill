---
name: liquid-glass-ui
description: >-
  Create or restyle interfaces with movable liquid glass: refractive edges, specular rims, frosted or clear surfaces, and shapes that melt together when dragged close. Use for Liquid Glass, Apple-like glass, transparent refractive navigation, glass toolbars, floating controls, dialogs, and players. Includes an independent WebGL2 renderer, the full preset parameter set, native controls, light and dark themes, and accessibility fallbacks.
---

# Liquid Glass UI

Reusable UI skill for refractive glass controls. The visual direction is informed by [Good Machines — Liquid Glass](https://goodmachines.ai/lab/liquid-glass). This project is an independent implementation with original artwork. It is not Apple's implementation and does not include that site's code, images, video, or fonts.

## What to build

Put glass on short controls: navigation, toolbars, buttons, cards, and floating actions. Each piece is draggable. Shapes closer than the preset `merge` distance melt into one surface. Long text and complex forms stay on an opaque panel.

Use the WebGL2 renderer whenever the backdrop is an image, canvas, or video that this page controls. CSS blur is only the fallback when WebGL2, reduced transparency, or forced colors make refraction unavailable. Neither mode refracts arbitrary DOM behind the canvas.

Do the integration directly. Do not add remote fonts, CDNs, or runtime dependencies.

## Workflow

1. **Inspect the app.** Keep existing buttons, links, forms, dialogs, focus order, and keyboard behavior.
2. **Choose the backdrop.** Use an authorized image or `assets/glass-backdrop.svg`. The backdrop needs visible contrast so refraction is readable.
3. **Mount the renderer.** Copy `assets/` into the app, create one full-size canvas, load the source, then call `setSource`, `setMaterial(PRESETS.apple)`, `setShapes`, and `render`. Map each control from its center: `left + width / 2` and `top + height / 2`, relative to the canvas.
4. **Make every glass control movable and pressable.** Pointer dragging and arrow keys update position. A button press animates `press` from 0 to 1, scaling the shape and strengthening its lens, then releases back to 0. Re-render after every move, press frame, scroll, and resize. Nearby shapes use the preset merge distance; do not draw them as separate CSS blobs.
5. **Keep text in DOM.** The canvas is decorative and `aria-hidden`. Labels, icons, and buttons sit above it and receive pointer events. Inner buttons must not start a drag.
6. **Verify.** Check dragging, merging, keyboard movement, light and dark theme, 320px width, reduced transparency, forced colors, and the no-WebGL fallback.

Read [references/design-system.md](references/design-system.md) before choosing materials, [references/integration.md](references/integration.md) for the API, and [references/acceptance.md](references/acceptance.md) before delivery.

## Presets

`PRESETS` is exported by `assets/liquid-glass-renderer.js`. Start with `apple` unless the user names another preset. These are this project's tuned starting values, not published Apple constants.

```js
import { GlassScene, PRESETS } from "./assets/liquid-glass-renderer.js";

const scene = new GlassScene(canvas);
scene.setMaterial(PRESETS.apple);
```

`PRESETS.apple` is:

```json
{
  "name": "Apple Liquid Glass",
  "refraction": 18,
  "bezel": 20,
  "magnify": 1,
  "dispersion": 0.04,
  "edge": "convex",
  "sizeScale": true,
  "blur": 6,
  "frost": 0.1,
  "vibrancy": 1.35,
  "brightness": 0.02,
  "dim": 0,
  "appearance": "auto",
  "pickup": 0.35,
  "tintAmount": 0,
  "tint": "#e8593c",
  "specular": 0.7,
  "rimWidth": 1.4,
  "lightAngle": -135,
  "shadow": 0.3,
  "merge": 10,
  "interactive": true
}
```

Also ship `clear`, `thick`, `frosted`, `plain`, and `prism`. Copy and paste must preserve every key. `edge` is `convex` or `lip`. `appearance` is `auto`, `light`, or `dark`. Distances are CSS pixels; the renderer converts device pixels.

## Renderer contract

- `new GlassScene(canvas, options)`; read `.available` before use.
- `setShapes([{ x, y, width, height, radius }])`: center coordinates, at most 12 shapes. Overlapping shapes form one merged field.
- `setMaterial(values)` accepts any subset of the preset keys.
- `setSource(image | canvas | video)` after the source has pixels. Call it again for every video or canvas frame, then `render()`.
- `render()` draws once. Resize observation is internal; movement still needs an explicit render.
- `destroy()` on unmount. Listen for `glassfallback` and switch to opaque controls.

## Delivery bar

- Text contrast is at least 4.5:1, large text and essential non-text contrast at least 3:1, measured against the worst backdrop.
- Controls are at least 44 by 44 CSS pixels and usable at 320px width.
- Reduced motion, reduced transparency, forced colors, and missing WebGL all leave a readable interface.
- Dragging and arrow keys move the selected piece. Pieces within `merge` pixels visibly join.
- Do not claim pixel parity with the reference page or call this an official Apple material.

## Local preview

From this skill root, run `node scripts/serve.mjs` and open `http://localhost:4173/demo/`. `npm install` and `npm test` are development-only. `node scripts/package.mjs` writes `dist/liquid-glass-ui.zip`.

New code and original assets use the [MIT license](LICENSE). Source boundaries are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
