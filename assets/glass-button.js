/* Standalone liquid-glass button. MIT. */
import { mountLiquidGlass } from './mount-liquid-glass.js';
import { normalizeGlassOutline, glassOutlineClip } from './liquid-glass-renderer.js';
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
        surface:circle?'lens':undefined,outline:config.button.outline,press,stretchX:state.sx,stretchY:state.sy,
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

/* Lucide: https://github.com/lucide-icons/lucide
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Lobe Icons: https://github.com/lobehub/lobe-icons
MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const glassIcons = {
  none:["0 0 24 24",0,[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M4.929 4.929 19.07 19.071"}]]],
  plus:["0 0 24 24",0,[["path",{"d":"M5 12h14"}],["path",{"d":"M12 5v14"}]]],
  check:["0 0 24 24",0,[["path",{"d":"M20 6 9 17l-5-5"}]]],
  arrow:["0 0 24 24",0,[["path",{"d":"M5 12h14"}],["path",{"d":"m12 5 7 7-7 7"}]]],
  search:["0 0 24 24",0,[["path",{"d":"m21 21-4.34-4.34"}],["circle",{"cx":"11","cy":"11","r":"8"}]]],
  play:["0 0 24 24",0,[["path",{"d":"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"}]]],
  heart:["0 0 24 24",0,[["path",{"d":"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"}]]],
  star:["0 0 24 24",0,[["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]]],
  download:["0 0 24 24",0,[["path",{"d":"M12 15V3"}],["path",{"d":"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["path",{"d":"m7 10 5 5 5-5"}]]],
  settings:["0 0 24 24",0,[["path",{"d":"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"}],["circle",{"cx":"12","cy":"12","r":"3"}]]],
  close:["0 0 24 24",0,[["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]]],
  sparkles:["0 0 24 24",0,[["path",{"d":"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"}],["path",{"d":"M20 2v4"}],["path",{"d":"M22 4h-4"}],["circle",{"cx":"4","cy":"20","r":"2"}]]],
  mail:["0 0 24 24",0,[["path",{"d":"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"}],["rect",{"x":"2","y":"4","width":"20","height":"16","rx":"2"}]]],
  home:["0 0 24 24",0,[["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]]],
  lock:["0 0 24 24",0,[["rect",{"width":"18","height":"11","x":"3","y":"11","rx":"2","ry":"2"}],["path",{"d":"M7 11V7a5 5 0 0 1 10 0v4"}]]],
  camera:["0 0 24 24",0,[["path",{"d":"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"}],["circle",{"cx":"12","cy":"13","r":"3"}]]],
  bell:["0 0 24 24",0,[["path",{"d":"M10.268 21a2 2 0 0 0 3.464 0"}],["path",{"d":"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"}]]],
  calendar:["0 0 24 24",0,[["path",{"d":"M8 2v3"}],["path",{"d":"M16 2v3"}],["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["path",{"d":"M3 9h18"}]]],
  bookmark:["0 0 24 24",0,[["path",{"d":"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"}]]],
  link:["0 0 24 24",0,[["path",{"d":"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}],["path",{"d":"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"}]]],
  eye:["0 0 24 24",0,[["path",{"d":"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"}],["circle",{"cx":"12","cy":"12","r":"3"}]]],
  claude:["0 0 24 24",1,[["path",{"d":"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"}]]],
  openai:["0 0 24 24",1,[["path",{"d":"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"}]]],
  gemini:["0 0 24 24",1,[["path",{"d":"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"}]]],
};

const glassSvgTags = new Set(['path','circle','ellipse','line','polygon','polyline','rect']);
const glassSvgNumbers = new Set(['cx','cy','r','width','height','x','y','rx','ry','x1','x2','y1','y2','points']);

function safeGlassGlyph(nodes) {
  if (!Array.isArray(nodes) || !nodes.length || nodes.length>32) return false;
  return nodes.every(item=>{
    if (!Array.isArray(item) || !glassSvgTags.has(item[0])) return false;
    const attrs = item[1];
    if (!attrs || typeof attrs!=='object' || Array.isArray(attrs)) return false;
    return Object.entries(attrs).every(([key,value])=>{
      if (typeof value!=='string' || value.length>4096) return false;
      if (key==='d') return /^[MmZzLlHhVvCcSsQqTtAaEe\d+.,\s-]+$/.test(value);
      if (key==='fill') return value==='none' || value==='currentColor';
      return glassSvgNumbers.has(key) && /^[\dEe+.,\s-]+$/.test(value);
    });
  });
}

export function createGlassIcon(doc, name, glyph) {
  const entry = Object.hasOwn(glassIcons,name) ? glassIcons[name]
    : safeGlassGlyph(glyph) ? ['0 0 24 24',false,glyph] : null;
  if (!entry) return null;
  const [viewBox,solid,nodes] = entry;
  const ns = "http://www.w3.org/2000/svg";
  const svg = doc.createElementNS(ns,"svg");
  for (const [key,value] of Object.entries({viewBox,"aria-hidden":"true",fill:solid?"currentColor":"none",
    "fill-rule":solid?"evenodd":"nonzero",stroke:solid?"none":"currentColor","stroke-width":"2",
    "stroke-linecap":"round","stroke-linejoin":"round"})) svg.setAttribute(key,value);
  for (const [tag,attributes] of nodes) {
    const node = doc.createElementNS(ns,tag);
    for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,value);
    svg.append(node);
  }
  return svg;
}

export function applyGlassTypography(button, typography) {
  if (!typography) return;
  const limit = (value,fallback,min,max) => Number.isFinite(value)
    ? Math.max(min,Math.min(max,value)) : fallback;
  let label = button.querySelector('[data-glass-label]');
  if (!label) {
    label = button.ownerDocument.createElement('span');
    label.dataset.glassLabel = '';
    label.textContent = button.textContent;
    button.replaceChildren(label);
  }
  label.querySelector('[data-glass-icon]')?.remove();
  const icon = createGlassIcon(button.ownerDocument,typography.icon,typography.iconGlyph);
  const hasIcon = Boolean(icon);
  if (icon) {
    icon.setAttribute("data-glass-icon","");
    Object.assign(icon.style,{width:"1em",height:"1em",flex:"none",transform:"translateZ(0)"});
    label.prepend(icon);
  }
  Object.assign(label.style,{
    position:'absolute',pointerEvents:'none',width:'max-content',maxWidth:'100%',
    display:hasIcon?'inline-flex':'',alignItems:'center',justifyContent:'center',gap:'.35em',
    transform:'translate(-50%,-50%)',
    left:limit(typography.x,50,0,100)+'%',
    top:limit(typography.y,50,0,100)+'%',
    fontSize:limit(typography.size,15,8,72)+'px',
    fontWeight:String(limit(typography.weight,650,400,750)),
    fontFamily:typography.family==='serif'?'Georgia, "Songti SC", SimSun, serif'
      : typography.family==='mono'?'Consolas, "Courier New", monospace':'inherit'
  });
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
  applyGlassTypography(button,config.button.typography);
  if (!text) button.setAttribute('aria-label',config.language==='zh'?'液态玻璃按钮':'Liquid glass button');
  Object.assign(button.style,{width:width+'px',height:height+'px'});
  const outline = normalizeGlassOutline(config.button.outline);
  if (outline) button.style.clipPath = glassOutlineClip(outline);
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
