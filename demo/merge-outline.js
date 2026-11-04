import { fitClosedStroke, geometryFromStroke } from './outline-editor.js';

export function mergeGlassOutlines(buttons, stage) {
  const stageBounds = stage.getBoundingClientRect();
  const bounds = buttons.map(button=>button.getBoundingClientRect());
  const left = Math.min(...bounds.map(rect=>rect.left));
  const top = Math.min(...bounds.map(rect=>rect.top));
  const width = Math.max(...bounds.map(rect=>rect.right))-left;
  const height = Math.max(...bounds.map(rect=>rect.bottom))-top;
  if (width>400 || height>400) return {error:'mergeSize'};

  const mask = document.createElement('canvas');
  mask.width = Math.ceil(width)+2;
  mask.height = Math.ceil(height)+2;
  const ctx = mask.getContext('2d',{willReadFrequently:true});
  for (const [i,button] of buttons.entries()) {
    const rect = bounds[i];
    const x = rect.left-left+1, y = rect.top-top+1;
    const w = rect.width, h = rect.height;
    ctx.beginPath();
    const kind = button.dataset.shape;
    if (kind==='custom' && button.glassOutline) {
      for (const [index,[u,v]] of button.glassOutline.entries()) {
        if (index===0) ctx.moveTo(x+w*u,y+h*v);
        else ctx.lineTo(x+w*u,y+h*v);
      }
      ctx.closePath();
    } else if (kind==='circle') {
      ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
    } else {
      const radius = kind==='capsule' ? Math.min(w,h)/2 : kind==='rounded' ? Math.min(16,w/2,h/2) : 0;
      ctx.roundRect(x,y,w,h,radius);
    }
    ctx.fill('evenodd');
  }
  const stride = mask.width;
  const pixels = ctx.getImageData(0,0,stride,mask.height).data;
  const filled = index=>pixels[index*4+3]>=128;
  const edges = new Map();
  function edge(from,to) {
    if (edges.has(from)) return false;
    edges.set(from,to);
    return true;
  }
  for (let y=1;y<mask.height-1;y++) for (let x=1;x<stride-1;x++) {
    const i = y*stride+x;
    if (!filled(i)) continue;
    if ((!filled(i-stride) && !edge(i,i+1)) ||
        (!filled(i+1) && !edge(i+1,i+stride+1)) ||
        (!filled(i+stride) && !edge(i+stride+1,i+stride)) ||
        (!filled(i-1) && !edge(i+stride,i))) return {error:'mergeOverlap'};
  }
  const start = edges.keys().next().value;
  const points = [];
  let at = start;
  while (edges.has(at)) {
    points.push([left-stageBounds.left+(at%stride)-1,top-stageBounds.top+Math.floor(at/stride)-1]);
    const next = edges.get(at);
    edges.delete(at);
    at = next;
  }
  // One closed contour fits the same hit-test and shader format as a hand-drawn button.
  if (at!==start || edges.size || points.length<3) return {error:'mergeOverlap'};
  const geometry = geometryFromStroke(fitClosedStroke(points,.76));
  return geometry ? {geometry} : {error:'mergeOverlap'};
}
