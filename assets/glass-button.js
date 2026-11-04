/* Standalone liquid-glass button. MIT. */
import { mountLiquidGlass } from './mount-liquid-glass.js';

const css = `
.liquid-glass-export {
  position: relative; isolation: isolate; box-sizing: border-box;
  display: inline-grid; place-items: center; margin: 0; padding: 0 10px;
  border: 0; border-radius: var(--lg-radius); background: transparent;
  color: #17242b; text-shadow: 0 0 4px #fff;
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
.liquid-glass-export[data-refractive] { z-index: 1; }
.liquid-glass-export[data-refractive]::before { display: none; }
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

function attachButtonOptics(button, config, {stage,source,liveSource=false}) {
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
  let press=0, sx=0, sy=0, tx=0, ty=0, lastMove=0, lastFrame=0, tapUntil=0, frame=0, contact;
  const optics = mountLiquidGlass({
    canvas,source,liveSource,material:{...config.material,surfaceOnly:true},
    onAvailabilityChange(available) { button.toggleAttribute('data-refractive',available); },
    getFrame() {
      const box = canvas.getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      const x = rect.left-box.left+rect.width/2;
      const y = rect.top-box.top+rect.height/2;
      const grow = 1+press*(circle?.30:.15);
      return {shapes:[{
        x,y,width:rect.width*grow,height:rect.height*grow,radius:config.button.radius*grow,
        surface:circle?'lens':undefined,press,stretchX:sx,stretchY:sy,
        motion:Math.min(1,Math.hypot(sx,sy)/32),
        contactX:contact?contact.clientX-box.left:x,contactY:contact?contact.clientY-box.top:y
      }]};
    }
  });
  function animate(now) {
    frame = 0;
    const elapsed = lastFrame ? now-lastFrame : 16;
    lastFrame = now;
    const held = button.hasAttribute('data-held') || now<tapUntil ? 1 : 0;
    if (!held || now-lastMove>105) tx=ty=0;
    const settle = (current,target,time) => reduced.matches || Math.abs(current-target)<.02
      ? target : current+(target-current)*(1-Math.exp(-elapsed/time));
    press = settle(press,held,56);
    sx = settle(sx,tx,70);
    sy = settle(sy,ty,70);
    optics.invalidate();
    if (press!==held || sx || sy || now<tapUntil) frame=view.requestAnimationFrame(animate);
    else lastFrame=0;
  }
  function update(event,dx=0,dy=0) {
    if (event?.type==='click' && event.detail===0) tapUntil=view.performance.now()+145;
    if (event?.type==='pointerdown' || event?.type==='pointermove') contact=event;
    if (dx || dy) {
      lastMove=view.performance.now();
      const gain=Math.min(1.8,42/Math.hypot(dx,dy));
      tx=dx*gain;
      ty=dy*gain;
    }
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
  button.className = 'liquid-glass-export';
  button.textContent = text;
  if (!text) button.setAttribute('aria-label',config.language==='zh'?'液态玻璃按钮':'Liquid glass button');
  Object.assign(button.style,{width:width+'px',height:height+'px'});
  for (const [name,value] of Object.entries({
    radius:radius+'px',
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
    button.setAttribute('data-held','');
    update?.(event);
  });
  button.addEventListener('pointermove',event=>{
    if (gesture?.id!==event.pointerId) return;
    const dx = event.clientX-gesture.x;
    const dy = event.clientY-gesture.y;
    if (!gesture.moved) {
      if (Math.hypot(dx,dy)<4) return;
      gesture.moved = true;
      button.setPointerCapture(event.pointerId);
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
    update?.(event,deltaX,deltaY);
  });
  function release(event) {
    if (gesture?.id!==event.pointerId) return;
    suppressClick = gesture.moved;
    gesture = undefined;
    button.removeAttribute('data-held');
    button.style.removeProperty('--lg-stretch-x');
    button.style.removeProperty('--lg-stretch-y');
    update?.(event);
  }
  for (const event of ['pointerup','pointercancel','pointerleave','lostpointercapture']) button.addEventListener(event,release);
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
