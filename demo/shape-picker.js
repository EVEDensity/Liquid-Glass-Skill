import { getGlassShapeOutline } from '../assets/liquid-glass-renderer.js';

const shapes = [
  ['circle','circle'],['capsule','capsule'],['rounded','rounded'],['square','square'],
  ['triangle','shapeTriangle'],['diamond','shapeDiamond'],['hexagon','shapeHexagon'],
  ['octagon','shapeOctagon'],['star','shapeStar'],['heart','shapeHeart']
];

export function mountShapePicker(input, {drawing = false} = {}) {
  const grid = input.nextElementSibling;
  const choices = drawing ? [['assist','drawAssist'],['free','drawFree'],...shapes] : [...shapes,['custom','custom']];
  const buttons = choices.map(([shape,label])=>{
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.shapeChoice = shape;
    button.dataset.aria = button.dataset.title = label;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('aria-hidden','true');
    const outline = getGlassShapeOutline(shape);
    if (outline) {
      const polygon = document.createElementNS(svg.namespaceURI,'polygon');
      polygon.setAttribute('points',outline.map(([x,y])=>[3+x*18,3+y*18].join(',')).join(' '));
      svg.append(polygon);
    } else {
      const paths = {
        circle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
        capsule:'M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Z',
        rounded:'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
        square:'M4 4h16v16H4Z',
        assist:'M12 2l2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z',
        free:'M3 16c3 0 3-8 6-8s2 8 5 8 3-8 7-8',
        custom:'M4 18c-1-4 0-6 3-7 3-1 3-7 7-7 3 0 6 3 6 6 0 4-3 4-4 7-1 4-11 5-12 1Z'
      };
      const path = document.createElementNS(svg.namespaceURI,'path');
      path.setAttribute('d',paths[shape]);
      if (shape==='free') {
        path.setAttribute('fill','none');
        path.setAttribute('stroke','currentColor');
        path.setAttribute('stroke-width','2');
        path.setAttribute('stroke-linecap','round');
      }
      svg.append(path);
    }
    button.append(svg);
    button.addEventListener('click',()=>{
      input.value = shape;
      input.dispatchEvent(new Event('change'));
    });
    return button;
  });
  grid.append(...buttons);
  function sync({custom = true, disabled = false} = {}) {
    for (const button of buttons) {
      const active = button.dataset.shapeChoice===input.value;
      button.hidden = button.dataset.shapeChoice==='custom' && !custom;
      button.disabled = disabled;
      button.setAttribute('aria-pressed',String(active));
      button.tabIndex = active ? 0 : -1;
    }
    if (!disabled && !grid.querySelector('[tabindex="0"]')) buttons.find(button=>!button.hidden).tabIndex=0;
  }
  input.addEventListener('change',()=>{
    const focused = grid.querySelector('[tabindex="0"]');
    if (focused) focused.tabIndex = -1;
    const next = buttons.find(button=>button.dataset.shapeChoice===input.value);
    for (const button of buttons) button.setAttribute('aria-pressed',String(button===next));
    if (next) next.tabIndex = 0;
  });
  grid.addEventListener('keydown',event=>{
    const options = buttons.filter(button=>!button.hidden && !button.disabled);
    const index = options.indexOf(event.target);
    if (index<0) return;
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const step = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
    if (!step && !['Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key==='Home' ? 0 : event.key==='End' ? options.length-1 : (index+step+options.length)%options.length;
    const previous = grid.querySelector('[tabindex="0"]');
    if (previous) previous.tabIndex=-1;
    options[next].tabIndex = 0;
    options[next].focus();
  });
  sync();
  return sync;
}
