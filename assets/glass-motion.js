/* Shared liquid-glass motion model. MIT. */
export function stepGlassMotion(state, target, now, dragging, reduced) {
  let moving = false;
  const elapsed = state.lastFrame == null ? 16 : now - state.lastFrame;
  const ease = 1 - Math.exp(-elapsed / 56);
  state.scale = reduced ? target : state.scale + (target - state.scale) * ease;
  if (!dragging || reduced) state.tx = state.ty = 0;
  // Damped spring: the tail lags the cursor, overshoots slightly, then settles.
  for (const [value, goal, velocity] of [['sx', 'tx', 'vx'], ['sy', 'ty', 'vy']]) {
    let speed = state[velocity] || 0;
    if (!reduced) {
      const dt = Math.min(elapsed, 64) / 1000;
      const steps = Math.max(1, Math.ceil(dt / .008));
      const step = dt / steps;
      for (let i = 0; i < steps; i++) {
        speed += (390 * (state[goal] - state[value]) - 22 * speed) * step;
        state[value] += speed * step;
      }
    }
    if (reduced || (Math.abs(state[value] - state[goal]) < .18 && Math.abs(speed) < 5)) {
      state[value] = state[goal];
      speed = 0;
    }
    state[velocity] = speed;
    if (state[value] !== 0 || state[goal] !== 0 || speed !== 0) moving = true;
  }
  state.lastFrame = moving || Math.abs(state.scale - target) >= .01 ? now : null;
  if (Math.abs(state.scale - target) < .01) state.scale = target; else moving = true;
  return moving;
}

export function applyGlassImpulse(state, dx, dy, elapsed, reduced) {
  const distance = Math.hypot(dx,dy);
  const factor = Math.min(31/elapsed, 42/Math.max(1,distance));
  if (!reduced) {
    state.tx = dx * factor;
    state.ty = dy * factor;
    // Apply part of the impulse immediately so short gestures still deform the contour.
    state.sx += (state.tx - state.sx) * .48;
    state.sy += (state.ty - state.sy) * .42;
  }
}

export function sampleGlassMotion(state, x, y, now, reduced) {
  const elapsed = Math.max(8, now - (state.sampleTime ?? now));
  const distance = state.sampleX == null ? 0 : Math.hypot(x-state.sampleX,y-state.sampleY);
  const target = reduced ? 0 : Math.min(1,distance / elapsed * 2.3);
  const mix = 1 - Math.exp(-elapsed / (target > (state.motion || 0) ? 18 : 92));
  state.motion = reduced ? 0 : (state.motion || 0) + (target - (state.motion || 0)) * mix;
  if (state.motion < .012 && target === 0) state.motion = 0;
  Object.assign(state,{sampleX:x,sampleY:y,sampleTime:now});
  return state.motion;
}
