/* Standalone liquid-glass button. MIT. */
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
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / .43),
    inset 0 2px var(--lg-rim) rgb(255 255 255 / .8),
    inset 0 -2px var(--lg-rim) rgb(192 233 244 / .38), var(--lg-prism);
  backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-saturation));
  transform: scale(var(--lg-stretch-x, 1), var(--lg-stretch-y, 1));
  transition: transform 220ms cubic-bezier(.18,.8,.22,1.24), box-shadow 180ms ease;
}
.liquid-glass-export:active, .liquid-glass-export[data-held] { cursor: grabbing; }
.liquid-glass-export:is(:active,[data-held])::before {
  scale: var(--lg-press);
  box-shadow: inset 0 0 1px 1px rgb(255 255 255 / .75),
    inset 0 2px var(--lg-rim) rgb(255 255 255 / .94),
    inset 0 -2px var(--lg-rim) rgb(192 233 244 / .55), var(--lg-prism);
}
.liquid-glass-export::before { transition-property: transform, scale, box-shadow; }
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

export function createLiquidGlassButton(target, config) {
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
    rim:Math.max(1,material.rimWidth*3)+'px',
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
    const stretch = Math.min(.16,Math.hypot(nextX-x,nextY-y)/140);
    const horizontal = Math.abs(nextX-x)>=Math.abs(nextY-y);
    button.style.setProperty('--lg-stretch-x',horizontal?1+stretch:1-stretch*.45);
    button.style.setProperty('--lg-stretch-y',horizontal?1-stretch*.45:1+stretch);
    x = nextX;
    y = nextY;
    button.style.translate = x+'px '+y+'px';
  });
  function release(event) {
    if (gesture?.id!==event.pointerId) return;
    suppressClick = gesture.moved;
    gesture = undefined;
    button.removeAttribute('data-held');
    button.style.removeProperty('--lg-stretch-x');
    button.style.removeProperty('--lg-stretch-y');
  }
  for (const event of ['pointerup','pointercancel','pointerleave','lostpointercapture']) button.addEventListener(event,release);
  button.addEventListener('click',event=>{
    if (!suppressClick || !event.detail) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  target.append(button);
  return button;
}
