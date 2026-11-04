const distance = ([ax,ay],[bx,by]) => Math.hypot(ax-bx,ay-by);

function distanceToEdge([x,y],[ax,ay],[bx,by]) {
  const dx=bx-ax, dy=by-ay;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(x-ax-t*dx,y-ay-t*dy);
}

function simplifyLoop(points,tolerance) {
  const loop=[...points,points[0]];
  const keep=new Set([0,points.length]);
  const ranges=[[0,points.length]];
  while (ranges.length) {
    const [start,end]=ranges.pop();
    let furthest=-1, error=tolerance;
    for (let i=start+1;i<end;i++) {
      const deviation=distanceToEdge(loop[i],loop[start],loop[end]);
      if (deviation>error) {
        error=deviation;
        furthest=i;
      }
    }
    if (furthest>=0) {
      keep.add(furthest);
      ranges.push([start,furthest],[furthest,end]);
    }
  }
  const anchors=points.filter((_,index)=>keep.has(index));
  return anchors.length>=3?anchors:points;
}

export function fitClosedStroke(raw,strength) {
  if (raw.length<3) return raw;
  const points=[...raw];
  // Collapse the tiny tail left when a stroke returns to its starting point.
  while (points.length>3 && distance(points[0],points.at(-1))<3) points.pop();
  if (!strength) return points.length<=64?points:samplePerimeter(points);
  const cleaned=points.length>12?filterJitter(points,strength):points;
  const anchors=simplifyLoop(cleaned,.45+strength*3);
  const handles=anchors.map((point,index)=>{
    const before=anchors.at(index-1);
    const after=anchors[(index+1)%anchors.length];
    const incoming=distance(before,point);
    const outgoing=distance(point,after);
    const cosine=((point[0]-before[0])*(after[0]-point[0])
      +(point[1]-before[1])*(after[1]-point[1]))/Math.max(1,incoming*outgoing);
    if (cosine<.35-strength*.4) return [0,0];
    const reach=Math.min(incoming,outgoing)*strength*.42/Math.max(1,distance(before,after));
    return after.map((value,axis)=>(value-before[axis])*reach);
  });
  const fitted=[];
  for (let i=0;i<anchors.length;i++) {
    const next=(i+1)%anchors.length;
    const a=anchors[i], b=anchors[next];
    const start=a.map((value,axis)=>value+handles[i][axis]);
    const end=b.map((value,axis)=>value-handles[next][axis]);
    const bend=Math.max(distanceToEdge(start,a,b),distanceToEdge(end,a,b));
    const steps=Math.max(1,Math.min(12,Math.ceil(Math.sqrt(bend)*3)));
    for (let j=0;j<steps;j++) {
      const t=j/steps, k=1-t;
      fitted.push(a.map((value,axis)=>k*k*k*value+3*k*k*t*start[axis]+3*k*t*t*end[axis]+t*t*t*b[axis]));
    }
  }
  return fitted.length<=64?fitted:samplePerimeter(fitted);
}

function filterJitter(points,strength) {
  const samples=samplePerimeter(points,Math.min(200,points.length));
  const count=samples.length;
  const wrap=index=>(index+count)%count;
  return samples.map((point,index)=>{
    const before=samples[wrap(index-3)], after=samples[wrap(index+3)];
    const incoming=distance(point,before), outgoing=distance(point,after);
    const turn=(distance(before,after)**2-incoming**2-outgoing**2)/Math.max(1,2*incoming*outgoing);
    if (turn<.25) return point;
    const window=[1,4,6,4,1];
    const mix=Math.min(1,strength*1.65);
    return point.map((value,axis)=>{
      const mean=window.reduce((sum,weight,i)=>sum+samples[wrap(index+i-2)][axis]*weight,0)/16;
      return value+(mean-value)*mix;
    });
  });
}

