import { GlassScene, PRESETS } from '../assets/liquid-glass-renderer.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const stage = $('stage');
const scene = new GlassScene(canvas);
const controls = [...document.querySelectorAll('[data-glass]')];
let material = { ...PRESETS.apple };
let source;
let imageURL = null;
let loadVersion = 0;
let frame = 0;
let drag = null;
let toastTimer;
const positions = new Map(controls.map(control => [control, { x: 0, y: 0 }]));
const presses = new Map(controls.map(control => [control, 0]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function notify(text) {
  clearTimeout(toastTimer);
  $('toast').textContent = text;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2400);
}
function opaqueMode() {
  return matchMedia('(prefers-reduced-transparency: reduce)').matches || matchMedia('(forced-colors: active)').matches;
}
matchMedia('(forced-colors: active)').addEventListener('change', schedule);
matchMedia('(prefers-reduced-transparency: reduce)').addEventListener('change', schedule);
function draw() {
  frame = 0;
  const opaque = opaqueMode() || !scene.available;
  canvas.hidden = opaque;
  stage.classList.toggle('fallback', opaque);
  $('renderer-note').textContent = opaque ? 'Refraction is unavailable, so the controls use an opaque fallback.' : `WebGL refraction is live · shapes merge within ${material.merge} px.`;
  if (opaque) return;
  const box = canvas.getBoundingClientRect();
  scene.setShapes(controls.map(control => {
    const rect = control.getBoundingClientRect();
    const press = presses.get(control);
    const grow = material.interactive ? 1 + press * .08 : 1;
    return { x: rect.left+rect.width/2-box.left, y: rect.top+rect.height/2-box.top, width: rect.width*grow, height: rect.height*grow, radius: Math.min(rect.width, rect.height)/2*grow, press };
  }));
  scene.setMaterial(material);
  scene.render();
}
function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
function springPress() {
  let moving = false;
  for (const control of controls) {
    const target = control.querySelector('button.is-held') ? 1 : 0;
    let value = presses.get(control);
    value = reduceMotion.matches ? target : value + (target - value) * .28;
    if (Math.abs(target - value) < .01) value = target; else moving = true;
    presses.set(control, value);
    control.classList.toggle('is-pressed', value > .04);
  }
  schedule();
  if (moving) requestAnimationFrame(springPress);
}
function press(control, active) {
  control.querySelector('button')?.classList.toggle('is-held', active);
  if (!springFrame) springFrame = requestAnimationFrame(() => { springFrame = 0; springPress(); });
}
let springFrame = 0;
function move(control, dx, dy) {
  const position = positions.get(control);
  const rect = control.getBoundingClientRect();
  position.x += Math.max(8-rect.left, Math.min(innerWidth-8-rect.right, dx));
  position.y += Math.max(8-rect.top, Math.min(innerHeight-8-rect.bottom, dy));
  control.style.translate = `${position.x}px ${position.y}px`;
  schedule();
}
function applyPreset(id) {
  material = { ...PRESETS[id] };
  document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === id)));
  $('preset-json').textContent = JSON.stringify(material, null, 2);
  schedule();
}
async function loadSource(url, dusk = false) {
  const version = ++loadVersion;
  const image = new Image();
  image.src = url;
  await image.decode();
  if (version !== loadVersion) return;
  let next = image;
  if (dusk) {
    const buffer = document.createElement('canvas');
    buffer.width = image.naturalWidth; buffer.height = image.naturalHeight;
    const ctx = buffer.getContext('2d');
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#9e7797';
    ctx.fillRect(0, 0, buffer.width, buffer.height);
    next = buffer;
    stage.style.backgroundImage = `url(${buffer.toDataURL()})`;
  } else stage.style.backgroundImage = `url("${url}")`;
  source = next;
  if (scene.available) scene.setSource(next);
  schedule();
}

controls.forEach(control => {
  control.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button, a, input, label')) return;
    drag = { control, x: event.clientX, y: event.clientY };
    control.setPointerCapture(event.pointerId);
  });
  control.addEventListener('pointermove', event => {
    if (!drag || drag.control !== control) return;
    move(control, event.clientX-drag.x, event.clientY-drag.y);
    drag.x = event.clientX; drag.y = event.clientY;
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) control.addEventListener(name, () => { if (drag?.control === control) drag = null; });
  control.querySelectorAll('button').forEach(button => {
    button.addEventListener('pointerdown', () => press(control, true));
    for (const name of ['pointerup', 'pointercancel', 'blur']) button.addEventListener(name, () => press(control, false));
    button.addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') press(control, true); });
    button.addEventListener('keyup', () => press(control, false));
  });
  control.addEventListener('keydown', event => {
    const direction = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[event.key];
    if (!direction || event.target !== control) return;
    event.preventDefault();
    const step = event.shiftKey ? 24 : 8;
    move(control, direction[0]*step, direction[1]*step);
  });
});
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', async () => {
  try {
    await loadSource(new URL('../assets/glass-backdrop.svg', import.meta.url).href, button.dataset.scene === 'dusk');
    if (imageURL) { URL.revokeObjectURL(imageURL); imageURL = null; }
    document.querySelectorAll('[data-scene]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('scene-caption').firstChild.textContent = `${button.textContent.trim()} · `;
  } catch { notify('The scene could not be loaded.'); }
}));
$('upload').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 12*1024*1024) { notify('Choose a PNG, JPEG, or WebP under 12 MB.'); return; }
  const nextURL = URL.createObjectURL(file);
  try {
    await loadSource(nextURL);
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = nextURL;
    document.querySelectorAll('[data-scene]').forEach(item => item.setAttribute('aria-pressed', 'false'));
    $('scene-caption').firstChild.textContent = 'Your image · ';
    notify('Image loaded locally. It is not uploaded.');
  } catch { URL.revokeObjectURL(nextURL); notify('That image could not be read.'); }
  event.target.value = '';
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(material, null, 2)); notify('Preset copied.'); }
  catch { notify('Clipboard access was denied.'); }
});
$('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  $('theme').setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
});
const observer = new ResizeObserver(schedule);
controls.forEach(control => observer.observe(control));
window.addEventListener('resize', schedule);
window.addEventListener('scroll', schedule, { passive: true });
canvas.addEventListener('glassfallback', schedule);
for (const query of ['(prefers-reduced-transparency: reduce)', '(forced-colors: active)']) matchMedia(query).addEventListener('change', schedule);
window.addEventListener('pagehide', () => { observer.disconnect(); scene.destroy(); if (imageURL) URL.revokeObjectURL(imageURL); clearTimeout(toastTimer); cancelAnimationFrame(frame); });
loadSource(new URL('../assets/glass-backdrop.svg', import.meta.url).href).catch(() => { scene.available = false; schedule(); });
applyPreset('apple');
window.glassDemo = { get available(){return scene.available;}, get material(){return {...material};}, get source(){return Boolean(source);}, controls };
