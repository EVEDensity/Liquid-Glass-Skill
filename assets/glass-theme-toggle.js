/* Standalone glass light/dark theme toggle: opaque pill track, squircle thumb, pixel moon and sun. MIT. */

const css = `
.glass-theme-toggle {
  --gtt-width: 192px; --gtt-height: 84px; --gtt-thumb: 74px;
  --gtt-inset: 5px; --gtt-radius: 30px; --gtt-travel: calc(var(--gtt-width) - var(--gtt-thumb) - var(--gtt-inset) * 2);
  position: relative; display: block; width: var(--gtt-width); height: var(--gtt-height);
  border: 0; padding: var(--gtt-inset); background: transparent; cursor: pointer;
  touch-action: none; -webkit-tap-highlight-color: transparent;
}
.glass-theme-toggle:active { cursor: grabbing; }
.glass-theme-toggle[aria-checked="false"] { --glow-color: rgb(255 176 64 / .95); }
.glass-theme-toggle[aria-checked="true"] { --glow-color: rgb(116 130 255 / .95); }
@supports (color: color-mix(in oklab, red, blue)) {
  /* The arc hue follows the thumb across the track while dragging. */
  .glass-theme-toggle { --glow-color: color-mix(in oklab, rgb(116 130 255 / .95), rgb(255 176 64 / .95) calc(var(--glow-progress, 0) * 100%)); }
}
.glass-theme-toggle .theme-track {
  position: absolute; inset: 0; border-radius: 999px;
  background: #e6e4df;
  box-shadow: inset 0 1px 2px rgb(255 255 255 / .65), inset 0 -2px 6px rgb(22 26 36 / .10),
    0 16px 36px rgb(12 16 28 / .22);
}
.glass-theme-toggle[aria-checked="true"] .theme-track {
  background: #16171a;
  box-shadow: inset 0 1px 2px rgb(255 255 255 / .10), inset 0 -2px 8px rgb(0 0 0 / .55),
    0 16px 36px rgb(0 0 0 / .45);
}
.glass-theme-toggle .theme-thumb {
  position: relative; z-index: 1; display: grid; place-items: center;
  width: var(--gtt-thumb); height: var(--gtt-thumb); border-radius: var(--gtt-radius);
  background: rgb(255 255 255 / .58);
  backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6);
  box-shadow: 0 4px 14px rgb(15 20 30 / .28), inset 0 0 0 1px rgb(255 255 255 / .62), inset 0 1px 1px rgb(255 255 255 / .8);
  translate: 0 0; transition: translate 330ms cubic-bezier(.24,.8,.26,1), scale 700ms cubic-bezier(.3,.7,.3,1);
}
.glass-theme-toggle:not([data-bare]):active .theme-thumb { scale: .88 1.05; transition: translate 330ms cubic-bezier(.24,.8,.26,1), scale 260ms cubic-bezier(.3,.7,.3,1); }
.glass-theme-toggle[aria-checked="true"] .theme-thumb {
  background: rgb(33 36 42 / .92);
  box-shadow: 0 4px 16px rgb(0 0 0 / .5), inset 0 0 0 1px rgb(255 255 255 / .22), inset 0 1px 1px rgb(255 255 255 / .3);
}
.glass-theme-toggle[aria-checked="false"] .theme-thumb { translate: var(--gtt-travel) 0; }
.glass-theme-toggle[data-dragging] .theme-thumb { transition: none; }
.glass-theme-toggle .theme-glow {
  position: absolute; inset: -5px; border-radius: calc(var(--gtt-radius) + 5px);
  border: 5px solid transparent; border-bottom-color: var(--glow-color);
  pointer-events: none;
  filter: blur(1.4px) drop-shadow(0 0 8px var(--glow-color)) drop-shadow(0 0 24px var(--glow-color)) drop-shadow(0 0 58px var(--glow-color));
  rotate: var(--glow-rot, 0deg);
}
.glass-theme-toggle .theme-glow::before {
  content: ""; position: absolute; inset: -1px; border-radius: inherit;
  border: 2px solid transparent; border-bottom-color: rgb(255 255 255 / .85);
  filter: blur(.5px);
}
.glass-theme-toggle .theme-icon { grid-area: 1 / 1; width: 48px; height: 48px; color: #45413a; }
.glass-theme-toggle .theme-icon-moon { color: #f4efe1; filter: drop-shadow(0 0 6px rgb(206 214 255 / .95)); }
.glass-theme-toggle .theme-icon-sun { filter: drop-shadow(0 0 4px rgb(255 208 138 / .55)); }
.glass-theme-toggle .theme-icon rect {
  transform-box: fill-box; transform-origin: center;
  transition: opacity 170ms ease var(--d, 0ms), transform 230ms cubic-bezier(.3,.7,.3,1) var(--d, 0ms);
}
/* Mid-drag: both icons hang as loose particle clouds around the center. */
.glass-theme-toggle .theme-icon[data-dust] rect {
  opacity: .55; transform: translate(calc(var(--sx, 0px) * .55), calc(var(--sy, 0px) * .55)) scale(.8);
}
.glass-theme-toggle .theme-icon[data-off] rect {
  opacity: 0; transform: translate(calc(var(--sx, 0px) * .72), calc(var(--sy, 0px) * .72)) scale(.5);
}
/* The bare variant leaves the glass surfaces to a host scene canvas. */
.glass-theme-toggle[data-bare] .theme-track { background: transparent; box-shadow: none; }
.glass-theme-toggle[data-bare] .theme-thumb { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; box-shadow: none; }
@media (prefers-reduced-motion: reduce) {
  .glass-theme-toggle .theme-thumb, .glass-theme-toggle .theme-icon rect { transition: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .glass-theme-toggle .theme-thumb { backdrop-filter: none; -webkit-backdrop-filter: none; background: #faf9f6; }
  .glass-theme-toggle[aria-checked="true"] .theme-thumb { background: #21252a; }
}
@supports not (backdrop-filter: blur(1px)) {
  .glass-theme-toggle .theme-thumb { background: #faf9f6; }
  .glass-theme-toggle[aria-checked="true"] .theme-thumb { background: #21252a; }
}
@media (forced-colors: active) {
  .glass-theme-toggle .theme-track { background: Canvas; box-shadow: inset 0 0 0 1px ButtonText; }
  .glass-theme-toggle .theme-thumb { background: ButtonFace; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass-theme-toggle .theme-glow { display: none; }
  .glass-theme-toggle[aria-checked="true"] .theme-icon-sun,
  .glass-theme-toggle[aria-checked="false"] .theme-icon-moon { display: none; }
}
`;

