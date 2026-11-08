/* Standalone glass light/dark theme toggle: pill track, squircle thumb, pixel moon and sun. MIT. */

const css = `
.glass-theme-toggle {
  --gtt-width: 192px; --gtt-height: 84px; --gtt-thumb: 74px;
  --gtt-inset: 5px; --gtt-radius: 26px; --gtt-travel: calc(var(--gtt-width) - var(--gtt-thumb) - var(--gtt-inset) * 2);
  position: relative; display: block; width: var(--gtt-width); height: var(--gtt-height);
  border: 0; padding: var(--gtt-inset); background: transparent; cursor: pointer;
  touch-action: pan-y; -webkit-tap-highlight-color: transparent;
}
.glass-theme-toggle:active { cursor: grabbing; }
.glass-theme-toggle .theme-track {
  position: absolute; inset: 0; border-radius: 999px;
  background: rgb(252 252 250 / .30);
  backdrop-filter: blur(14px) saturate(1.5); -webkit-backdrop-filter: blur(14px) saturate(1.5);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / .38), inset 0 2px 10px rgb(22 26 36 / .16),
    0 12px 32px rgb(12 16 28 / .20);
}
.glass-theme-toggle .theme-thumb {
  position: relative; z-index: 1; display: grid; place-items: center; grid-area: 1 / 1;
  width: var(--gtt-thumb); height: var(--gtt-thumb); border-radius: var(--gtt-radius);
  background: rgb(255 255 255 / .52);
  backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6);
  box-shadow: 0 3px 12px rgb(15 20 30 / .22), inset 0 1px 1px rgb(255 255 255 / .72);
  translate: 0 0; transition: translate 340ms cubic-bezier(.22,.78,.22,1);
}
.glass-theme-toggle[aria-checked="false"] .theme-thumb { translate: var(--gtt-travel) 0; }
.glass-theme-toggle .theme-thumb::after {
  content: ""; position: absolute; inset: -3px; border-radius: inherit; pointer-events: none;
}
.glass-theme-toggle[aria-checked="false"] .theme-thumb::after {
  box-shadow: 0 6px 26px rgb(238 152 48 / .78), 0 1px 5px rgb(238 152 48 / .55),
    inset 0 -1px 4px rgb(255 196 120 / .40);
}
.glass-theme-toggle[aria-checked="true"] .theme-thumb::after {
  box-shadow: 0 6px 28px rgb(92 106 255 / .85), 0 1px 5px rgb(112 124 255 / .60),
    inset 0 -1px 4px rgb(160 172 255 / .45);
}
.glass-theme-toggle .theme-icon {
  grid-area: 1 / 1; width: 36px; height: 36px; color: #45413a;
  transition: opacity 240ms ease;
}
.glass-theme-toggle .theme-icon-moon { color: #f4efe1; filter: drop-shadow(0 0 6px rgb(206 214 255 / .95)); opacity: 0; }
.glass-theme-toggle .theme-icon-sun { filter: drop-shadow(0 0 4px rgb(255 208 138 / .55)); opacity: 1; }
.glass-theme-toggle[aria-checked="true"] .theme-icon-moon { opacity: 1; }
.glass-theme-toggle[aria-checked="true"] .theme-icon-sun { opacity: 0; }
/* The bare variant leaves the glass surfaces to a host scene canvas. */
.glass-theme-toggle[data-bare] .theme-track { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; box-shadow: none; }
.glass-theme-toggle[data-bare] .theme-thumb { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; box-shadow: none; }
@media (prefers-reduced-motion: reduce) {
  .glass-theme-toggle .theme-thumb, .glass-theme-toggle .theme-icon { transition: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .glass-theme-toggle .theme-track { background: #dbd8d2; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass-theme-toggle .theme-thumb { background: #faf9f6; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass-theme-toggle[aria-checked="true"] .theme-track { background: #191a1e; }
}
@supports not (backdrop-filter: blur(1px)) {
  .glass-theme-toggle .theme-track { background: #dbd8d2; }
  .glass-theme-toggle .theme-thumb { background: #faf9f6; }
  .glass-theme-toggle[aria-checked="true"] .theme-track { background: #191a1e; }
}
@media (forced-colors: active) {
  .glass-theme-toggle .theme-track { background: Canvas; box-shadow: inset 0 0 0 1px ButtonText; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass-theme-toggle .theme-thumb { background: ButtonFace; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass-theme-toggle[aria-checked="true"] .theme-icon-sun,
  .glass-theme-toggle[aria-checked="false"] .theme-icon-moon { display: none; }
}
`;

