# Liquid Glass visual audit

Baseline: 2026-11-04, Edge, DPR 1. The local baseline was commit `9214bb8` plus the existing working-tree changes to the demo. This audit records observations and leaves the renderer unchanged.

## Reproduce the comparison

1. Open the local demo and the [reference lab](https://goodmachines.ai/lab/liquid-glass). At a 1440 × 1000 browser viewport, the reference canvas is approximately 1100 × 944 CSS px. Set the local viewport to 1100 × 944.
2. Load the same original 1100 × 944 gradient grid with 24 px spacing in both pages. Use the lab's image picker. For the local demo, substitute the grid for the default SVG in the test browser or use it as the renderer's source. Keep the Apple Liquid Glass preset selected. For the isolated Lens comparison, temporarily center the local lens and set it to 200 × 200 CSS px to match the lab.
3. Capture the Lens at rest and the iOS slider at rest, while held, and after release. Match the slider value when comparing final frames. Preserve each UI's own resting dimensions when measuring size change. Keep captures, private shared links, fetched site content, and browser exports out of Git and the release archive. Use the ignored `evidence/` directory for local captures.

## What differs

| Area | Reference lab | Current demo and code |
| --- | --- | --- |
| Lens interior | At default settings, the center softens the grid into a smooth color field while retaining the broader gradient. | The aligned 200 px lens retains a regular grid and offset copies of lines. The shader blends the original sample with four axial taps; it preserves and repeats periodic detail. |
| Rim and depth | A thin directional highlight wraps the contour, including a softer highlight on the opposite side. The rim widens visibly at setting 5. | The dominant highlight reads as a thin outline and has a stronger surrounding dark halo on the test grid. `u_rimWidth` is declared but not used in the shader; rendering at 1.4 and 5 produced identical local canvas output. |
| Control construction | Approximate desktop dimensions: 60 × 39 px switch knob, 60 × 39 px slider knob at rest, 415 px slider track, and 432 px segmented control. The dark segment track retains backdrop detail. | Roughly 45 × 42 px switch knob, 62 × 44 px slider knob, 280 px slider and 360 px segmented control. The CSS switch and segment tracks sit above the refractive canvas, so their opaque fill hides the glass underneath; the slider track stays a straight overlay. |
| Held slider | The knob becomes a broad, clearer lens, approximately 105 × 50 px in the observed frame. The grid and the track can both be seen through it. | The knob grows only slightly and stays milky. The demo scales the whole wrapper by up to 8%; the track scales too, and the CSS thumb fill keeps covering the lens. |
| Background and geometry | Fine canopy detail makes the changes in color and softness legible. The lower panel in the composed scene is a rounded rectangle. | The procedural landscape has large flat regions with little for the lens to sample. A shared half-height radius makes the 220 × 150 px panel capsule-like. Both differences exaggerate the visual gap in default screenshots. |

The public preset values can match while the output differs. The local suite passed 17 checks, including a checkerboard pixel-change test. That check detects whether refraction has an effect, but does not measure its shape, interior softness, or the control's pressed state against the reference.

## Next checkpoint

Start with one slider and one isolated lens on the shared grid. Draw the slider track into the texture sampled by the glass, while retaining the native input above it. Give the knob its own resting and held geometry and material; keep the track fixed during the press. Match the lens's interior softness and tune a directional rim with a working width control. Then repeat the same captures for switch and segment before propagating the recipe into the skill and demo.

Compare grid continuity, rim width, resting and held knob bounds, and return to rest. Use normal, reduced-motion, and no-WebGL runs to check the interaction and fallback. If an effect still cannot be explained by these comparisons, inspect only the relevant public shader or runtime path for diagnosis and record the behavior in original terms. A general HTML/CSS export cannot capture the appearance drawn inside the canvas.