/* Original pixel art (20x20): dithered crescent moon with a sparkle, rayed sun.
   '#' full pixel, '+' half-lit dither, 'o' bright sparkle. */
const moonBitmap = [
  '....................',
  '..........o...o.....',
  '..............o.....',
  '............ooooo...',
  '......##+.....o.....',
  '....###+......o.....',
  '...####.+.+.....o...',
  '...####+.+..........',
  '..#####.+...........',
  '..#####+............',
  '..#####.+.+.........',
  '..######.+..........',
  '..#######.+.+.......',
  '..#######+.+.+.+....',
  '..#########.+.+.....',
  '...############.....',
  '....##########......',
  '.....########.......',
  '........##..........',
  '....................',
];
const sunBitmap = [
  '....................',
  '....................',
  '.........##.........',
  '...##....##....##...',
  '...##....##....##...',
  '....................',
  '......########......',
  '......########......',
  '......########......',
  '..##..########..##..',
  '..##..########..##..',
  '..##..########..##..',
  '......########......',
  '......########......',
  '....................',
  '...##....##....##...',
  '...##....##....##...',
  '.........##.........',
  '....................',
  '....................',
];

function pixelIcon(rows, className) {
  const dots = [];
  const columns = rows[0].length - 1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell === '.') continue;
      // Deterministic per-pixel scatter; the wipe starts from the leading side.
      const seed = (x * 73 + y * 151 + 37) % 97 / 97;
      const angle = seed * 6.283;
      const distance = 8 + seed * 15;
      const sx = (Math.cos(angle) * distance).toFixed(1);
      const sy = (Math.sin(angle) * distance).toFixed(1);
      const delay = Math.round((1 - x / columns) * 140 + seed * 60);
      const opacity = cell === '+' ? ' fill-opacity=".45"' : '';
      const sparkle = cell === 'o' ? ' fill="#ffffff"' : '';
      dots.push(`<rect x="${x}" y="${y}" width="1.06" height="1.06"${opacity}${sparkle} style="--sx:${sx}px;--sy:${sy}px;--d:${delay}ms"/>`);
    }
  });
  return `<svg class="theme-icon ${className}" viewBox="0 0 20 20" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">${dots.join('')}</svg>`;
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
    + `<span class="theme-thumb" aria-hidden="true"><span class="theme-glow"></span>`
    + `${pixelIcon(moonBitmap, 'theme-icon-moon')}${pixelIcon(sunBitmap, 'theme-icon-sun')}</span>`;
  const thumb = toggle.querySelector('.theme-thumb');
  const glow = toggle.querySelector('.theme-glow');
  const icons = { moon: toggle.querySelector('.theme-icon-moon'), sun: toggle.querySelector('.theme-icon-sun') };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let theme = initial;
  let gesture;
  let skipPointerClick = false;

  // The arc's angle is a pure function of the thumb's position: it advances one half
  // turn (always the same way around) per crossing, riding the leading edge.
  let glowTurns = 0;          // completed half turns
  let sweepTheme = theme;     // theme at the moment the open sweep began
  let sweepLive = false;      // a sweep is being tracked
  let glowFrame = 0;
  let lastRot = initial === 'light' ? -180 : 0;
  const anchorOf = t => t === 'dark' ? 0 : 1;
  const travel = () => {
    // The toggle may be measured before insertion: never let geometry go NaN.
    if (!toggle.isConnected) return 1;
    const pad = parseFloat(getComputedStyle(toggle).paddingLeft) || 0;
    return Math.max(1, toggle.clientWidth - thumb.offsetWidth - pad * 2);
  };

  function liveProgress() {
    if (gesture && glowDragging()) return Math.max(0, Math.min(1, gesture.shift / travel()));
    if (!toggle.isConnected) return anchorOf(theme);
    const tx = parseFloat(getComputedStyle(thumb).translate) || 0;
    const p = tx / travel();
    return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : anchorOf(theme);
  }
  function glowDragging() { return Boolean(gesture); }
  function glowRender() {
    const p = liveProgress();
    const sweep = Math.abs(p - anchorOf(sweepTheme));
    lastRot = -180 * (glowTurns + sweep);
    if (!Number.isFinite(lastRot)) lastRot = anchorOf(theme) ? -180 : 0;
    glow.style.setProperty('--glow-rot', lastRot.toFixed(2) + 'deg');
    toggle.style.setProperty('--glow-progress', p.toFixed(3));
    const zone = p < .35 ? 'dark' : p > .65 ? 'light' : 'mid';
    icons.moon.toggleAttribute('data-dust', zone === 'mid');
    icons.sun.toggleAttribute('data-dust', zone === 'mid');
    icons.moon.toggleAttribute('data-off', zone === 'light');
    icons.sun.toggleAttribute('data-off', zone === 'dark');
    config.onGlowFrame?.();
  }
  function glowTick() {
    glowFrame = 0;
    glowRender();
    if (glowDragging()) { glowFrame = requestAnimationFrame(glowTick); return; }
    const rest = anchorOf(theme);
    if (Math.abs(liveProgress() - rest) >= .004) {
      // The thumb is still travelling toward its rest position.
      glowFrame = requestAnimationFrame(glowTick);
      return;
    }
    if (theme !== sweepTheme) glowTurns += 1;
    sweepTheme = theme;
    sweepLive = false;
    // Re-anchor at rest: dark always rests on an even turn (bottom edge),
    // light on an odd one (top edge), whatever sequence led here.
    glowTurns = theme === 'dark' ? Math.round(glowTurns / 2) * 2 : Math.floor(glowTurns / 2) * 2 + 1;
    glowRender();
  }
  function startGlow() {
    sweepLive = true;
    if (!glowFrame) glowFrame = requestAnimationFrame(glowTick);
  }

  const apply = next => {
    scope.dataset.theme = next;
  };
  const commit = next => {
    if (next === theme) return;
    theme = next;
    apply(theme);
    toggle.setAttribute('aria-checked', String(theme === 'dark'));
    if (config.persist !== false) {
      try { scope.ownerDocument?.defaultView?.localStorage?.setItem(storageKey, theme); } catch { /* storage unavailable */ }
    }
    toggle.dispatchEvent(new CustomEvent('glassthemechange', { bubbles: true, detail: { theme } }));
    startGlow();
  };
  apply(initial);
  glowRender();

  // Elastic pull: the thumb stretches away from the track while held.
  toggle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    skipPointerClick = false;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, initial: theme === 'dark' ? 0 : travel(), shift: theme === 'dark' ? 0 : travel(), moved: false };
    try { toggle.setPointerCapture(event.pointerId); } catch { /* the pointer may already be gone */ }
    toggle.dataset.dragging = '';
    startGlow();
  });
  toggle.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    if (!gesture.moved && Math.abs(dx) < 4) return;
    gesture.moved = true;
    gesture.shift = Math.max(0, Math.min(travel(), gesture.initial + dx));
    const dy = Math.max(-18, Math.min(18, (event.clientY - gesture.startY) * .22));
    thumb.style.translate = gesture.shift + 'px ' + dy.toFixed(1) + 'px';
  });
  function finish(event, cancelled) {
    if (gesture?.id !== event.pointerId) return;
    if (gesture.moved) {
      skipPointerClick = true;
      thumb.style.transition = '';
      delete toggle.dataset.dragging; // re-enable the travel transition before releasing the override
      const far = Math.abs(gesture.shift - gesture.initial) >= travel() * .4;
      const next = cancelled || !far ? theme : gesture.shift > gesture.initial ? 'light' : 'dark';
      if (next === theme) apply(theme);
      else commit(next);
      thumb.style.translate = '';
    }
    gesture = null;
    startGlow();
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
    if (next !== theme) {
      theme = next;
      apply(theme);
      toggle.setAttribute('aria-checked', String(theme === 'dark'));
      startGlow();
    }
  };
  toggle.setGlassThemeLabel = label => {
    if (label) toggle.setAttribute('aria-label', label);
  };
  Object.defineProperty(toggle, 'theme', { get: () => theme });
  // Current arc angle in degrees, cumulative; 0 rests at the bottom (dark) edge.
  Object.defineProperty(toggle, 'glowRotation', { get: () => lastRot });
  target.append(toggle);
  return toggle;
}
