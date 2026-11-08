/* Standalone glass light/dark theme toggle: opaque pill track, squircle thumb, pixel moon and sun. MIT. */

const css = `
.glass-theme-toggle {
  --gtt-width: 192px; --gtt-height: 84px; --gtt-thumb: 74px;
  --gtt-inset: 5px; --gtt-radius: 30px; --gtt-travel: calc(var(--gtt-width) - var(--gtt-thumb) - var(--gtt-inset) * 2);
  position: relative; display: block; width: var(--gtt-width); height: var(--gtt-height);
  border: 0; padding: var(--gtt-inset); background: transparent; cursor: pointer;
  touch-action: pan-y; -webkit-tap-highlight-color: transparent;
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
  translate: 0 0; transition: translate 330ms cubic-bezier(.24,.8,.26,1);
}
.glass-theme-toggle[aria-checked="true"] .theme-thumb {
  background: rgb(33 36 42 / .92);
  box-shadow: 0 4px 16px rgb(0 0 0 / .5), inset 0 0 0 1px rgb(255 255 255 / .22), inset 0 1px 1px rgb(255 255 255 / .3);
}
.glass-theme-toggle[aria-checked="false"] .theme-thumb { translate: var(--gtt-travel) 0; }
.glass-theme-toggle .theme-glow {
  position: absolute; inset: -5px; border-radius: calc(var(--gtt-radius) + 5px);
  border: 5px solid transparent; border-bottom-color: var(--glow-color);
  pointer-events: none;
  filter: blur(1.4px) drop-shadow(0 0 8px var(--glow-color)) drop-shadow(0 0 24px var(--glow-color)) drop-shadow(0 0 58px var(--glow-color));
  rotate: calc(var(--glow-spin, 0deg) + var(--glow-shift, 0deg));
  transition: rotate 620ms cubic-bezier(.25,.8,.25,1);
}
.glass-theme-toggle .theme-glow::before {
  content: ""; position: absolute; inset: -1px; border-radius: inherit;
  border: 2px solid transparent; border-bottom-color: rgb(255 255 255 / .85);
  filter: blur(.5px);
}
.glass-theme-toggle[data-dragging] .theme-glow { transition: none; }
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
  .glass-theme-toggle .theme-thumb, .glass-theme-toggle .theme-glow, .glass-theme-toggle .theme-icon rect { transition: none; }
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
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell === '.') continue;
      // Deterministic per-pixel scatter so a theme change dissolves the icon.
      const seed = (x * 73 + y * 151 + 37) % 97 / 97;
      const angle = seed * 6.283;
      const distance = 8 + seed * 15;
      const sx = (Math.cos(angle) * distance).toFixed(1);
      const sy = (Math.sin(angle) * distance).toFixed(1);
      const delay = Math.round(seed * 110);
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
  const icons = { moon: toggle.querySelector('.theme-icon-moon'), sun: toggle.querySelector('.theme-icon-sun') };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let theme = initial;
  let gesture;
  let skipPointerClick = false;
  const apply = next => {
    scope.dataset.theme = next;
    icons.moon.toggleAttribute('data-dust', false);
    icons.sun.toggleAttribute('data-dust', false);
    icons.moon.toggleAttribute('data-off', next !== 'dark');
    icons.sun.toggleAttribute('data-off', next !== 'light');
    toggle.style.setProperty('--glow-progress', next === 'dark' ? '0' : '1');
  };
  // Mid-drag the icons hang as particle clouds and the arc hue follows the thumb.
  const previewProgress = shift => {
    const p = Math.max(0, Math.min(1, shift / travel()));
    toggle.style.setProperty('--glow-progress', p.toFixed(3));
    const zone = p < .35 ? 'dark' : p > .65 ? 'light' : 'mid';
    icons.moon.toggleAttribute('data-dust', zone === 'mid');
    icons.sun.toggleAttribute('data-dust', zone === 'mid');
    icons.moon.toggleAttribute('data-off', zone === 'light');
    icons.sun.toggleAttribute('data-off', zone === 'dark');
  };
  const commit = next => {
    if (next === theme) return;
    theme = next;
    apply(theme);
    // The arc always sweeps around the leading edge: keep spinning one way.
    glowSpin -= 180;
    glow.style.setProperty('--glow-spin', glowSpin + 'deg');
    toggle.setAttribute('aria-checked', String(theme === 'dark'));
    if (config.persist !== false) {
      try { scope.ownerDocument?.defaultView?.localStorage?.setItem(storageKey, theme); } catch { /* storage unavailable */ }
    }
    toggle.dispatchEvent(new CustomEvent('glassthemechange', { bubbles: true, detail: { theme } }));
  };
  apply(initial);
  const travel = () => Math.max(1, toggle.clientWidth - thumb.offsetWidth - parseFloat(getComputedStyle(toggle).paddingLeft) * 2);
  // The neon arc rides the leading edge of travel and settles back to its theme edge.
  const glow = thumb.querySelector('.theme-glow');
  let glowShift = 0, glowVelocity = 0, glowFrame = 0, glowLastX = null, glowDragging = false;
  let glowSpin = initial === 'light' ? -180 : 0;
  glow.style.setProperty('--glow-spin', glowSpin + 'deg');
  function glowStep() {
    glowFrame = 0;
    // The arc always advances the same way around the thumb, whichever way it travels.
    const lean = glowDragging ? -70 : 0;
    const target = Math.max(-85, Math.min(85, lean - Math.abs(glowVelocity) * 6));
    if (reduced.matches) glowShift = target;
    else glowShift += (target - glowShift) * .24;
    glowVelocity *= .8;
    glow.style.setProperty('--glow-shift', glowShift.toFixed(2) + 'deg');
    config.onGlowFrame?.();
    if (glowDragging || Math.abs(glowShift) > .4) {
      glowFrame = requestAnimationFrame(glowStep);
    } else {
      glow.style.setProperty('--glow-shift', '0deg');
    }
  }
  function startGlow() { if (!glowFrame) glowFrame = requestAnimationFrame(glowStep); }
  toggle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    skipPointerClick = false;
    gesture = { id: event.pointerId, start: event.clientX, initial: theme === 'dark' ? 0 : travel(), shift: theme === 'dark' ? 0 : travel(), moved: false };
    try { toggle.setPointerCapture(event.pointerId); } catch { /* the pointer may already be gone */ }
    glowDragging = true;
    glowLastX = event.clientX;
    toggle.dataset.dragging = '';
    startGlow();
  });
  toggle.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    if (glowLastX != null) glowVelocity = Math.max(-14, Math.min(14, glowVelocity + (event.clientX - glowLastX) * .35));
    glowLastX = event.clientX;
    const dx = event.clientX - gesture.start;
    if (!gesture.moved && Math.abs(dx) < 4) return;
    gesture.moved = true;
    gesture.shift = Math.max(0, Math.min(travel(), gesture.initial + dx));
    previewProgress(gesture.shift);
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
      const next = cancelled || !far ? theme : gesture.shift > gesture.initial ? 'light' : 'dark';
      if (next === theme) apply(theme);
      else commit(next);
    }
    gesture = null;
    glowDragging = false;
    glowLastX = null;
    delete toggle.dataset.dragging;
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
      glowSpin -= 180;
      glow.style.setProperty('--glow-spin', glowSpin + 'deg');
    }
    theme = next;
    toggle.setAttribute('aria-checked', String(theme === 'dark'));
    apply(theme);
  };
  toggle.setGlassThemeLabel = label => {
    if (label) toggle.setAttribute('aria-label', label);
  };
  Object.defineProperty(toggle, 'theme', { get: () => theme });
  // Current arc angle in degrees, cumulative: 0 rests at the bottom (dark) edge.
  Object.defineProperty(toggle, 'glowRotation', { get: () => glowSpin + glowShift });
  target.append(toggle);
  return toggle;
}