export function geometryFromStroke(points) {
  if (points.length<3) return;
  const xs = points.map(([x])=>x);
  const ys = points.map(([,y])=>y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const drawnWidth = Math.max(...xs)-x;
  const drawnHeight = Math.max(...ys)-y;
  if (drawnWidth<12 || drawnHeight<12) return;
  const outline = points.map(([px,py])=>[
    Number(((px-x)/drawnWidth).toFixed(5)),Number(((py-y)/drawnHeight).toFixed(5))
  ]);
  const width = Math.min(400,Math.max(44,drawnWidth));
  const height = Math.min(400,Math.max(44,drawnHeight));
  return {shape:'custom',x,y,width,height,outline};
}

function samplePerimeter(points,count=64) {
  const loop = [...points,points[0]];
  const distances = [0];
  for (let i=1;i<loop.length;i++) {
    distances.push(distances[i-1]+Math.hypot(loop[i][0]-loop[i-1][0],loop[i][1]-loop[i-1][1]));
  }
  let edge=1;
  return Array.from({length:count},(_,i)=>{
    const at=distances.at(-1)*i/count;
    while (distances[edge]<=at) edge++;
    const ratio=(at-distances[edge-1])/(distances[edge]-distances[edge-1]);
    return loop[edge-1].map((value,axis)=>value+(loop[edge][axis]-value)*ratio);
  });
}

function outlineBounds(points) {
  const xs = points.map(([x])=>x);
  const ys = points.map(([,y])=>y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return [x,y,Math.max(...xs)-x,Math.max(...ys)-y];
}

function guideOutline(kind,[x,y,width,height]) {
  if (kind==='ellipse') {
    return Array.from({length:48},(_,i)=>{
      const angle = i*Math.PI/24;
      return [x+width*(1+Math.cos(angle))/2,y+height*(1+Math.sin(angle))/2];
    });
  }
  const radius = Math.min(width/2,height/2,kind==='capsule'?Infinity:16);
  const corners = [[x+width-radius,y+radius],[x+width-radius,y+height-radius],
    [x+radius,y+height-radius],[x+radius,y+radius]];
  return corners.flatMap(([cx,cy],corner)=>Array.from({length:9},(_,i)=>{
    const angle = (corner-1+i/8)*Math.PI/2;
    return [cx+radius*Math.cos(angle),cy+radius*Math.sin(angle)];
  }));
}

function smartOutline(raw, fitted) {
  if (raw.length<12) return fitted;
  const bounds = outlineBounds(fitted);
  const scale = Math.min(bounds[2],bounds[3]);
  if (scale<24) return fitted;
  const samples = samplePerimeter(fitted,48);
  function deviations(from,to) {
    return from.map(point=>Math.min(...to.map((end,i)=>distanceToEdge(point,to.at(i-1),end))));
  }
  let best = fitted;
  let lowest = Math.max(2,scale*.065);
  for (const kind of ['ellipse','capsule','rounded']) {
    const guide = guideOutline(kind,bounds);
    const errors = [...deviations(samples,guide),...deviations(guide,samples)];
    const rms = Math.sqrt(errors.reduce((sum,error)=>sum+error*error,0)/errors.length);
    if (rms<lowest && Math.max(...errors)<Math.max(5,scale*.17)) {
      best = guide;
      lowest = rms;
    }
  }
  return best;
}

export function mountOutlineEditor(stage,{onDraw,onPreview,onCancel,getStrings}) {
  const overlay = stage.querySelector('#outline-editor');
  const ink = overlay.querySelector('polyline');
  const fill = overlay.querySelector('polygon');
  const closing = overlay.querySelector('line');
  const startPoint = overlay.querySelector('circle');
  const smoothing = overlay.querySelector('#outline-smoothing');
  const mode = overlay.querySelector('#outline-mode');
  const hint = overlay.querySelector('#outline-hint');
  const keep = overlay.querySelector('#keep-outline');
  const redraw = overlay.querySelector('#redraw-outline');
  const cancel = overlay.querySelector('#cancel-outline');
  let stroke;
  let pending;
  let frame=0;
  const traced = ()=>mode.value==='assist' || mode.value==='free';
  function paint(points = [],snapped=false) {
    const value = points.map(point=>point.join(',')).join(' ');
    ink.setAttribute('points',points.length<3?value:'');
    fill.setAttribute('points',points.length>=3?value:'');
    const first = stroke?.points[0];
    const last = stroke?.points.at(-1);
    startPoint.style.visibility = first ? 'visible' : 'hidden';
    closing.style.visibility = first && !snapped ? 'visible' : 'hidden';
    overlay.toggleAttribute('data-snapped',snapped);
    if (!first) return;
    startPoint.setAttribute('cx',first[0]);
    startPoint.setAttribute('cy',first[1]);
    closing.setAttribute('x1',first[0]);
    closing.setAttribute('y1',first[1]);
    closing.setAttribute('x2',last[0]);
    closing.setAttribute('y2',last[1]);
  }
  function fitted(points, review = false) {
    if (!traced()) return guideOutline(mode.value,outlineBounds(points));
    const smooth = fitClosedStroke(points,smoothing.valueAsNumber/100);
    return mode.value==='assist' && review ? smartOutline(points,smooth) : smooth;
  }
  function refresh() {
    const key = pending ? 'drawReview' : traced() ? 'drawHint' : 'drawTemplate';
    hint.dataset.i18n = key;
    hint.textContent = getStrings()[key];
    smoothing.disabled = !traced();
    redraw.hidden = keep.hidden = !pending;
    if (pending) {
      const points = fitted(pending,true);
      const geometry = geometryFromStroke(points);
      keep.disabled = !geometry;
      paint(geometry ? geometry.outline.map(([u,v])=>[geometry.x+u*geometry.width,geometry.y+v*geometry.height]) : points);
      onPreview(geometry);
    }
  }
  function schedulePaint() {
    if (frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      if (stroke) paint(fitted(stroke.points),stroke.snapped);
    });
  }
  function stop() {
    stroke = undefined;
    pending = undefined;
    cancelAnimationFrame(frame);
    frame=0;
    paint();
    onPreview();
    overlay.hidden = true;
  }
  function dismiss() {
    stop();
    onCancel();
  }
  function point(event,box) {
    return [
      Math.max(0,Math.min(box.width,event.clientX-box.left)),
      Math.max(0,Math.min(box.height,event.clientY-box.top))
    ];
  }
  function append(event,box) {
    if (stroke.snapped || stroke.points.length>=2048) return;
    const next=point(event,box);
    if (!traced()) {
      stroke.points[1] = next;
      return;
    }
    const first=stroke.points[0];
    const last=stroke.points.at(-1);
    if (distance(next,last)<1.25) return;
    if (stroke.leftStart && stroke.points.length>=4 && distanceToEdge(first,last,next)<9) {
      stroke.snapped=true;
      return;
    }
    stroke.leftStart ||= distance(first,next)>28;
    stroke.points.push(next);
  }
  overlay.addEventListener('pointerdown',event=>{
    if (event.button!==0 || stroke || pending || event.target.closest('.outline-instructions')) return;
    event.preventDefault();
    stroke = {id:event.pointerId,points:[point(event,stage.getBoundingClientRect())]};
    paint(stroke.points);
    overlay.setPointerCapture(event.pointerId);
  });
  overlay.addEventListener('pointermove',event=>{
    if (event.pointerId!==stroke?.id) return;
    const box=stage.getBoundingClientRect();
    const events=event.getCoalescedEvents?.();
    for (const sample of events?.length?events:[event]) append(sample,box);
    schedulePaint();
  });
  overlay.addEventListener('pointerup',event=>{
    if (event.pointerId!==stroke?.id) return;
    append(event,stage.getBoundingClientRect());
    const points = stroke.points;
    stroke = undefined;
    if (!geometryFromStroke(fitted(points,true))) {
      paint();
      return;
    }
    pending = points;
    refresh();
    keep.focus({preventScroll:true});
  });
  for (const type of ['pointercancel','lostpointercapture']) {
    overlay.addEventListener(type,event=>{ if (event.pointerId===stroke?.id) dismiss(); });
  }
  cancel.addEventListener('click',dismiss);
  for (const control of [smoothing,mode]) control.addEventListener('input',refresh);
  redraw.addEventListener('click',()=>{
    pending = undefined;
    paint();
    onPreview();
    refresh();
    cancel.focus({preventScroll:true});
  });
  keep.addEventListener('click',()=>{
    if (!pending) return;
    const geometry = geometryFromStroke(fitted(pending,true));
    if (!geometry) return;
    stop();
    onDraw(geometry);
  });
  overlay.addEventListener('keydown',event=>{ if (event.key==='Escape') dismiss(); });
  return {
    start() {
      overlay.hidden = false;
      refresh();
      stage.scrollIntoView({block:'nearest'});
      cancel.focus({preventScroll:true});
    },
    stop
  };
}
