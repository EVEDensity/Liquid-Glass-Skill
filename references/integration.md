# Integration

## Integrate a copied design

**Copy for AI** provides the design as JSON and names the compatible runtime revision. The local skill reads the same JSON from the playground. Preserve the existing page layout and connect the original actions to the mounted controls.

### Single button (version 2)

Use the modules named in the handoff, then mount the selected button into an existing container.

```js
import { createLiquidGlassButton } from "./glass/glass-button.js";

const source = new Image();
source.src = existingBackdropURL;
await source.decode();

const button = createLiquidGlassButton(container, config, {
  stage, source, requireExact: true
});
button.addEventListener("click", handleClick);
```

`stage` is a positioned ancestor of `container`. Use the host's own readable image or canvas, with the same centered cover crop in the page and renderer. A solid host color can be supplied as a canvas filled with that color. To compare screenshots, match the pixels, stage size, position, browser, and device scale. Use the CSS fallback for page content that cannot be sampled as a texture.

**Copy offline JS** supplies the same button as a self-contained module. Call its `mountLiquidGlassButton(container, options)` export with the same rendering options.

### Moving control or selection (version 3)

Use the modules listed in the handoff and call `mountLiquidGlassReplica(container, config, { backdrop: existingBackdropURL })`. The replica renders into a transparent frame. Await `frame.glassReady` before binding actions to the native controls in the frame. Keep the host image aligned with the replica's sampling crop.

## CSS glass for existing HTML

Copy `assets/liquid-glass.css` and load it once. Add the classes to the app's existing native element.

```html
<link rel="stylesheet" href="./glass/liquid-glass.css">
<button type="button" class="glass glass-pill glass-button">Save</button>
```

Use `glass-clear` on a predictable backdrop or `glass-frosted` when labels need a steadier surface. Scope colors and CSS variables to the relevant area with `data-theme="light"` or the app's theme. The optional `mountGlass(root)` helper from `liquid-glass.js` adds pointer highlights. Call its returned cleanup on unmount.

## WebGL2 glass over an image

Copy `assets/liquid-glass-renderer.js` and `assets/mount-liquid-glass.js` into the same app directory. Use this structure in an existing interface and replace the local image URL with an app asset.

```html
<div id="glass-stage">
  <canvas id="glass-canvas" aria-hidden="true"></canvas>
  <button id="glass-save" type="button">Save</button>
</div>
<style>
  #glass-stage {
    position: relative;
    min-height: 220px;
    display: grid;
    place-items: center;
    background: #25465a url("./backdrop.jpg") center/cover;
  }
  #glass-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  #glass-save {
    position: relative;
    min-width: 88px;
    min-height: 44px;
    border: 1px solid #c2d9e7;
    border-radius: 999px;
    background: #123047;
    color: white;
  }
  #glass-stage[data-refractive] #glass-save { background: rgb(18 48 71 / .62); }
  #glass-save:focus-visible { outline: 3px solid #a8e6ff; outline-offset: 3px; }
</style>
<script type="module" src="./glass-stage.js"></script>
```

```js
// glass-stage.js
import { PRESETS } from "./glass/liquid-glass-renderer.js";
import { mountLiquidGlass } from "./glass/mount-liquid-glass.js";

const stage = document.querySelector("#glass-stage");
const canvas = document.querySelector("#glass-canvas");
const button = document.querySelector("#glass-save");
const image = new Image();
image.src = "./backdrop.jpg";

let glass;
try {
  await image.decode();
  glass = mountLiquidGlass({
    canvas, source: image, material: PRESETS.apple,
    getFrame() {
      const stageBox = canvas.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      return { shapes: [{
        x: buttonBox.left - stageBox.left + buttonBox.width / 2,
        y: buttonBox.top - stageBox.top + buttonBox.height / 2,
        width: buttonBox.width,
        height: buttonBox.height,
        radius: buttonBox.height / 2
      }] };
    },
    onAvailabilityChange: available => stage.toggleAttribute("data-refractive", available)
  });
} catch {
  stage.removeAttribute("data-refractive");
}

// Call glass?.invalidate() after a control moves or changes size.
// On unmount, call glass?.destroy() and remove the data-refractive attribute.
```

The helper coalesces redraw requests and handles resizing, forced colors, reduced transparency, and WebGL context loss. For a video or changing canvas, pass `liveSource: true` and invalidate from the app's frame loop after the source updates. Load pixels before mounting. Pass `sliderTrack` and `controlBases` through `getFrame` when sampling fixed tracks.

CSS cover positioning and canvas sampling must use the same backdrop crop. Use a stage-local canvas and notify it after position changes. A DOM section the renderer cannot sample belongs on the CSS path. For React or another framework, mount after the DOM and source are ready and tear down from the component cleanup.

## Material keys

