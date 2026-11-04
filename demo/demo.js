import { GlassScene, PRESETS } from '../assets/liquid-glass-renderer.js';
import { mountButtonEditor } from './button-editor.js';

const exportNode = document.querySelector('#glass-button-config');
const exported = exportNode ? JSON.parse(exportNode.textContent) : null;
let material = exported?.material ?? { ...PRESETS.apple, clearControls: true };
let language = exported?.language === 'zh' ? 'zh' : 'en';
let presetKey = 'apple';
const stageLabels = {
  en: { button:'Glass button', switch:'Glass setting', slider:'Glass level', period:'Period', periods:['Day','Week','Month'] },
  zh: { button:'玻璃按钮', switch:'玻璃开关', slider:'玻璃滑块', period:'时间范围', periods:['日','周','月'] }
};
const chinesePresets = {
  apple: ['苹果液态玻璃','柔化背景细节，边缘带有轻微折射。'],
  clear: ['苹果透明玻璃','保留背景细节，并压暗玻璃周围。'],
  thick: ['厚透镜','中心放大，宽边缘产生明显折射。'],
  frosted: ['磨砂玻璃','柔化背景细节，保留底色。'],
  plain: ['纯透镜','保留清晰折射，无模糊、雾化或染色。'],
  prism: ['棱镜','玻璃边缘出现明显的色散。']
};
const descriptions = {
  apple: 'Softens background detail and adds a light refractive edge.',
  clear: 'Keeps detail visible and dims the surrounding scene.',
  thick: 'Magnifies the center and strongly bends the image at its wide edge.',
  frosted: 'Softens detail while retaining the color of the backdrop.',
  plain: 'A sharp lens with no blur, haze, or tint.',
  prism: 'Separates colors strongly along the refractive edge.'
};
const scene = new GlassScene(document.querySelector('#scene'));
const stage = document.querySelector('#stage');
const root = document.querySelector('#controls');
if (exported) {
  stage.style.width = exported.stage.width + 'px';
  stage.style.height = exported.stage.height + 'px';
  stage.style.backgroundImage = 'url("' + exported.backdrop + '")';
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let nextButtonId = 1;
function shapeRadius(shape, width, height) {
  const half = Math.min(width,height)/2;
  if (shape === 'square') return 0;
  if (shape === 'rounded') return Math.min(16,half);
  return half;
}
function createEditableButton(config = {}) {
  const button = document.createElement('button');
  button.className = 'glass probe';
  button.type = 'button';
  button.dataset.buttonId = config.id ?? String(nextButtonId++);
  button.dataset.shape = config.shape ?? 'circle';
  button.toggleAttribute('data-export-selected',exported?.selected===button.dataset.buttonId);
  setButtonText(button,config.text ?? '');
  if (config.width != null) setButtonGeometry(button,button.dataset.shape,config.width,config.height);
  if (config.x != null) {
    button.style.left = config.x + 'px';
    button.style.top = config.y + 'px';
  }
  return button;
}
function setButtonText(button,text) {
  button.textContent = text;
  button.setAttribute('aria-label',text || stageLabels[language].button);
}
function setButtonGeometry(button,shape,width,height) {
  button.dataset.shape = shape;
  button.style.width = width + 'px';
  button.style.height = height + 'px';
  button.style.setProperty('--button-radius',shapeRadius(shape,width,height)+'px');
}
function makeScene() {
  const controls = exported?.controls;
  const buttons = exported?.buttons.map(createEditableButton) ?? [createEditableButton()];
  return [makeSwitch(controls?.switchOn ?? true),makeSlider(controls?.level ?? 35),
    makeSegment(controls?.segment ?? 0),...buttons];
}
function makeSwitch(on) {
  const button = document.createElement('button');
  button.className = 'glass switch';
  button.type = 'button';
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-checked', String(on));
  Object.assign(button.style, {left: '50%', top: '36.8%', transform: 'translate(-50%, -50%)'});
  button.innerHTML = '<span class="track" aria-hidden="true"></span><span class="knob" aria-hidden="true"></span>';
  const commit = next => {
    on = next;
    button.setAttribute('aria-checked', String(on));
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
  // Keep the ends in segment units so a resize also resizes an in-flight lens.
  let travel = { left: selected, right: selected+1, to: selected, started: 0, duration: 0 };
  const ease = progress => {
    const t = Math.max(0,Math.min(1,progress));
    return t*t*(3-2*t);
  };
  let gesture;
  let suppressClick = false;
  segment.selectionAt = now => {
    if (gesture?.moved) return {left:gesture.center-.5,right:gesture.center+.5,moving:false,dragging:true};
    if (reduced.matches) travel.duration = 0;
    const t = !travel.duration ? 1 : Math.min(1,(now-travel.started)/travel.duration);
    const leading = ease(t/.69);
    const trailing = ease((t-.22)/.78);
    const rightward = travel.to+.5 >= (travel.left+travel.right)/2;
    const left = travel.left + (travel.to-travel.left)*(rightward ? trailing : leading);
    const right = travel.right + (travel.to+1-travel.right)*(rightward ? leading : trailing);
    return {left,right,moving:t<1};
  };
  const buttons = stageLabels[language].periods.map((name, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.setAttribute('aria-pressed', String(index === selected));
    button.addEventListener('click', event => {
      if (event.detail && suppressClick) {
        suppressClick = false;
        return;
      }
      select(index);
    });
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary) return;
      suppressClick = false;
      if (index !== selected) return;
      const {left,right}=segment.selectionAt(performance.now());
      const center=(left+right)/2;
      gesture={id:event.pointerId,start:event.clientX,origin:center,center,moved:false};
    });
    button.addEventListener('pointermove', event => {
      if (gesture?.id !== event.pointerId) return;
      if (!(event.buttons & 1)) { finish(event,true); return; }
      const dx=event.clientX-gesture.start;
      if (!gesture.moved) {
        if (Math.abs(dx)<5) return;
        gesture.moved=true;
        button.setPointerCapture(event.pointerId);
      }
      const cell=segment.getBoundingClientRect().width/3;
      gesture.center=Math.max(.5,Math.min(2.5,gesture.origin+dx/cell));
      schedule();
    });
    const finish = (event,cancelled) => {
      if (gesture?.id !== event.pointerId) return;
      const preview=gesture;
      gesture=undefined;
      if (!preview.moved) return;
      suppressClick=true;
      select(cancelled ? selected : Math.floor(preview.center),{
        left:preview.center-.5,right:preview.center+.5
      });
    };
    button.addEventListener('pointerup', event=>finish(event,false));
    button.addEventListener('pointercancel', event=>finish(event,true));
    button.addEventListener('lostpointercapture', event=>finish(event,true));
    return button;
  });
  function select(index, preview) {
    if (preview || index !== selected) {
      const now=performance.now();
      const {left,right}=preview ?? segment.selectionAt(now);
      const distance=Math.abs(index+.5-(left+right)/2);
      travel={left,right,to:index,started:now,duration:Math.min(500,350+distance*65)};
      selected=index;
      buttons.forEach((item,i)=>item.setAttribute('aria-pressed',String(index===i)));
      schedule();
    }
  }
  segment.style.setProperty('--selection-offset', (selected * 100 / 3) + '%');
  segment.append(...buttons);
  return segment;
}
function makeSlider(value) {
  const piece = glass('slider', `<span class="track" aria-hidden="true"></span><span class="thumb" aria-hidden="true"></span><input aria-label="Glass level" type="range" min="0" max="100" value="${value}">`, '50%', '50%');
  piece.removeAttribute('tabindex');
  piece.removeAttribute('aria-label');
  const input = piece.querySelector('input');
  input.value = value;
  input.addEventListener('input', schedule);
  return piece;
}

