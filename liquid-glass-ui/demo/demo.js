import { GlassScene, PRESETS } from '../assets/liquid-glass-renderer.js';

const material = { ...PRESETS.apple, clearControls: true };
const scene = new GlassScene(document.querySelector('#scene'));
const stage = document.querySelector('#stage');
const root = document.querySelector('#controls');
const status = document.querySelector('#status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const icon = (paths, label) => `<button type="button" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg></button>`;
const icons = {
  play: '<path d="M8 6v12l10-6z"/>',
  home: '<path d="M4 11 12 4l8 7M6 10v9h12v-9"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  signal: '<circle cx="12" cy="12" r="2"/><path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>'
};
const layouts = {
  scene() {
    const piece = (kind, x, y, width, height, html = '') => {
      const element = glass(kind, html, `${x * 100}%`, `${y * 100}%`);
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      return element;
    };
    const lensA = piece('lens', .2404, .2676, 120, 120);
    const lensB = piece('lens', .2154, .4918, 120, 120);
    const toggle = makeSwitch(true);
    const slider = makeSlider(82);
    const segment = makeSegment(2);
    const panel = piece('panel', .6676, .7505, 220, 150);
    const pill = piece('pill', .7404, .2075, 200, 64);
    return [lensA, lensB, toggle, slider, segment, panel, pill];
  },
  controls() {
    return [
      glass('card', `${icon(icons.play, 'Play')}<span class="text"><strong>A good machine</strong><small>makes room</small></span>`, '50%', '42%'),
      glass('dock', `${icon(icons.home, 'Home')}${icon(icons.grid, 'Grid')}${icon(icons.signal, 'Signal')}`, 'calc(50% - 174px)', 'auto', '92px'),
      glass('search', icon(icons.search, 'Search'), 'calc(50% + 112px)', 'auto', '92px'),
      glass('mini', `${icon(icons.plus, 'Add')}${icon(icons.more, 'More')}`, 'auto', '28px', '28px', '28px')
    ];
  },
  panel() { return [glass('panel', '<span class="text"><strong>Liquid glass</strong><small>Drag me around</small></span>', '50%', '34%')]; },
  lens() { return [glass('lens', '', '50%', '48%')]; },
  morph() {
    const more = glass('mini', icon(icons.more, 'More'), 'auto', '28px', '28px', '28px');
    const action = glass('pill', `${icon(icons.plus, 'Add')}<span>New</span>`, '50%', 'auto', '92px');
    action.dataset.morph = 'joined';
    action.querySelector('button').addEventListener('click', () => {
      const open = action.dataset.morph === 'open';
      action.dataset.morph = open ? 'joined' : 'open';
      action.style.scale = open ? '1' : '.72';
      more.style.translate = open ? '0 0' : '-150px 260px';
      status.textContent = open ? 'The pieces join back into one control.' : 'The control splits. Move the pieces and they merge again.';
    });
    return [more, action];
  },
  slider() { return [makeSlider(35)]; },
  ios() { return [makeSwitch(true), makeSlider(35), makeSegment(0)]; },
  merge() {
    const circle = glass('probe', '', 'calc(74% - 60px)', '42%');
    circle.setAttribute('aria-label', 'Glass test circle. Drag it or move it with the arrow keys.');
    return [...layouts.ios(), circle];
  }
};
function makeSwitch(on) {
  const button = document.createElement('button');
  button.className = 'glass switch';
  button.type = 'button';
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-checked', String(on));
  button.setAttribute('aria-label', 'Glass setting');
  Object.assign(button.style, {left: '50%', top: '36.8%', transform: 'translate(-50%, -50%)'});
  button.innerHTML = '<span class="track" aria-hidden="true"></span><span class="knob" aria-hidden="true"></span>';
  const commit = next => {
    on = next;
    button.setAttribute('aria-checked', String(on));
    status.textContent = on ? 'Switch on.' : 'Switch off.';
    followTransition();
  };
  let gesture, skipPointerClick = false;
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    skipPointerClick = false;
    gesture = { id: event.pointerId, start: event.clientX, initial: on ? 36 : 0, shift: on ? 36 : 0, moved: false };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.start;
    if (!gesture.moved && Math.abs(dx) < 4) return;
    gesture.moved = true;
    gesture.shift = Math.max(0,Math.min(36,gesture.initial+dx));
    const knob = button.querySelector('.knob');
    knob.style.transition = 'none';
    knob.style.translate = gesture.shift + 'px 0';
    schedule();
  });
  function finish(event, cancelled) {
    if (gesture?.id !== event.pointerId) return;
    if (gesture.moved) {
      skipPointerClick = true;
      const knob = button.querySelector('.knob');
      knob.style.transition = '';
      commit(cancelled ? on : gesture.shift >= 18);
      knob.style.translate = '';
    }
    gesture = null;
  }
  button.addEventListener('pointerup', event => finish(event,false));
  button.addEventListener('pointercancel', event => finish(event,true));
  button.addEventListener('lostpointercapture', event => finish(event,true));
  button.addEventListener('click', event => {
    if (!(event.detail && skipPointerClick)) commit(!on);
    skipPointerClick = false;
  });
  return button;
}
function makeSegment(selected) {
  const segment = glass('segment', '<span class="selection" aria-hidden="true"></span>', '50%', '63.2%');
  segment.removeAttribute('tabindex');
  segment.setAttribute('role', 'group');
  segment.setAttribute('aria-label', 'Period');
  // Keep the ends in segment units so a resize also resizes an in-flight lens.
  let travel = { left: selected, right: selected+1, to: selected, started: 0, duration: 0 };
  const ease = progress => {
    const t = Math.max(0,Math.min(1,progress));
    return t*t*(3-2*t);
  };
  segment.selectionAt = now => {
    const t = reduced.matches || !travel.duration ? 1 : Math.min(1,(now-travel.started)/travel.duration);
    const leading = ease(t/.69);
    const trailing = ease((t-.22)/.78);
    const rightward = travel.to+.5 >= (travel.left+travel.right)/2;
    const left = travel.left + (travel.to-travel.left)*(rightward ? trailing : leading);
    const right = travel.right + (travel.to+1-travel.right)*(rightward ? leading : trailing);
    return {left,right,moving:t<1};
  };
  const names = ['Day', 'Week', 'Month'];
  const buttons = names.map((name, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.setAttribute('aria-pressed', String(index === selected));
    button.addEventListener('click', () => {
      buttons.forEach((item, i) => item.setAttribute('aria-pressed', String(index === i)));
      if (index !== travel.to) {
        const now = performance.now();
        const { left, right } = segment.selectionAt(now);
        const distance = Math.abs(index+.5-(left+right)/2);
        travel = {left,right,to:index,started:now,duration:Math.min(500,350+distance*65)};
        schedule();
      }
      status.textContent = name + ' selected.';
    });
    return button;
  });
  segment.style.setProperty('--selection-offset', (selected * 100 / 3) + '%');
  segment.append(...buttons);
  return segment;
}
function makeSlider(value) {
  const piece = glass('slider', `<span class="track" aria-hidden="true"></span><span class="thumb" aria-hidden="true"></span><input aria-label="Glass level" type="range" min="0" max="100" value="${value}">`, '50%', '50%');
  piece.removeAttribute('tabindex');
  piece.removeAttribute('aria-label');
  const input = piece.querySelector('input');
  input.addEventListener('input', () => { status.textContent = `Level ${input.value}.`; schedule(); });
  return piece;
}

