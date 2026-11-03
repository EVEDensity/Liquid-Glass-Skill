/* Pointer lighting only; native HTML retains all control semantics. MIT. */
export function mountGlass(root = document) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let pending = null;
  const touched = new Set();
  function reset(element) {
    element.style.removeProperty('--glass-x');
    element.style.removeProperty('--glass-y');
  }
  function move(event) {
    if (media.matches || !(event.target instanceof Element)) return;
    const element = event.target.closest('.glass');
    if (!element || !root.contains(element)) return;
    pending = { element, x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!pending) return;
      const { element, x, y } = pending;
      pending = null;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      element.style.setProperty('--glass-x', `${Math.max(0, Math.min(100, (x - box.left) / box.width * 100))}%`);
      element.style.setProperty('--glass-y', `${Math.max(0, Math.min(100, (y - box.top) / box.height * 100))}%`);
      touched.add(element);
    });
  }
  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    pending = null;
    touched.forEach(reset);
    touched.clear();
  }
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerleave', clear);
  media.addEventListener('change', clear);
  return () => {
    clear();
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', clear);
    media.removeEventListener('change', clear);
  };
}
