# Integration

## Page structure

Use one stage, one decorative canvas, and one DOM element per movable glass control.

```html
<main id="stage">
  <canvas id="scene" aria-hidden="true"></canvas>
  <div class="glass-control" data-glass tabindex="0">
    <button type="button">Save</button>
  </div>
</main>
<script type="module" src="./demo.js"></script>
```

The canvas fills the stage with `pointer-events: none`. Controls are absolutely positioned above it. Give each control `touch-action: none`, a grab cursor, and a keyboard-accessible move action.

## Rendering loop

```js
import { GlassScene, PRESETS } from "../assets/liquid-glass-renderer.js";

const scene = new GlassScene(canvas);
let material = { ...PRESETS.apple };
let frame = 0;

function draw() {
  frame = 0;
  if (!scene.available) return;
  const box = canvas.getBoundingClientRect();
  scene.setShapes([...document.querySelectorAll("[data-glass]")].map((control) => {
    const rect = control.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - box.left,
      y: rect.top + rect.height / 2 - box.top,
      width: rect.width,
      height: rect.height,
      radius: Math.min(rect.width, rect.height) / 2
    };
  }));
  scene.setMaterial(material);
  scene.render();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(draw);
}
```

Call `schedule()` after a drag step, arrow-key move, scroll, resize, or preset change. `ResizeObserver` inside `GlassScene` redraws after canvas size changes, but it does not know when a control moves.

Preserve native inputs and keyboard actions. For a draggable glass button, distinguish activation from dragging by waiting for a small pointer movement before capturing the pointer and suppressing its click. Arrow keys move standalone glass by 8px, or 24px with Shift.

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

Use the demo's **Slider** layout as the working example. Keep a real `<input type="range">` above the canvas for pointer, touch, and keyboard input. Put the rail in the renderer's sample layer and only the knob in the glass field:

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

Give the actual knob shapes `surface: 'switch'`, `slider: true`, or `surface: 'selection'`. Use the demo’s shared liquid surface behavior for related controls. A hold enlarges the active glass, and travel stretches and thins it before it settles. Segment selection also follows a held horizontal drag and commits the nearest item on release. The renderer blends the contour and material at a junction. In the milk-to-lens mode, the neck gets stronger refraction and a soft highlight colored by the sampled backdrop. A rail is still only a sample source, so crossing it alone does not create a junction. An inactive track must not be added to `setShapes`. Its color still appears in a lens that crosses it. The demo's **Merge test** makes the difference visible on an original grid.

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

The shader renders up to eight shapes. Each shape accepts `press` from 0 to 1; the Apple preset uses it to scale the control, increase refraction, and brighten the rim. The merge is a 2D smooth union of rounded rectangles, not a liquid simulation. Rotated controls are not represented accurately. The shader cannot see HTML outside its texture.
