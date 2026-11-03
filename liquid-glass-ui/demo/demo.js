import { GlassScene, PRESETS } from '../assets/liquid-glass-renderer.js';

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
    return [
      glass('lens', '', '58%', '18%'),
      glass('switch', '<span class="track"></span><span class="knob"></span>', '39%', '27%'),
      glass('slider', '<span class="track"></span><span class="thumb"></span><input aria-label="Glass level" type="range" min="0" max="100" value="28">', '12%', '57%'),
      glass('panel', '', '43%', '43%'),
      glass('pill', '', '68%', '34%'),
      glass('segment', '<span class="selection"></span>' + ['Day', 'Week', 'Month'].map((name, index) => `<button type="button" aria-pressed="${index === 0}">${name}</button>`).join(''), '16%', '76%')
    ];
  },
  controls() {
    return [
      glass('card', `${icon(icons.play, 'Play')}<span class="text"><strong>A good machine</strong><small>makes room</small></span>`, '34%', '43%'),
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
  ios() {
    const toggle = document.createElement('button');
    toggle.className = 'glass switch'; toggle.type = 'button'; toggle.setAttribute('aria-pressed', 'false'); toggle.setAttribute('aria-label', 'Glass setting'); toggle.style.left = 'calc(50% - 46px)'; toggle.style.top = '34%';
    toggle.innerHTML = '<span class="track"></span><span class="knob"></span>';
    toggle.addEventListener('click', () => { const on = toggle.getAttribute('aria-pressed') === 'true'; toggle.setAttribute('aria-pressed', String(!on)); status.textContent = on ? 'Switch off.' : 'Switch on.'; });
    const slider = glass('slider', '<span class="track"></span><span class="thumb"></span><input aria-label="Glass level" type="range" min="0" max="100" value="35">', '50%', '49%');
    const thumb = slider.querySelector('.thumb');
    const placeThumb = () => { const input = slider.querySelector('input'); thumb.style.translate = `${18 + (slider.clientWidth - 94) * input.value / 100}px 0`; };
    slider.querySelector('input').addEventListener('input', placeThumb);
    slider.querySelector('input').addEventListener('input', event => { status.textContent = `Level ${event.target.value}.`; });
    const segment = document.createElement('div'); segment.className = 'glass segment'; segment.style.left = 'calc(50% - 160px)'; segment.style.top = '63%'; segment.setAttribute('role', 'group'); segment.setAttribute('aria-label', 'Period');
    segment.innerHTML = '<span class="selection"></span>' + ['Day', 'Week', 'Month'].map((name, index) => `<button type="button" aria-pressed="${index === 0}">${name}</button>`).join('');
    const selection = segment.querySelector('.selection');
    segment.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => { segment.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); selection.style.translate = `${index * 100}% 0`; status.textContent = `${button.textContent} selected.`; }));
    return [toggle, slider, segment];
  }
};
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
const presses = new WeakMap();
function show(name) {
  drag = null;
  cancelAnimationFrame(pressFrame);
  root.replaceChildren(...layouts[name]());
  pieces = [...root.children];
  pieces.forEach(piece => presses.set(piece, { x: 0, y: 0, scale: 0 }));
  document.querySelectorAll('#layouts [data-layout]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layout === name)));
  bind();
  schedule();
}
function activePress(piece) {
  return piece.matches(':active') || Boolean(piece.querySelector(':active')) || piece.querySelector('button.is-held, input.is-held') ? 1 : 0;
}
function draw() {
  frame = 0;
  const opaque = !scene.available || matchMedia('(prefers-reduced-transparency: reduce), (forced-colors: active)').matches;
  stage.classList.toggle('fallback', opaque);
  document.querySelector('#scene').hidden = opaque;
  if (opaque) return;
  const box = stage.getBoundingClientRect();
  scene.setShapes(pieces.map(piece => {
    const rect = piece.getBoundingClientRect();
    const press = presses.get(piece)?.scale || 0;
    const grow = 1 + press * .08;
    piece.style.scale = grow.toFixed(3);
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width * grow, height: rect.height * grow, radius: Math.min(rect.width, rect.height) / 2, press };
  }));
  scene.setMaterial(PRESETS.apple);
  scene.render();
}
function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
let pressFrame = 0;
function animatePress() {
  pressFrame = 0;
  let moving = false;
  for (const piece of pieces) {
    const state = presses.get(piece);
    const target = activePress(piece);
    state.scale = reduced.matches ? target : state.scale + (target - state.scale) * .22;
    if (Math.abs(state.scale - target) < .01) state.scale = target; else moving = true;
  }
  schedule();
  if (moving) pressFrame = requestAnimationFrame(animatePress);
}
function startPress() { if (!pressFrame) pressFrame = requestAnimationFrame(animatePress); }
function movePiece(piece, x, y) {
  const state = presses.get(piece);
  state.x = x; state.y = y;
  piece.style.transform = `translate(${x}px, ${y}px)`;
  schedule();
}
function bind() {
  for (const piece of pieces) {
    piece.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('#layouts')) return;
      if (event.target.closest('button, input') && !piece.matches('.switch, .segment')) return;
      const state = presses.get(piece);
      const base = piece.style.left === '50%' ? { x: -piece.offsetWidth / 2, y: -piece.offsetHeight / 2 } : { x: 0, y: 0 };
      drag = { piece, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: state.x + base.x, originY: state.y + base.y };
      if (event.pointerId) piece.setPointerCapture(event.pointerId);
    });
    piece.addEventListener('pointermove', event => {
      if (drag?.piece !== piece || drag.pointerId !== event.pointerId) return;
      movePiece(piece, drag.originX + event.clientX - drag.x, drag.originY + event.clientY - drag.y);
    });
    const stopDrag = event => { if (!event || drag?.pointerId === event.pointerId) drag = null; };
    piece.addEventListener('pointerup', stopDrag);
    piece.addEventListener('pointercancel', stopDrag);
    piece.addEventListener('lostpointercapture', () => { drag = null; });
    piece.addEventListener('keydown', event => {
      const step = event.shiftKey ? 24 : 8;
      const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!move || event.target !== piece) return;
      event.preventDefault();
      const state = presses.get(piece);
      movePiece(piece, state.x + move[0], state.y + move[1]);
    });
  }
  root.querySelectorAll('button, input').forEach(control => {
    control.addEventListener('pointerdown', () => { control.classList.add('is-held'); startPress(); });
    for (const type of ['pointerup', 'pointercancel', 'blur']) control.addEventListener(type, () => { control.classList.remove('is-held'); startPress(); });
  });
}
document.querySelector('#layouts').addEventListener('click', event => {
  const button = event.target.closest('[data-layout]');
  if (button) show(button.dataset.layout);
});
window.addEventListener('resize', schedule);
scene.setMaterial(PRESETS.apple);
const image = new Image();
image.src = new URL('../assets/glass-backdrop.svg', import.meta.url).href;
image.decode().then(() => { scene.setSource(image); schedule(); }).catch(() => { scene.available = false; schedule(); });
show('scene');
window.glassDemo = { get available() { return scene.available; }, get material() { return { ...PRESETS.apple }; }, get source() { return image.complete; }, get layout() { return document.querySelector('[data-layout][aria-pressed="true"]').dataset.layout; } };