| Key | Meaning | Apple preset |
| --- | --- | --- |
| `refraction` | Edge bend, CSS px | 18 |
| `bezel` | Width of the curved rim, CSS px | 20 |
| `magnify` | Center zoom | 1 |
| `dispersion` | Rim color split, 0 to 1 | 0.04 |
| `edge` | `convex` or `lip` | convex |
| `sizeScale` | Larger shapes bend more | true |
| `blur` | Backdrop softness, CSS px | 6 |
| `frost` | Milky mix, 0 to 1 | 0.1 |
| `vibrancy` | Saturation multiplier | 1.35 |
| `brightness` | Exposure offset | 0.02 |
| `dim` | Darkening around clear glass | 0 |
| `appearance` | `auto`, `light`, or `dark` | auto |
| `pickup` | Color absorbed from below | 0.35 |
| `tintAmount`, `tint` | Explicit tint | 0, `#e8593c` |
| `specular`, `rimWidth` | Bright rim | 0.7, 1.4 |
| `lightAngle` | Degrees | -135 |
| `shadow` | Contact shadow | 0.3 |
| `merge` | Smooth-union distance, CSS px | 10 |
| `interactive` | Pointer press grows and brightens the shape | true |

`setMaterial` clamps numeric values and ignores unknown keys. Passing a partial object preserves the other current values.

## Liquid-glass slider

Use the slider in the demo scene as the working example. Keep a real `<input type="range">` above the canvas for pointer, touch, and keyboard input. Put the rail in the renderer's sample layer and only the knob in the glass field:

```js
// Coordinates are CSS pixels relative to the canvas. x is the rail's left edge.
scene.setSliderTrack({ x, y, width: railWidth, height: 9, fillX: knobX });
const width = 60 + 44 * press;
const height = 39 + 12 * press;
scene.setShapes([{ x: knobX, y, width, height, radius: height / 2, slider: true, press }]);
scene.render();
```

There is one slider rail per scene. Call `setSliderTrack(null)` when the slider is removed. The shader draws the rail over the original texture, so it appears at both the original and displaced sample coordinates. The filled end follows the input value. Keep the rail position, width, and height fixed during a press.

The default slider has a milky resting surface and a clearer held lens. Set `clearControls: true` in the material to use the shared milk-to-lens material across the slider, switch, segmented selection, and standalone buttons. Knobs and the segmented selection rest with a pale fill. Standalone glass starts transparent and gains a brighter, more refractive rim on hold. A joined selection keeps its pale body away from the neck, where it blends into the clear glass. Animate `press` from 0 to 1 while held and back to 0 on release or cancellation. Use elapsed time so the easing remains stable when rendering slows. Keep the transparent input's hit area fixed. With reduced motion, apply the state immediately. With no WebGL, show an opaque knob and a CSS rail driven by the same input value.

Verify all three states on the same grid. Holding the same value should change only the knob and the pixels it covers. Dragging can change the filled length without moving the rail.


## Which parts merge

Use `setControlBases({ toggle, segment })` for fixed sampled surfaces. The toggle base takes `{ x, y, width, height, on }`; the segment base takes `{ x, y, width, height }`. Coordinates are CSS pixels from the canvas origin; these two boxes are centered on `x, y`. Clear them with `setControlBases()`. Use `setSliderTrack` for the rail.

Give the actual knob shapes `surface: 'switch'`, `slider: true`, or `surface: 'selection'`. Use the demo’s shared liquid surface behavior for related controls. A hold enlarges the active glass, and travel stretches and thins it before it settles. Segment selection also follows a held horizontal drag and commits the nearest item on release. The renderer blends the contour and material at a junction. In the milk-to-lens mode, the neck gets stronger refraction and a soft highlight colored by the sampled backdrop. A rail is still only a sample source, so crossing it alone does not create a junction. An inactive track must not be added to `setShapes`. Its color still appears in a lens that crosses it. The demo scene makes the difference visible on an original grid.

Free glass can pass `stretchX` and `stretchY` in CSS pixels for deformation along the drag direction. Apply the stretch to the shader geometry around the actual control; do not scale its DOM translation. Pass a normalized `motion` value from measured travel to add colored edge light only during movement. A stationary `press` still opens and magnifies the lens without adding color fringing. Drive stretch from pointer velocity and use a damped spring on release. The shader deforms the rear more than the leading face, keeping the hit area and labels anchored. Disable drag deformation under reduced motion.

## Dynamic sources

For a playing video or a canvas that changes, upload the current frame before drawing:

```js
scene.setSource(videoOrCanvas);
scene.render();
```

Stop that loop when the page is hidden or the component unmounts. A static image needs one upload.

## React

```jsx
useEffect(() => {
  const scene = new GlassScene(canvasRef.current);
  let frame = 0;
  const draw = () => { frame = 0; /* setSource once, setShapes, render */ };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  canvasRef.current.addEventListener("glassfallback", showOpaqueFallback);
  return () => {
    cancelAnimationFrame(frame);
    canvasRef.current.removeEventListener("glassfallback", showOpaqueFallback);
    scene.destroy();
  };
}, []);
```

Create the scene once. Do not rebuild it on every pointer move.

## Fallback

If `scene.available` is false, or the canvas emits `glassfallback`, hide the canvas and give controls an opaque background. Also do this for `prefers-reduced-transparency: reduce` and `forced-colors: active`. CSS in `liquid-glass.css` can style those controls, but it does not provide merge or real refraction.

## Limits

The shader renders up to 12 glass shapes. A shape can supply a rotation in degrees and a normalized custom outline. The demo uses a `press` value from 0 to 1 to drive geometry and optical changes. Fusion blends the two-dimensional glass contours. The shader samples only the texture supplied by the host.
