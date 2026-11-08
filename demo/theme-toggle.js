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
    onGlowFrame: schedule, // the WebGL rim light follows the arc frame by frame
  });
  const thumb = toggle.querySelector('.theme-thumb');
  const state = { x: 0, y: 0, scale: 0, sx: 0, sy: 0, tx: 0, ty: 0, lastFrame: null };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pressFrame = 0;
  let pressTarget = 0;
  // Horizontal drag velocity drives the droplet stretch of the WebGL shape.
  let velX = 0, lastMoveX = null, stretch = 0;
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
    lastMoveX = event.clientX;
    state.contactX = event.clientX;
    state.contactY = event.clientY;
    startPress();
  });
  toggle.addEventListener('pointermove', event => {
    if (!(event.buttons & 1)) return;
    if (lastMoveX != null) velX = event.clientX - lastMoveX;
    lastMoveX = event.clientX;
    state.contactX = event.clientX;
    state.contactY = event.clientY;
    schedule();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) {
    toggle.addEventListener(type, () => { pressTarget = 0; lastMoveX = null; startPress(); });
  }
  toggle.addEventListener('glassthemechange', event => onThemeChange(event.detail.theme));
  return {
    element: toggle,
    get theme() { return toggle.theme; },
    setLanguage(strings) { toggle.setGlassThemeLabel(strings.themeToggle); },
    // The thumb press grows like the switch knob, and drag velocity stretches it.
    sceneState(now, stageBox) {
      const track = toggle.querySelector('.theme-track').getBoundingClientRect();
      const rect = thumb.getBoundingClientRect();
      const press = state.scale || 0;
      const motion = sampleGlassMotion(state, state.contactX ?? rect.left, state.contactY ?? rect.top, now, reduced.matches);
      const target = Math.max(-40, Math.min(40, velX * 2.4));
      stretch += (target - stretch) * .35;
      velX *= .7;
      const width = rect.width + 26 * press;
      const height = rect.height + 10 * press - Math.min(9, Math.abs(stretch) * .29);
      return {
        base: {
          x: track.left - stageBox.left + track.width / 2,
          y: track.top - stageBox.top + track.height / 2,
          width: track.width, height: track.height,
          light: 90 + toggle.glowRotation, // rim light rides the arc's angle
        },
        shape: {
          x: rect.left - stageBox.left + rect.width / 2,
          y: rect.top - stageBox.top + rect.height / 2,
          width, height,
          radius: Math.min(width, height) * .40,
          press, motion,
          stretchX: Math.round(stretch * 10) / 10,
          contactX: rect.left + rect.width / 2, contactY: rect.top + rect.height / 2,
        },
      };
    },
  };
}