function glass(kind, html, x, y) {
  const element = document.createElement('div');
  element.className = `glass ${kind}`;
  element.dataset.glass = kind;
  element.tabIndex = 0;
  element.setAttribute('aria-label', `${kind} glass. Arrow keys move it.`);
  element.innerHTML = html;
  element.style.left = x; element.style.top = y;
  if (x === '50%') element.style.transform = 'translate(-50%, -50%)';
  return element;
}
let pieces = [];
let drag = null;
let frame = 0;
let transitionUntil = 0;
const presses = new WeakMap();
function showScene() {
  root.replaceChildren(...makeScene());
  pieces = [...root.children];
  pieces.forEach(initPiece);
  bind();
  schedule();
}
function initPiece(piece) {
  presses.set(piece,{x:0,y:0,scale:0,sx:0,sy:0,tx:0,ty:0,base:piece.style.transform});
}
function activePress(piece, now) {
  if (presses.get(piece).tapUntil > now) return 1;
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
      const elapsed = Math.max(8,Math.min(45,now-(state.sampleTime ?? now)));
      const motion = motionAt(geometry.x,geometry.y);
      const canTrail = extra.slider || extra.surface === 'switch' || (extra.surface === 'selection' && (extra.dragging || state.knobTail));
      if (canTrail) {
        const target = reduced.matches || (extra.surface === 'selection' && !extra.dragging)
          ? 0 : Math.max(-32,Math.min(32,dx/elapsed*28));
        const tail = state.knobTail || 0;
        const response = 1-Math.exp(-elapsed/(Math.abs(target)>Math.abs(tail)?29:66));
        state.knobTail = tail+(target-tail)*response;
        if (reduced.matches || Math.abs(state.knobTail)<.16) state.knobTail=0;
        colorSettling ||= state.knobTail!==0;
      }
      const stretchX = canTrail ? state.knobTail : state.sx;
      // Narrow the cross-section as the tail extends, then restore it as motion decays.
      const height = geometry.height - (canTrail ? Math.min(9,Math.abs(stretchX)*.29) : 0);
      const radius = Math.min(geometry.radius,height/2);
      return {...geometry,height,radius,...extra,...touch,press,motion,stretchX,stretchY:state.sy};
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
      const height = 39 + press * 19;
      return liquidSurface({ x: fillX, y, width: 60 + press * 60, height, radius: height / 2 },{slider:true});
    }
    const toggle = piece.matches('.switch');
    const segment = piece.matches('.segment');
    const boxFor = bounds => ({ x: bounds.left - box.left + bounds.width / 2, y: bounds.top - box.top + bounds.height / 2, width: bounds.width, height: bounds.height });
    if (toggle || segment) {
      const base = boxFor(rect);
      if (toggle) bases.toggle = { ...base, on: piece.getAttribute('aria-checked') === 'true' };
      else bases.segment = base;
      let knob;
      let dragging = false;
      if (toggle) {
        knob = boxFor(piece.querySelector('.knob').getBoundingClientRect());
        knob.width += 42*press;
        knob.height += 16*press;
      } else {
        const selection = piece.selectionAt(now);
        const {left,right,moving} = selection;
        dragging = selection.dragging;
        const extension = Math.max(0,right-left-1);
        const cell = rect.width/3;
        const width = Math.max(24,(right-left)*cell-6) + 54*press;
        const height = 52 + 19*press - Math.min(9,extension*9);
        const center = (left+right)*cell/2;
        knob = {x:rect.left-box.left+center,y:base.y,width,height};
        piece.style.setProperty('--selection-offset', (center-width/2-3) + 'px');
        piece.style.setProperty('--selection-width', width + 'px');
        piece.style.setProperty('--selection-height', height + 'px');
        if (moving) schedule();
      }
      const surface = liquidSurface({...knob,radius:knob.height/2},{surface:toggle?'switch':'selection',dragging});
      if (segment) {
        const open = Math.max(press,surface.motion) > .58;
        piece.style.setProperty('--selection-ink', open && material.presetOptics ? '#fff' : '#202427');
        piece.style.setProperty('--selection-halo', open && !material.presetOptics ? '0 0 2px rgb(255 255 255 / .24)' : 'none');
      }
      return surface;
    }
    const isCircle = piece.dataset.shape === 'circle';
    const grow = 1 + press * (isCircle ? .30 : .15);
    const geometry = boxFor(rect);
    geometry.width *= grow;
    geometry.height *= grow;
    const radius = shapeRadius(piece.dataset.shape,geometry.width,geometry.height);
    return liquidSurface({...geometry,radius},isCircle ? {surface:'lens'} : {});
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
    const target = activePress(piece, now);
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
    if (state.tapUntil > now) moving = true;
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
function bind(targets = pieces) {
  for (const piece of targets) {
    piece.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      if (piece.matches('.switch, .slider, .segment') || event.target.closest('input')) return;
      const state = presses.get(piece);
      const innerButton = event.target.closest('button');
      state.skipClick = false;
      state.tapUntil = 0;
      state.contactX = event.clientX;
      state.contactY = event.clientY;
      drag = { piece, innerButton: innerButton !== piece ? innerButton : null, moved: false, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: state.x, originY: state.y, lastX: event.clientX, lastY: event.clientY, time: performance.now() };
      if (event.pointerId && !drag.innerButton) piece.setPointerCapture(event.pointerId);
      startPress();
    });
    piece.addEventListener('pointermove', event => {
      if (drag?.piece !== piece || drag.pointerId !== event.pointerId) return;
      const firstMove = !drag.moved;
      if (firstMove) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
        drag.moved = true;
        if (drag.innerButton && event.pointerId) piece.setPointerCapture(event.pointerId);
      }
      const now = performance.now();
      const elapsed = Math.max(8, firstMove ? Math.min(34, now-drag.time) : now-drag.time);
      const dx = event.clientX - drag.lastX, dy = event.clientY - drag.lastY;
      const state = presses.get(piece);
      const distance = Math.hypot(dx,dy);
      const factor = Math.min(31/elapsed, 42/Math.max(1,distance));
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
      const state = presses.get(piece);
      state.skipClick = drag.moved;
      if (piece.matches('.probe') && event.type === 'pointerup' && !drag.moved && !reduced.matches) {
        state.tapUntil = drag.time + 145;
      }
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
    if (piece.matches('.probe')) piece.addEventListener('click', event => {
      if (event.detail !== 0 || reduced.matches) return;
      presses.get(piece).tapUntil = performance.now()+145;
      startPress();
    });
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
  const controls = targets.flatMap(piece => piece.matches('.probe') ? [] : [
    ...(piece.matches('button,input') ? [piece] : []), ...piece.querySelectorAll('button,input')
  ]);
  controls.forEach(control => {
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
let sourceReady = false;
const wallpapers = [...document.querySelectorAll('[data-wallpaper]')];
let backdropRequest = 0;
async function setBackdrop(image, selected) {
  const request = ++backdropRequest;
  try {
    await image.decode();
    if (request !== backdropRequest) return;
    if (scene.available) scene.setSource(image);
    stage.style.setProperty('--stage-wallpaper', `url("${image.src}")`);
    for (const button of wallpapers) button.setAttribute('aria-pressed',String(button === selected));
    sourceReady = true;
    schedule();
  } catch {
    if (request !== backdropRequest || sourceReady) return;
    if (selected && selected.dataset.wallpaper !== 'grid') {
      const grid = wallpapers.find(button=>button.dataset.wallpaper==='grid');
      selectWallpaper(grid);
    } else {
      scene.available=false;
      schedule();
    }
  }
}
function selectWallpaper(button) {
  const image = new Image();
  image.src = button.querySelector('img').src;
  return setBackdrop(image,button);
}
for (const button of wallpapers) button.addEventListener('click',()=>selectWallpaper(button));
if (exported) {
  const image = new Image();
  image.src = exported.backdrop;
  setBackdrop(image);
} else {
  selectWallpaper(wallpapers[0]);
}
const options = document.querySelector('#preset-options');
const presetDescription = document.querySelector('#preset-description');
function updatePresetLabels() {
  for (const button of options.children) {
    const key = button.dataset.preset;
    button.textContent = language === 'zh' ? chinesePresets[key][0] : PRESETS[key].name;
  }
  presetDescription.textContent = language === 'zh' ? chinesePresets[presetKey][1] : descriptions[presetKey];
}
function updateStageLabels() {
  const labels = stageLabels[language];
  root.querySelector('.switch').setAttribute('aria-label',labels.switch);
  root.querySelector('.slider input').setAttribute('aria-label',labels.slider);
  const segment = root.querySelector('.segment');
  segment.setAttribute('aria-label',labels.period);
  segment.querySelectorAll('button').forEach((button,index)=>button.textContent=labels.periods[index]);
  for (const button of root.querySelectorAll('.probe')) {
    button.setAttribute('aria-label',button.textContent || labels.button);
  }
}
function showPreset(key) {
  presetKey = key;
  for (const button of options.children) button.setAttribute('aria-pressed',String(button.dataset.preset === key));
  updatePresetLabels();
  material = {...PRESETS[key],clearControls:true,presetOptics:key !== 'apple'};
  schedule();
}
for (const key of exported ? [] : Object.keys(PRESETS)) {
  const button=document.createElement('button');
  button.type='button';
  button.dataset.preset=key;
  button.addEventListener('click',()=>showPreset(key));
  options.append(button);
}
if (!exported) showPreset('apple');
showScene();
updateStageLabels();
if (!exported) {
  mountButtonEditor({
    root, setButtonText,
    setButtonGeometry(button,shape,width,height) {
      const state = presses.get(button);
      const before = button.getBoundingClientRect();
      setButtonGeometry(button,shape,width,height);
      const after = button.getBoundingClientRect();
      movePiece(button,state.x+(before.width-after.width)/2,state.y+(before.height-after.height)/2);
    },
    onLanguageChange(next) {
      language = next;
      updateStageLabels();
      updatePresetLabels();
    },
    addButton() {
      if (pieces.length >= 8) return null;
      const offset = (pieces.length-4)*18;
      const button = createEditableButton({
        shape:'capsule',width:132,height:56,
        x:Math.max(12,stage.clientWidth/2-66+offset),y:64+offset
      });
      root.append(button);
      pieces.push(button);
      initPiece(button);
      bind([button]);
      schedule();
      return button;
    },
    snapshot(button) {
      const {width,height} = button.getBoundingClientRect();
      const shape = button.dataset.shape;
      return {
        version:2, language,
        button:{shape,text:button.textContent,width,height,radius:shapeRadius(shape,width,height)},
        material:{...material}
      };
    }
  });
}
window.glassDemo = { get available() { return scene.available; }, get material() { return { ...material }; }, get source() { return sourceReady; }, get slider() { const knob = scene.shapes.find(shape => shape.slider); return knob && { knob: { ...knob }, track: { ...scene.sliderTrack } }; }, get shapes() { return scene.shapes.map(shape => ({ ...shape })); }, get bases() { return structuredClone(scene.controlBases); } };
