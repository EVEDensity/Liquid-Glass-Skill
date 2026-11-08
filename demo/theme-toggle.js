import { createGlassThemeToggle } from '../assets/glass-theme-toggle.js';
import { stepGlassMotion, sampleGlassMotion } from '../assets/glass-motion.js';

/* Mounts the page-level theme toggle and describes it as a scene shape:
   a squircle thumb over a fixed track base, with the same liquid travel
   physics as the switch knob (stretch along movement, damped settle). */
export function mountThemeToggle(stage, { schedule, onThemeChange, getStrings }) {
  const host = stage.querySelector('#theme-tools');
  const toggle = createGlassThemeToggle(host, {
    bare: true,
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    ariaLabel: getStrings().themeToggle,
    onGlowFrame: schedule, // the WebGL rim light follows the arc frame by frame
  });
  const thumb = toggle.querySelector('.theme-thumb');
  const state = { x: 0, y: 0, scale: 0, sx: 0, sy: 0, tx: 0, ty: 0, lastFrame: null, tailX: null, tailTime: null, knobTail: 0, hold: 0, holdTime: null };
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
    // The thumb press grows like the switch knob, travel stretches it thin,
    // and holding it keeps squeezing the droplet narrower until release.
    sceneState(now, stageBox) {
      const track = toggle.querySelector('.theme-track').getBoundingClientRect();
      const rect = thumb.getBoundingClientRect();
      const press = state.scale || 0;
      const dt = Math.min(64, now - (state.holdTime ?? now));
      state.holdTime = now;
      const holdGoal = pressTarget === 1 ? 1 : 0;
      state.hold += (holdGoal - state.hold) * (1 - Math.exp(-dt / (holdGoal ? 300 : 130)));
      if (state.hold < .004) state.hold = 0;
      if (state.hold > .996) state.hold = 1;
      const squeeze = state.hold * press;
      const centreX = rect.left + rect.width / 2;
      const motion = sampleGlassMotion(state, centreX, rect.top + rect.height / 2, now, reduced.matches);
      // Keep the tail's sample separate from sampleGlassMotion's contact sample.
      const dx = state.tailX == null ? 0 : centreX - state.tailX;
      const elapsed = Math.max(8, Math.min(45, now - (state.tailTime ?? now)));
      const target = reduced.matches ? 0 : Math.max(-32, Math.min(32, dx / elapsed * 28));
      const tail = state.knobTail || 0;
      const response = 1 - Math.exp(-elapsed / (Math.abs(target) > Math.abs(tail) ? 29 : 66));
      state.knobTail = tail + (target - tail) * response;
      if (reduced.matches || Math.abs(state.knobTail) < .16) state.knobTail = 0;
      state.tailX = centreX;
      state.tailTime = now;
      const width = rect.width + 26 * press - 44 * squeeze;
      const height = rect.height + 10 * press + 9 * squeeze - Math.min(9, Math.abs(state.knobTail) * .29);
      const tint = Number.isFinite(toggle.glowProgress) ? toggle.glowProgress : (toggle.theme === 'dark' ? 0 : 1);
      return {
        base: {
          x: track.left - stageBox.left + track.width / 2,
          y: track.top - stageBox.top + track.height / 2,
          width: track.width, height: track.height,
          light: 90 + toggle.glowRotation, // rim light rides the arc's angle
          tint, // slow hue drift of the resting glass
          glow: [.455 + .545 * tint, .51 + .18 * tint, 1 - .75 * tint], // current arc color
        },
        shape: {
          x: rect.left - stageBox.left + rect.width / 2,
          y: rect.top - stageBox.top + rect.height / 2,
          width, height,
          radius: Math.min(width, height) * .40,
          press, motion,
          stretchX: Math.round(state.knobTail * 10) / 10,
          contactX: rect.left + rect.width / 2, contactY: rect.top + rect.height / 2,
        },
        settling: state.knobTail !== 0 || (state.hold > 0 && state.hold < 1),
      };
    },
  };
}