function glass(kind, html, x, y, bottom = '', right = '') {
  const element = document.createElement('div');
  element.className = `glass ${kind}`;
  element.dataset.glass = kind;
  element.tabIndex = 0;
  element.setAttribute('aria-label', `${kind} glass. Arrow keys move it.`);
  element.innerHTML = html;
  element.style.left = x; element.style.top = y;
  if (bottom) element.style.bottom = bottom;
  if (right) element.style.right = right;
  if (x === '50%') element.style.transform = 'translate(-50%, -50%)';
  return element;
}
let pieces = [];
let drag = null;
let frame = 0;
let transitionUntil = 0;
const presses = new WeakMap();
function show(name) {
  drag = null;
  cancelAnimationFrame(pressFrame);
  pressFrame = 0;
  transitionUntil = 0;
  stage.dataset.layout = name;
  selectBackdrop(name === 'merge' ? 'grid' : 'landscape');
  root.replaceChildren(...layouts[name]());
  if (name === 'merge') status.textContent = 'Drag the circle over a white knob, then over its track.';
  else status.textContent = 'Drag the glass. Buttons respond to touch.';
  pieces = [...root.children];
  pieces.forEach(piece => presses.set(piece, { x: 0, y: 0, scale: 0, sx: 0, sy: 0, tx: 0, ty: 0, base: piece.style.transform }));
  document.querySelectorAll('#layouts [data-layout]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layout === name)));
  bind();
  schedule();
}
function activePress(piece) {
  if (piece.matches('.slider')) return piece.querySelector('input').classList.contains('is-held') ? 1 : 0;
  return drag?.piece === piece || piece.matches('.is-held') || piece.querySelector('button.is-held') ? 1 : 0;
}
function draw() {
  frame = 0;
  const opaque = !scene.available || matchMedia('(prefers-reduced-transparency: reduce), (forced-colors: active)').matches;
  stage.classList.toggle('fallback', opaque);
  document.querySelector('#scene').hidden = opaque;
  const box = stage.getBoundingClientRect();
  let track = null;
  const bases = {};
  const now = performance.now();
  let colorSettling = false;
  const shapes = pieces.map(piece => {
    const rect = piece.getBoundingClientRect();
    const state = presses.get(piece);
    const press = state?.scale || 0;
    const motionAt = (x,y) => {
      const elapsed = Math.max(8, now - (state.sampleTime ?? now));
      const distance = state.sampleX == null ? 0 : Math.hypot(x-state.sampleX,y-state.sampleY);
      const target = reduced.matches ? 0 : Math.min(1,distance / elapsed * 2.3);
      const mix = 1 - Math.exp(-elapsed / (target > (state.motion || 0) ? 18 : 92));
      state.motion = reduced.matches ? 0 : (state.motion || 0) + (target - (state.motion || 0)) * mix;
      if (state.motion < .012 && target === 0) state.motion = 0;
      colorSettling ||= state.motion > 0;
      Object.assign(state,{sampleX:x,sampleY:y,sampleTime:now});
      return state.motion;
    };
    const liquidSurface = (geometry, extra = {}) => {
      const dx = state.sampleX == null ? 0 : geometry.x-state.sampleX;
      const motion = motionAt(geometry.x,geometry.y);
      // Moving selectors leave a short tail, while their native track stays fixed.
      if (extra.slider || extra.surface === 'switch') {
        const target = reduced.matches ? 0 : Math.max(-21,Math.min(21,dx*1.5));
        state.knobTail = (state.knobTail || 0) + (target-(state.knobTail || 0))*.42;
        if (reduced.matches || Math.abs(state.knobTail)<.16) state.knobTail=0;
        colorSettling ||= state.knobTail!==0;
      }
      return {...geometry,...extra,...touch,press,motion,stretchX:extra.slider||extra.surface==='switch' ? state.knobTail : state.sx,stretchY:state.sy};
    };
    const touch = press > 0 ? {contactX: state.contactX - box.left, contactY: state.contactY - box.top} : {};
    if (piece.matches('.slider')) {
      const input = piece.querySelector('input');
      const x = rect.left - box.left;
      const y = rect.top - box.top + rect.height / 2;
      const fraction = (input.valueAsNumber - Number(input.min)) / (Number(input.max) - Number(input.min));
      const fillX = x + 30 + (rect.width - 60) * fraction;
      track = { x, y, width: rect.width, height: 9, fillX };
      piece.style.setProperty('--thumb-x', (fillX - x) + 'px');
      const height = 39 + press * 12;
      return liquidSurface({ x: fillX, y, width: 60 + press * 44, height, radius: height / 2 },{slider:true});
    }
    const toggle = piece.matches('.switch');
    const segment = piece.matches('.segment');
    const boxFor = bounds => ({ x: bounds.left - box.left + bounds.width / 2, y: bounds.top - box.top + bounds.height / 2, width: bounds.width, height: bounds.height });
    if (toggle || segment) {
      const base = boxFor(rect);
      if (toggle) bases.toggle = { ...base, on: piece.getAttribute('aria-checked') === 'true' };
      else bases.segment = base;
      let knob;
      if (toggle) {
        knob = boxFor(piece.querySelector('.knob').getBoundingClientRect());
        knob.width += 24*press;
        knob.height += 9*press;
      } else {
        const {left,right,moving} = piece.selectionAt(now);
        const extension = Math.max(0,right-left-1);
        const cell = rect.width/3;
        const width = Math.max(24,(right-left)*cell-6) + 27*press;
        const height = 52 + 9*press - Math.min(9,extension*9);
        const center = (left+right)*cell/2;
        knob = {x:rect.left-box.left+center,y:base.y,width,height};
        piece.style.setProperty('--selection-offset', (center-width/2-3) + 'px');
        piece.style.setProperty('--selection-width', width + 'px');
        piece.style.setProperty('--selection-height', height + 'px');
        if (moving) schedule();
      }
      const surface = liquidSurface({...knob,radius:knob.height/2},{surface:toggle?'switch':'selection'});
      if (segment) piece.style.setProperty('--selection-ink', Math.max(press,surface.motion) > .58 ? '#fff' : '#202427');
      return surface;
    }
    const grow = 1 + press * .09;
    const geometry = boxFor(rect);
    geometry.width *= grow;
    geometry.height *= grow;
    const radius = piece.matches('.card, .panel') ? Math.min(26, geometry.height / 2) : Math.min(geometry.width, geometry.height) / 2;
    return liquidSurface({...geometry,radius});
  });
  if (opaque) return;
  scene.setSliderTrack(track);
  scene.setControlBases(bases);
  scene.setShapes(shapes);
  scene.setMaterial(material);
  scene.render();
  if (colorSettling) schedule();
}
function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
let pressFrame = 0;
function followTransition() {
  if (!reduced.matches) transitionUntil = performance.now() + 250;
  startPress();
}
function animatePress(now) {
  pressFrame = 0;
  let moving = false;
  for (const piece of pieces) {
    const state = presses.get(piece);
    const target = activePress(piece);
    const elapsed = state.lastFrame == null ? 16 : now - state.lastFrame;
    const ease = 1 - Math.exp(-elapsed / 56);
    state.scale = reduced.matches ? target : state.scale + (target - state.scale) * ease;
    if (!drag || drag.piece !== piece || now - drag.time > 105 || reduced.matches) state.tx = state.ty = 0;
    // Damped spring: the tail lags the cursor, overshoots slightly, then settles.
    for (const [value, goal, velocity] of [['sx', 'tx', 'vx'], ['sy', 'ty', 'vy']]) {
      let speed = state[velocity] || 0;
      if (!reduced.matches) {
        const dt = Math.min(elapsed, 64) / 1000;
        const steps = Math.max(1, Math.ceil(dt / .008));
        const step = dt / steps;
        for (let i = 0; i < steps; i++) {
          speed += (390 * (state[goal] - state[value]) - 22 * speed) * step;
          state[value] += speed * step;
        }
      }
      if (reduced.matches || (Math.abs(state[value] - state[goal]) < .18 && Math.abs(speed) < 5)) {
        state[value] = state[goal];
        speed = 0;
      }
      state[velocity] = speed;
      if (state[value] !== 0 || state[goal] !== 0 || speed !== 0) moving = true;
    }
    state.lastFrame = moving || Math.abs(state.scale - target) >= .01 ? now : null;
    if (Math.abs(state.scale - target) < .01) state.scale = target; else moving = true;
  }
  schedule();
  if (moving || now < transitionUntil) pressFrame = requestAnimationFrame(animatePress);
}
function startPress() { if (!pressFrame) pressFrame = requestAnimationFrame(animatePress); }
function movePiece(piece, x, y) {
  const state = presses.get(piece);
  state.x = x; state.y = y;
  piece.style.transform = `translate(${x}px, ${y}px) ${state.base}`;
  schedule();
}
function bind() {
  for (const piece of pieces) {
    piece.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('#layouts')) return;
      if (piece.matches('.switch, .slider, .segment') || event.target.closest('input')) return;
      const state = presses.get(piece);
      const innerButton = event.target.closest('button');
      state.skipClick = false;
      state.contactX = event.clientX;
      state.contactY = event.clientY;
      drag = { piece, innerButton, moved: false, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: state.x, originY: state.y, lastX: event.clientX, lastY: event.clientY, time: performance.now() };
      if (event.pointerId && !innerButton) piece.setPointerCapture(event.pointerId);
      startPress();
    });
    piece.addEventListener('pointermove', event => {
      if (drag?.piece !== piece || drag.pointerId !== event.pointerId) return;
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
        drag.moved = true;
        if (drag.innerButton && event.pointerId) piece.setPointerCapture(event.pointerId);
      }
      const now = performance.now();
      const elapsed = Math.max(8, now - drag.time);
      const dx = event.clientX - drag.lastX, dy = event.clientY - drag.lastY;
      const factor = Math.min(31 / elapsed, 42 / Math.max(1, Math.hypot(dx, dy)));
      const state = presses.get(piece);
      if (!reduced.matches) {
        state.tx = dx * factor;
        state.ty = dy * factor;
        // Apply part of the impulse immediately so short gestures still deform the contour.
        state.sx += (state.tx - state.sx) * .48;
        state.sy += (state.ty - state.sy) * .42;
      }
      state.contactX = event.clientX;
      state.contactY = event.clientY;
      Object.assign(drag, {lastX: event.clientX, lastY: event.clientY, time: now});
      movePiece(piece, drag.originX + event.clientX - drag.x, drag.originY + event.clientY - drag.y);
      startPress();
    });
    const stopDrag = event => {
      if (drag?.piece !== piece || drag.pointerId !== event.pointerId) return;
      presses.get(piece).skipClick = drag.moved;
      drag = null;
      startPress();
    };
    piece.addEventListener('click', event => {
      const state = presses.get(piece);
      if (state.skipClick && event.detail > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.skipClick = false;
      }
    }, true);
    piece.addEventListener('pointerup', stopDrag);
    piece.addEventListener('pointercancel', stopDrag);
    piece.addEventListener('lostpointercapture', stopDrag);
    piece.addEventListener('keydown', event => {
      const step = event.shiftKey ? 24 : 8;
      const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!move || event.target !== piece || piece.matches('.switch, .slider, .segment')) return;
      event.preventDefault();
      const state = presses.get(piece);
      movePiece(piece, state.x + move[0], state.y + move[1]);
    });
  }
  root.querySelectorAll('button, input').forEach(control => {
    control.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const state = presses.get(control.closest('.glass'));
      state.contactX = event.clientX;
      state.contactY = event.clientY;
      control.classList.add('is-held');
      startPress();
    });
    control.addEventListener('pointermove', event => {
      if (!control.classList.contains('is-held')) return;
      const state = presses.get(control.closest('.glass'));
      state.contactX = event.clientX;
      state.contactY = event.clientY;
      schedule();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) control.addEventListener(type, () => { control.classList.remove('is-held'); startPress(); });
  });
}
document.querySelector('#layouts').addEventListener('click', event => {
  const button = event.target.closest('[data-layout]');
  if (button) show(button.dataset.layout);
});
function releaseControls() {
  const held = root.querySelectorAll('.is-held');
  held.forEach(control => control.classList.remove('is-held'));
  if (held.length) startPress();
}
for (const event of ['pointerup', 'pointercancel']) window.addEventListener(event, e => {
  if (drag?.pointerId === e.pointerId) { drag = null; startPress(); }
  releaseControls();
});
window.addEventListener('blur', () => { drag = null; releaseControls(); startPress(); });
for (const query of ['(prefers-reduced-transparency: reduce)', '(forced-colors: active)']) matchMedia(query).addEventListener('change', schedule);
document.querySelector('#scene').addEventListener('glassfallback', schedule);
window.addEventListener('resize', schedule);
scene.setMaterial(material);
const backdrops = new Map();
let backdropName, sourceReady = false;
function selectBackdrop(name) {
  if (name === backdropName) return;
  backdropName = name;
  sourceReady = false;
  if (!backdrops.has(name)) {
    const image = new Image();
    image.src = new URL(name === 'grid' ? '../assets/glass-grid.svg' : '../assets/glass-backdrop.svg', import.meta.url).href;
    backdrops.set(name, image.decode().then(() => image));
  }
  backdrops.get(name).then(image => {
    if (backdropName !== name) return;
    scene.setSource(image);
    sourceReady = true;
    schedule();
  }).catch(() => { if (backdropName === name) { scene.available = false; schedule(); } });
}
const requestedLayout = new URLSearchParams(location.search).get('layout');
show(Object.hasOwn(layouts, requestedLayout) ? requestedLayout : 'scene');
window.glassDemo = { get available() { return scene.available; }, get material() { return { ...material }; }, get source() { return sourceReady; }, get slider() { const knob = scene.shapes.find(shape => shape.slider); return knob && { knob: { ...knob }, track: { ...scene.sliderTrack } }; }, get shapes() { return scene.shapes.map(shape => ({ ...shape })); }, get bases() { return structuredClone(scene.controlBases); }, get layout() { return document.querySelector('[data-layout][aria-pressed="true"]').dataset.layout; } };
