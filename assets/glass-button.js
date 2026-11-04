/* Standalone liquid-glass button. MIT. */
import { mountLiquidGlass } from './mount-liquid-glass.js';
import { stepGlassMotion, applyGlassImpulse, sampleGlassMotion } from './glass-motion.js';

const css = `
.liquid-glass-export {
  position: relative; isolation: isolate; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; margin: 0; padding: 0 10px;
  border: 0; border-radius: var(--lg-radius); background: transparent;
  color: #17242b; text-align: center; text-shadow: 0 0 5px #edf5ef, 0 0 3px #edf5ef;
  font: 650 15px/1.35 "Segoe UI", sans-serif;
  overflow-wrap: anywhere; cursor: grab; touch-action: none;
}
.liquid-glass-export::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  border-radius: inherit;
  background: rgb(246 253 255 / var(--lg-haze));
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / .72),
    inset 0 1px var(--lg-rim) rgb(255 255 255 / .52),
    inset 0 -2px var(--lg-rim) rgb(192 233 244 / .38), var(--lg-prism);
  backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-saturation));
  transform: scale(var(--lg-stretch-x, 1), var(--lg-stretch-y, 1));
  transition: transform 220ms cubic-bezier(.18,.8,.22,1.24), box-shadow 180ms ease;
}
.liquid-glass-export:active, .liquid-glass-export[data-held] { cursor: grabbing; }
.liquid-glass-export:is(:active,[data-held])::before {
  scale: var(--lg-press);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / .88),
    inset 0 1px var(--lg-rim) rgb(255 255 255 / .68),
    inset 0 -2px var(--lg-rim) rgb(192 233 244 / .55), var(--lg-prism);
}
.liquid-glass-export::before { transition-property: transform, scale, box-shadow; }
.liquid-glass-export[data-refractive] { z-index: 1; overflow: hidden; }
.liquid-glass-export[data-refractive]::before { display: none; }
.liquid-glass-export[data-glass-unavailable] { background: #e9f2f4; }
.liquid-glass-export[data-glass-unavailable]::before { display: none; }
.liquid-glass-export:focus-visible { outline: 2px solid #15648a; outline-offset: 5px; }
@supports not (backdrop-filter: blur(1px)) {
  .liquid-glass-export::before { background: #e9f2f4; }
}
@media (prefers-reduced-transparency: reduce) {
  .liquid-glass-export::before { background: #e9f2f4; backdrop-filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .liquid-glass-export::before { transform: none; scale: none !important; transition: none; }
}
@media (forced-colors: active) {
  .liquid-glass-export { border: 1px solid ButtonText; background: ButtonFace; color: ButtonText; text-shadow: none; }
  .liquid-glass-export::before { display: none; }
}
`;

function attachButtonOptics(button, config, {stage,source,liveSource=false,requireExact=false}) {
  if (!stage?.contains(button) || !source) return;
  const doc = button.ownerDocument;
  const view = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  canvas.hidden = true;
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'0'});
  stage.append(canvas);
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const circle = config.button.shape==='circle';
  const state = {scale:0,sx:0,sy:0,tx:0,ty:0};
  let lastMove=0, tapUntil=0, frame=0, contact;
  const optics = mountLiquidGlass({
    canvas,source,liveSource,material:{...config.material,surfaceOnly:true,exactBackdrop:requireExact},
    onAvailabilityChange(available) {
      button.toggleAttribute('data-refractive',available);
      button.toggleAttribute('data-glass-unavailable',requireExact&&!available);
    },
    getFrame() {
      const box = canvas.getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      const x = rect.left-box.left+rect.width/2;
      const y = rect.top-box.top+rect.height/2;
      const press = state.scale;
      const grow = 1+press*(circle?.30:.15);
      return {shapes:[{
        x,y,width:rect.width*grow,height:rect.height*grow,
        radius:config.button.shape==='rounded'?Math.min(16,rect.width*grow/2,rect.height*grow/2):config.button.radius*grow,
        surface:circle?'lens':undefined,press,stretchX:state.sx,stretchY:state.sy,
        motion:sampleGlassMotion(state,x,y,view.performance.now(),reduced.matches),
        contactX:contact?contact.clientX-box.left:x,contactY:contact?contact.clientY-box.top:y
      }]};
    }
  });
  function animate(now) {
    frame = 0;
    const held = button.hasAttribute('data-held');
    const moving = stepGlassMotion(state,held||now<tapUntil?1:0,now,held&&now-lastMove<=105,reduced.matches);
    optics.invalidate();
    if (moving || state.motion || now<tapUntil) frame=view.requestAnimationFrame(animate);
  }
  function update(event,dx=0,dy=0,gesture) {
    const now = view.performance.now();
    if (event.type==='click' && event.detail===0 && !reduced.matches) tapUntil=now+145;
    if (event.type==='pointerdown') {
      tapUntil=0;
      lastMove=now;
      contact=event;
    }
    if (event.type==='pointermove') {
      const elapsed = Math.max(8,gesture.firstMove?Math.min(34,now-lastMove):now-lastMove);
      applyGlassImpulse(state,dx,dy,elapsed,reduced.matches);
      lastMove=now;
      contact=event;
    }
    if (event.type==='pointerup' && !gesture.moved && !reduced.matches) tapUntil=lastMove+145;
    if (!frame) frame=view.requestAnimationFrame(animate);
  }
  const resize = new view.ResizeObserver(optics.invalidate);
  resize.observe(button);
  button.invalidateLiquidGlass = optics.invalidate;
  button.disposeLiquidGlass = () => {
    view.cancelAnimationFrame(frame);
    resize.disconnect();
    optics.destroy();
    canvas.remove();
    button.removeAttribute('data-refractive');
  };
  return update;
}

