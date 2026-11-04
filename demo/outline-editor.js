function smoothStroke(points,strength) {
  if (points.length<3) return points;
  return points.map((current,index)=>{
    const before = points[index-1];
    const after = points[index+1];
    if (!before || !after) return current;
    const ax=current[0]-before[0], ay=current[1]-before[1];
    const bx=after[0]-current[0], by=after[1]-current[1];
    const turn=(ax*bx+ay*by)/Math.max(1,Math.hypot(ax,ay)*Math.hypot(bx,by));
    const blend=strength*Math.max(0,turn)*.55;
    return current.map((value,i)=>value+((before[i]+after[i])/2-value)*blend);
  });
}

function geometryFromStroke(points) {
  if (points.length<3) return;
  const xs = points.map(([x])=>x);
  const ys = points.map(([,y])=>y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const drawnWidth = Math.max(...xs)-x;
  const drawnHeight = Math.max(...ys)-y;
  if (drawnWidth<12 || drawnHeight<12) return;
  const samples = points.length<=64 ? points : samplePerimeter(points);
  const outline = samples.map(([px,py])=>[(px-x)/drawnWidth,(py-y)/drawnHeight]);
  const width = Math.min(400,Math.max(44,drawnWidth));
  const height = Math.min(400,Math.max(44,drawnHeight));
  return {shape:'custom',x,y,width,height,outline};
}

function samplePerimeter(points) {
  const loop = [...points,points[0]];
  const distances = [0];
  for (let i=1;i<loop.length;i++) {
    distances.push(distances[i-1]+Math.hypot(loop[i][0]-loop[i-1][0],loop[i][1]-loop[i-1][1]));
  }
  let edge=1;
  return Array.from({length:64},(_,i)=>{
    const at=distances.at(-1)*i/64;
    while (distances[edge]<=at) edge++;
    const ratio=(at-distances[edge-1])/(distances[edge]-distances[edge-1]);
    return loop[edge-1].map((value,axis)=>value+(loop[edge][axis]-value)*ratio);
  });
}

export function mountOutlineEditor(stage,{onDraw,onCancel}) {
  const overlay = stage.querySelector('#outline-editor');
  const ink = overlay.querySelector('polyline');
  const fill = overlay.querySelector('polygon');
  const closing = overlay.querySelector('line');
  const startPoint = overlay.querySelector('circle');
  const smoothing = overlay.querySelector('#outline-smoothing');
  const cancel = overlay.querySelector('#cancel-outline');
  let stroke;
  function paint(points = []) {
    const value = points.map(point=>point.join(',')).join(' ');
    ink.setAttribute('points',value);
    fill.setAttribute('points',value);
    const first = points[0];
    const last = points.at(-1);
    startPoint.style.visibility = closing.style.visibility = first ? 'visible' : 'hidden';
    if (!first) return;
    startPoint.setAttribute('cx',first[0]);
    startPoint.setAttribute('cy',first[1]);
    closing.setAttribute('x1',first[0]);
    closing.setAttribute('y1',first[1]);
    closing.setAttribute('x2',last[0]);
    closing.setAttribute('y2',last[1]);
  }
  const smoothed = () => smoothStroke(stroke.points,smoothing.valueAsNumber/100);
  function stop() {
    stroke = undefined;
    paint();
    overlay.hidden = true;
  }
  function dismiss() {
    stop();
    onCancel();
  }
  function point(event) {
    const box = stage.getBoundingClientRect();
    return [
      Math.max(0,Math.min(box.width,event.clientX-box.left)),
      Math.max(0,Math.min(box.height,event.clientY-box.top))
    ];
  }
  overlay.addEventListener('pointerdown',event=>{
    if (event.button!==0 || stroke || event.target.closest('.outline-instructions')) return;
    stroke = {id:event.pointerId,points:[point(event)]};
    paint(stroke.points);
    overlay.setPointerCapture(event.pointerId);
  });
  overlay.addEventListener('pointermove',event=>{
    if (event.pointerId!==stroke?.id) return;
    const next = point(event);
    const last = stroke.points.at(-1);
    if (Math.hypot(next[0]-last[0],next[1]-last[1])<2 || stroke.points.length>=2048) return;
    stroke.points.push(next);
    paint(smoothed());
  });
  overlay.addEventListener('pointerup',event=>{
    if (event.pointerId!==stroke?.id) return;
    const geometry = geometryFromStroke(smoothed());
    if (!geometry) {
      stroke = undefined;
      paint();
      return;
    }
    stop();
    onDraw(geometry);
  });
  for (const type of ['pointercancel','lostpointercapture']) {
    overlay.addEventListener(type,event=>{ if (event.pointerId===stroke?.id) dismiss(); });
  }
  cancel.addEventListener('click',dismiss);
  overlay.addEventListener('keydown',event=>{ if (event.key==='Escape') dismiss(); });
  return {
    start() {
      overlay.hidden = false;
      stage.scrollIntoView({block:'nearest'});
      cancel.focus({preventScroll:true});
    },
    stop
  };
}
