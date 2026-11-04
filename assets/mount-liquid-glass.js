import { GlassScene } from './liquid-glass-renderer.js';

/**
 * Bind one decorative canvas to an app-owned backdrop and geometry provider.
 * Call invalidate after input, layout changes, or updates to a live backdrop.
 * The caller owns markup, hit testing, animation, and fallback styling.
 */
export function mountLiquidGlass({
  canvas, source, getFrame, material, liveSource = false, onAvailabilityChange = () => {}
}) {
  const view = canvas.ownerDocument.defaultView;
  const reduceTransparency = view.matchMedia('(prefers-reduced-transparency: reduce)');
  const forcedColors = view.matchMedia('(forced-colors: active)');
  const scene = new GlassScene(canvas, material);
  const initiallyHidden = canvas.hidden;
  let frameId = 0;
  let active = false;
  let destroyed = false;
  let uploaded = false;

  function draw() {
    frameId = 0;
    if (!active || destroyed) return;
    if (!uploaded || liveSource) {
      try {
        if (!scene.setSource(source)) return;
      } catch {
        // Unreadable pixels (for example a cross-origin image) use the CSS fallback.
        scene.destroy();
        syncAvailability();
        return;
      }
      uploaded = true;
    }
    const { shapes, sliderTrack = null, controlBases = {} } = getFrame();
    scene.setSliderTrack(sliderTrack);
    scene.setControlBases(controlBases);
    scene.setShapes(shapes);
    scene.render();
  }

  function invalidate() {
    if (active && !destroyed && !frameId) frameId = view.requestAnimationFrame(draw);
  }

  function syncAvailability() {
    if (destroyed) return;
    active = scene.available && !reduceTransparency.matches && !forcedColors.matches;
    canvas.hidden = !active;
    onAvailabilityChange(active);
    invalidate();
  }

  const resize = new view.ResizeObserver(invalidate);
  resize.observe(canvas);
  canvas.addEventListener('glassfallback', syncAvailability);
  reduceTransparency.addEventListener('change', syncAvailability);
  forcedColors.addEventListener('change', syncAvailability);
  syncAvailability();

  return {
    get available() { return active; },
    invalidate,
    setMaterial(values) {
      if (destroyed) return;
      scene.setMaterial(values);
      invalidate();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      active = false;
      view.cancelAnimationFrame(frameId);
      resize.disconnect();
      canvas.removeEventListener('glassfallback', syncAvailability);
      reduceTransparency.removeEventListener('change', syncAvailability);
      forcedColors.removeEventListener('change', syncAvailability);
      scene.destroy();
      canvas.hidden = initiallyHidden;
    }
  };
}