export function createLiquidGlassButton(target, config, options = {}) {
  const doc = target.ownerDocument;
  if (options.requireExact && (!options.stage?.contains(target) || !options.source
      || doc.defaultView.getComputedStyle(options.stage).position==='static')) {
    throw new Error('Exact liquid glass requires a positioned stage and its readable pixel source.');
  }
  const root = target.getRootNode();
  if (!root.querySelector('[data-liquid-glass-export-style]')) {
    const style = doc.createElement('style');
    style.setAttribute('data-liquid-glass-export-style','');
    style.textContent = css;
    (root === doc ? doc.head : root).append(style);
  }
  const { width, height, radius, shape, text } = config.button;
  const material = config.material;
  const button = doc.createElement('button');
  button.type = 'button';
  button.lang = config.language==='zh'?'zh-CN':'en';
  button.className = 'liquid-glass-export';
  button.textContent = text;
  if (!text) button.setAttribute('aria-label',config.language==='zh'?'液态玻璃按钮':'Liquid glass button');
  Object.assign(button.style,{width:width+'px',height:height+'px'});
  for (const [name,value] of Object.entries({
    radius:shape==='circle'?'50%':radius+'px',
    blur:material.blur+'px',
    haze:Math.min(.72,.045+material.frost*.76),
    saturation:material.vibrancy,
    rim:Math.max(1,material.rimWidth*2)+'px',
    press:shape==='circle'?1.3:1.15,
    prism:material.dispersion>.25
      ? 'inset 2px 0 4px rgb(134 229 255 / .6), inset -2px 0 4px rgb(255 207 148 / .6)'
      : 'inset 0 0 0 transparent'
  })) button.style.setProperty('--lg-'+name,value);

  let gesture, x=0, y=0, suppressClick=false;
  button.addEventListener('pointerdown',event=>{
    if (event.button!==0 || !event.isPrimary) return;
    suppressClick = false;
    gesture = {id:event.pointerId,x:event.clientX,y:event.clientY,originX:x,originY:y,moved:false};
    button.setPointerCapture(event.pointerId);
    button.setAttribute('data-held','');
    update?.(event);
  });
  button.addEventListener('pointermove',event=>{
    if (gesture?.id!==event.pointerId) return;
    const dx = event.clientX-gesture.x;
    const dy = event.clientY-gesture.y;
    const firstMove = !gesture.moved;
    if (firstMove) {
      if (Math.hypot(dx,dy)<4) return;
      gesture.moved = true;
    }
    const nextX = gesture.originX+dx;
    const nextY = gesture.originY+dy;
    const deltaX = nextX-x, deltaY = nextY-y;
    const stretch = Math.min(.16,Math.hypot(nextX-x,nextY-y)/140);
    const horizontal = Math.abs(nextX-x)>=Math.abs(nextY-y);
    button.style.setProperty('--lg-stretch-x',horizontal?1+stretch:1-stretch*.45);
    button.style.setProperty('--lg-stretch-y',horizontal?1-stretch*.45:1+stretch);
    x = nextX;
    y = nextY;
    button.style.translate = x+'px '+y+'px';
    update?.(event,deltaX,deltaY,{firstMove});
  });
  function release(event) {
    if (gesture?.id!==event.pointerId) return;
    suppressClick = gesture.moved;
    const finished = gesture;
    gesture = undefined;
    button.removeAttribute('data-held');
    button.style.removeProperty('--lg-stretch-x');
    button.style.removeProperty('--lg-stretch-y');
    update?.(event,0,0,finished);
  }
  for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event,release);
  button.addEventListener('click',event=>{
    update?.(event);
    if (!suppressClick || !event.detail) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  target.append(button);
  let update = attachButtonOptics(button,config,options);
  if (update) {
    const dispose = button.disposeLiquidGlass;
    button.disposeLiquidGlass = () => { update=undefined; dispose(); };
  }
  return button;
}