/* Original pixel art (11x11): crescent moon with a sparkle, rayed sun. */
const moonBitmap = [
  '....####...',
  '..######...',
  '.######....',
  '.#####.....',
  '.####......',
  '.####......',
  '.####......',
  '.#####.....',
  '.######....',
  '..######...',
  '....####...',
];
const sunBitmap = [
  '.....#.....',
  '.#...#...#.',
  '...........',
  '...#####...',
  '...#...#...',
  '##.#.#.#.##',
  '...#...#...',
  '...#####...',
  '...........',
  '.#...#...#.',
  '.....#.....',
];

function pixelIcon(rows) {
  const dots = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') dots.push(`<rect x="${x}" y="${y}" width="1.06" height="1.06"/>`);
  });
  return `<svg class="theme-icon" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">${dots.join('')}</svg>`;
}

export function createGlassThemeToggle(target, config = {}) {
  const doc = target.ownerDocument;
  const root = target.getRootNode();
  if (!root.querySelector?.('[data-glass-theme-toggle-style]')) {
    const style = doc.createElement('style');
    style.setAttribute('data-glass-theme-toggle-style', '');
    style.textContent = css;
    (root === doc ? doc.head : root).append(style);
  }
  const scope = config.scope ?? doc.documentElement;
  const storageKey = config.storageKey ?? 'liquid-glass-theme';
  const readStored = () => {
    try { return scope.ownerDocument?.defaultView?.localStorage?.getItem(storageKey); }
    catch { return null; }
  };
  const initial = config.theme ?? (readStored() === 'dark' ? 'dark' : 'light');
  const toggle = doc.createElement('button');
  toggle.type = 'button';
  toggle.className = 'glass-theme-toggle';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(initial === 'dark'));
  if (config.ariaLabel) toggle.setAttribute('aria-label', config.ariaLabel);
  if (config.bare) toggle.dataset.bare = '';
  toggle.innerHTML = `<span class="theme-track" aria-hidden="true"></span>`
    + `<span class="theme-thumb" aria-hidden="true">${pixelIcon(moonBitmap).replace('class="theme-icon"', 'class="theme-icon theme-icon-moon"')}`
    + `${pixelIcon(sunBitmap).replace('class="theme-icon"', 'class="theme-icon theme-icon-sun"')}</span>`;
  const thumb = toggle.querySelector('.theme-thumb');
  let theme = initial;
  let gesture;
  let skipPointerClick = false;
  const commit = next => {
    if (next === theme) return;
    theme = next;
    apply(theme);
    toggle.setAttribute('aria-checked', String(theme === 'dark'));
    if (config.persist !== false) {
      try { scope.ownerDocument?.defaultView?.localStorage?.setItem(storageKey, theme); } catch { /* storage unavailable */ }
    }
    toggle.dispatchEvent(new CustomEvent('glassthemechange', { bubbles: true, detail: { theme } }));
  };
  const apply = next => {
    scope.dataset.theme = next;
  };
  apply(initial);
  const travel = () => Math.max(1, toggle.clientWidth - thumb.offsetWidth - parseFloat(getComputedStyle(toggle).paddingLeft) * 2);
  toggle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    skipPointerClick = false;
    gesture = { id: event.pointerId, start: event.clientX, initial: theme === 'dark' ? 0 : travel(), shift: theme === 'dark' ? 0 : travel(), moved: false };
    toggle.setPointerCapture(event.pointerId);
  });
  toggle.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.start;
    if (!gesture.moved && Math.abs(dx) < 4) return;
    gesture.moved = true;
    gesture.shift = Math.max(0, Math.min(travel(), gesture.initial + dx));
    thumb.style.transition = 'none';
    thumb.style.translate = gesture.shift + 'px 0';
  });
  function finish(event, cancelled) {
    if (gesture?.id !== event.pointerId) return;
    if (gesture.moved) {
      skipPointerClick = true;
      thumb.style.transition = '';
      thumb.style.translate = '';
      const far = Math.abs(gesture.shift - gesture.initial) >= travel() * .4;
      commit(cancelled ? theme : far ? (gesture.shift > gesture.initial ? 'light' : 'dark') : theme);
    }
    gesture = null;
  }
  toggle.addEventListener('pointerup', event => finish(event, false));
  toggle.addEventListener('pointercancel', event => finish(event, true));
  toggle.addEventListener('lostpointercapture', event => finish(event, true));
  toggle.addEventListener('click', event => {
    if (event.detail && skipPointerClick) {
      skipPointerClick = false;
      return;
    }
    commit(theme === 'dark' ? 'light' : 'dark');
    skipPointerClick = false;
  });
  toggle.setGlassTheme = next => {
    theme = next;
    toggle.setAttribute('aria-checked', String(theme === 'dark'));
    apply(theme);
  };
  toggle.setGlassThemeLabel = label => {
    if (label) toggle.setAttribute('aria-label', label);
  };
  Object.defineProperty(toggle, 'theme', { get: () => theme });
  target.append(toggle);
  return toggle;
}
