import { createGlassThemeToggle } from '../assets/glass-theme-toggle.js';
import { stepGlassMotion, sampleGlassMotion } from '../assets/glass-motion.js';

/* Mounts the page-level theme toggle and describes it as a scene shape:
   a squircle thumb over a fixed track base, like the switch but self-themed. */
export function mountThemeToggle(stage, { schedule, onThemeChange, getStrings }) {
  const host = stage.querySelector('#theme-tools');
  const toggle = createGlassThemeToggle(host, {
    bare: true,
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    ariaLabel: getStrings().themeToggle,
  });
  const thumb = toggle.querySelector('.theme-thumb');
  const state = { x: 0, y: 0, scale: 0, sx: 0, sy: 0, tx: 0, ty: 0, lastFrame: null };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pressFrame = 0;
  let pressTarget = 0;
  function animatePress(now) {
    pressFrame = 0;
    const moving = stepGlassMotion(state, pressTarget, now, false, reduced.matches);
    schedule();
    if (moving) pressFrame = requestAnimationFrame(animatePress);
  }
  function startPress() { if (!pressFrame) pressFrame = requestAnimationFrame(animatePress); }
  toggle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pressTarget = 1;
    state.contactX = event.clientX;
    state.contactY = event.clientY;
    startPress();
  });
  toggle.addEventListener('pointermove', event => {
    if (!(event.buttons & 1)) return;
    state.contactX = event.clientX;
    state.contactY = event.clientY;
    schedule();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) {
    toggle.addEventListener(type, () => { pressTarget = 0; startPress(); });
  }
  toggle.addEventListener('glassthemechange', event => onThemeChange(event.detail.theme));
  return {
    element: toggle,
    get theme() { return toggle.theme; },
    setLanguage(strings) { toggle.setGlassThemeLabel(strings.themeToggle); },
    // The thumb press grows like the switch knob but keeps its squircle radius.
    sceneState(now, stageBox) {
      const track = toggle.querySelector('.theme-track').getBoundingClientRect();
      const rect = thumb.getBoundingClientRect();
      const press = state.scale || 0;
      const motion = sampleGlassMotion(state, state.contactX ?? rect.left, state.contactY ?? rect.top, now, reduced.matches);
      const width = rect.width + 26 * press;
      const height = rect.height + 10 * press;
      return {
        base: {
          x: track.left - stageBox.left + track.width / 2,
          y: track.top - stageBox.top + track.height / 2,
          width: track.width, height: track.height,
        },
        shape: {
          x: rect.left - stageBox.left + rect.width / 2,
          y: rect.top - stageBox.top + rect.height / 2,
          width, height,
          radius: Math.min(width, height) * .40,
          press, motion,
          contactX: rect.left + rect.width / 2, contactY: rect.top + rect.height / 2,
        },
      };
    },
  };
}
