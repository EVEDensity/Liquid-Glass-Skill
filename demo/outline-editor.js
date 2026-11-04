function geometryFromStroke(points) {
  if (points.length<3) return;
  const xs = points.map(([x])=>x);
  const ys = points.map(([,y])=>y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const drawnWidth = Math.max(...xs)-x;
  const drawnHeight = Math.max(...ys)-y;
  if (drawnWidth<12 || drawnHeight<12) return;
  const count = Math.min(points.length,64);
  const outline = Array.from({length:count},(_,i)=>{
    const [px,py] = points[Math.floor(i*points.length/count)];
    return [(px-x)/drawnWidth,(py-y)/drawnHeight];
  });
  const width = Math.min(400,Math.max(44,drawnWidth));
  const height = Math.min(400,Math.max(44,drawnHeight));
  return {shape:'custom',x,y,width,height,outline};
}

export function mountOutlineEditor(stage,{onDraw,onCancel}) {
  const overlay = stage.querySelector('#outline-editor');
  const line = overlay.querySelector('polyline');
  const cancel = overlay.querySelector('#cancel-outline');
  let stroke;
  function stop() {
    stroke = undefined;
    line.removeAttribute('points');
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
    if (event.button!==0 || stroke || event.target.closest('button')) return;
    stroke = {id:event.pointerId,points:[point(event)]};
    overlay.setPointerCapture(event.pointerId);
  });
  overlay.addEventListener('pointermove',event=>{
    if (event.pointerId!==stroke?.id) return;
    const next = point(event);
    const last = stroke.points.at(-1);
    if (Math.hypot(next[0]-last[0],next[1]-last[1])<2 || stroke.points.length>=2048) return;
    stroke.points.push(next);
    line.setAttribute('points',stroke.points.map(p=>p.join(',')).join(' '));
  });
  overlay.addEventListener('pointerup',event=>{
    if (event.pointerId!==stroke?.id) return;
    const geometry = geometryFromStroke(stroke.points);
    if (!geometry) {
      stroke = undefined;
      line.removeAttribute('points');
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
