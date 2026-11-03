---
name: liquid-glass-ui
description: >-
  Create or restyle interfaces with movable liquid glass: refractive edges, specular rims, frosted or clear surfaces, and shapes that melt together when dragged close. Use for Liquid Glass, Apple-like glass, transparent refractive navigation, glass toolbars, floating controls, dialogs, and players. Includes an independent WebGL2 renderer, the full preset parameter set, native controls, light and dark themes, and accessibility fallbacks.
---

# Liquid Glass UI

Reusable UI skill for refractive glass controls. The visual direction is informed by [Good Machines — Liquid Glass](https://goodmachines.ai/lab/liquid-glass). This project is an independent implementation with original artwork. It is not Apple's implementation and does not include that site's code, images, video, or fonts.

## What to build

Start with the demo layout that matches the request. **Controls** has a glass dock and search button. **Merge test** has a movable circle, a switch, a slider, and a segmented control on a grid. Test glass against both a movable white part and its fixed base.

Use the WebGL2 renderer whenever the backdrop is an image, canvas, or video that this page controls. CSS blur is only the fallback when WebGL2, reduced transparency, or forced colors make refraction unavailable. Neither mode refracts arbitrary DOM behind the canvas.

Do the integration directly. Do not add remote fonts, CDNs, or runtime dependencies.

For a liquid-glass slider, keep the native range input and follow the [slider integration](references/integration.md#liquid-glass-slider). Put fixed bases and rails in the backdrop sampled by the glass. Only freestanding glass, the switch and slider knobs, and the segmented selection belong to the merge field. A base may show through the glass without forming a bridge.

For the milk-to-lens treatment used by the demo, set `scene.setMaterial({ ...PRESETS.apple, clearControls: true })`. Use it consistently across standalone buttons, knobs, and segmented selections. At rest, knobs and segmented selections carry a pale fill. Standalone buttons and lenses transmit the backdrop. Pressing opens the pale fill and increases the optical response, while joined shapes share one rim.

## Workflow

1. **Inspect the app.** Keep existing buttons, links, forms, dialogs, focus order, and keyboard behavior.
2. **Choose the backdrop.** Use an authorized image or `assets/glass-backdrop.svg`. The backdrop needs visible contrast so refraction is readable.
3. **Mount the renderer.** Copy `assets/` into the app, create one full-size canvas, load the source, then call `setSource`, `setMaterial(PRESETS.apple)`, `setShapes`, and `render`. Map each control from its center: `left + width / 2` and `top + height / 2`, relative to the canvas.
4. **Animate every click.** Pointer dragging and arrow keys move a piece. Pressing scales it and strengthens the lens, then eases back. The switch knob slides, the slider updates while dragged, the segment selection moves, and Morph visibly splits or rejoins. Re-render on every animation frame.
5. **Keep text in DOM.** The canvas is decorative and `aria-hidden`. Labels, icons, and buttons sit above it and receive pointer events. Treat a tap on an inner button as activation. On a draggable glass button, start the drag only after a movement threshold and suppress the click once the drag starts.
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
- `setShapes([{ x, y, width, height, radius }])`: center coordinates, up to eight rendered shapes. Overlapping glass shapes share a contour; do not submit base tracks as shapes.
- `setMaterial(values)` accepts any subset of the preset keys.
- `setSource(image | canvas | video)` after the source has pixels. Call it again for every video or canvas frame, then `render()`.
- `render()` draws once. Resize observation is internal; movement still needs an explicit render.
- `destroy()` on unmount. Listen for `glassfallback` and switch to opaque controls.

## Delivery bar

- Text contrast is at least 4.5:1, large text and essential non-text contrast at least 3:1, measured against the worst backdrop.
- Controls are at least 44 by 44 CSS pixels and usable at 320px width.
- Reduced motion, reduced transparency, forced colors, and missing WebGL all leave a readable interface.
- Dragging and arrow keys move the selected piece. Nearby glass surfaces visibly join; rails and inactive tracks keep their own silhouettes.
- Do not claim pixel parity with the reference page or call this an official Apple material.

## Local preview

From this skill root, run `node scripts/serve.mjs` and open `http://localhost:4173/demo/`. `npm install` and `npm test` are development-only. `node scripts/package.mjs` writes `dist/liquid-glass-ui.zip`.

New code and original assets use the [MIT license](LICENSE). Source boundaries are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
