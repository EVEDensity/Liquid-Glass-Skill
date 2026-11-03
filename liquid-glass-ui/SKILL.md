---
name: liquid-glass-ui
description: Implement, restyle, or debug interactive liquid glass in web interfaces. Use for refractive buttons, switches, sliders, segmented controls, toolbars, and floating surfaces with press, drag, or merge behavior. Choose CSS glass for arbitrary page content or WebGL2 refraction for a backdrop the app can supply as pixels.
license: MIT
---

# Liquid Glass UI

Work on the target interface and keep its layout, controls, design tokens, and input semantics. Use the demo as a visual reference or regression fixture. Apply glass only to the requested surfaces.

## Choose the rendering path

- **CSS glass** fits arbitrary DOM, text, and scrolling content. Copy `assets/liquid-glass.css` for blur, tint, and a rim. Add `assets/liquid-glass.js` only if the user wants pointer highlights. CSS glass cannot bend or merge backdrop pixels.
- **WebGL2 refraction** fits images, video, and canvases controlled by the app. Copy `assets/liquid-glass-renderer.js` and `assets/mount-liquid-glass.js`. Keep the actual controls in HTML above an `aria-hidden` canvas. Use the app's original layout and a permitted backdrop.
- **Glass plus an opaque fallback** fits readability or browser constraints. Handle reduced transparency, forced colors, and WebGL context loss. Give the fallback the same native actions and usable contrast.

Read [integration](references/integration.md) for runnable wiring and the shape API. Read [materials](references/design-system.md) when selecting presets or treating different control states. Use [acceptance](references/acceptance.md) to verify the target interface.

## Implement and check

1. Inspect the target markup, source backdrop, stacking order, and native input behavior. Keep actions and labels outside the decorative canvas.
2. Choose the reference states that matter for this component. Separate idle, hold, travel, and release. A clear lens can stay transparent at rest. A selector can use a pale resting fill and reveal its track on hold.
3. In WebGL, use one stage-local canvas. Map the actual visible glass outline to its center and dimensions. Submit only glass to the merge field. Fixed rails and bases can be sampled as background layers without joining the glass contour.
4. Drive shape updates from the app's input and animation state. Keep track positions and hit targets stable. Apply stretch along the direction of travel and ease it out after release. Honor reduced motion.
5. Check the actual target page with contrasting backdrop detail. Inspect idle, press, travel, and release as applicable. Verify keyboard and touch operation, mobile layout, and a readable fallback. Mention any visual or browser limits supported by the checks.

Run `node scripts/serve.mjs` from this folder and open `http://localhost:4173/demo/` to try the bundled switch, slider, segmented control, and lens with six presets. The materials are independently implemented and tuned against the public Good Machines demo.
