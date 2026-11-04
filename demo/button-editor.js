import { en, zh } from './language.js';
import { mountOutlineEditor } from './outline-editor.js';
import { createGlassIcon } from '../assets/glass-button.js';
import { loadReplicaSources, mountReplica, portableScene } from './replica.js';

async function loadButtonSources() {
  const paths = ['liquid-glass-renderer.js','mount-liquid-glass.js','glass-motion.js','glass-button.js'].map(file=>'../assets/'+file);
  const [license,...modules] = await Promise.all(['../LICENSE',...paths].map(async path=>{
    const response = await fetch(new URL(path,import.meta.url));
    if (!response.ok) throw new Error('Could not load '+path);
    return response.text();
  }));
  return {runtime:modules.map(source=>source.replace(/^import .*;\r?\n/gm,'').trim()).join('\n'),license};
}

function portableJS(config, sources) {
  const json = JSON.stringify(config).replaceAll('<','\u005Cu003c');
  return [
    '// Save as glass-button.js. Import and call mountLiquidGlassButton(targetElement).',
    '/*\n'+sources.license.trim()+'\n*/',
    sources.runtime.trim(),
    'export function mountLiquidGlassButton(target, options) {',
    '  return createLiquidGlassButton(target, '+json+', options);',
    '}'
  ].join('\n');
}

const handoffRevision = '9560257262c5f29b17f9c629ba1b86328a62d26c';
const handoffRepository = 'https://github.com/EVEDensity/Liquid-Glass-Skill';

function aiSpec(config, strings) {
  if (config.version === 3) return [
    strings.selectionTask,
    handoffRepository+'/tree/'+handoffRevision,
    strings.selectionMount,'','liquid-glass.json',JSON.stringify(config)
  ].join('\n');
  const runtime = handoffRepository+'/blob/'+handoffRevision+'/assets/glass-button.js';
  return [
    strings.handoffTask,
    runtime,
    strings.handoffMount,
    '',
    'liquid-glass.json',
    JSON.stringify(config)
  ].join('\n');
}

export function mountButtonEditor({root,stage,setButtonText,setControlLabels,setButtonTypography,setButtonGeometry,addButton,removeButton,snapshot,snapshotSelection,onLanguageChange}) {
  const canvasTools = document.querySelector('#canvas-tools');
  const canvasCopy = document.querySelector('#canvas-copy');
  const canvasDelete = document.querySelector('#canvas-delete');
  const resizeHandle = document.querySelector('#canvas-resize');
  const textTool = document.querySelector('#text-tool');
  const textEditor = document.querySelector('#text-editor');
  const text = document.querySelector('#button-text');
  const textLabel = text.previousElementSibling;
  const segmentText = document.querySelector('#segment-text');
  const labelStyle = document.querySelector('#label-style');
  const iconGrid = document.querySelector('#label-icons');
  const selectionBox = document.querySelector('#selection-box');
  const count = document.querySelector('#selection-count');
  const typographyFields = {
    size:document.querySelector('#label-size'),weight:document.querySelector('#label-weight'),
    family:document.querySelector('#label-family'),
    icon:document.querySelector('#label-icon'),
    x:document.querySelector('#label-x'),y:document.querySelector('#label-y')
  };
  const defaultTypography = {size:15,weight:650,family:'system',icon:'',x:50,y:50};
  const shape = document.querySelector('#button-shape');
  const width = document.querySelector('#button-width');
  const height = document.querySelector('#button-height');
  const copyJS = document.querySelector('#copy-button');
  const widthRange = document.querySelector('#width-range');
  const heightRange = document.querySelector('#height-range');
  const add = document.querySelector('#add-button');
  const draw = document.querySelector('#draw-shape');
  const customShape = shape.querySelector('option[value="custom"]');
  const message = document.querySelector('#editor-message');
  const dialog = document.querySelector('#copy-dialog');
  const copySource = document.querySelector('#copy-source');
  let selected;
  let group = [];
  let marquee;
  let runtime;
  let replicaSources;
  let resize;
  let press;
  let strings = en;
  const selection = () => group.length ? group : selected ? [selected] : [];
  const editable = () => selected?.matches('.probe') && !group.length;
  const iconNames = ['', 'plus','check','arrow','search','play','heart','star','download','settings','close','sparkles',
    'mail','home','lock','camera','bell','calendar','bookmark','link','eye','claude','openai','gemini'];
  const iconButtons = iconNames.map(name=>{
    const option = document.createElement('button');
    option.type = 'button';
    option.dataset.icon = name;
    option.dataset.aria = option.dataset.title = 'icon'+(name ? name[0].toUpperCase()+name.slice(1) : 'None');
    option.append(createGlassIcon(document,name || 'none'));
    option.addEventListener('click',()=>{
      typographyFields.icon.value=name;
      typographyFields.icon.dispatchEvent(new Event('input'));
      syncIcons();
    });
    return option;
  });
  iconGrid.append(...iconButtons);
  iconGrid.addEventListener('keydown',event=>{
    const index = iconButtons.indexOf(event.target);
    if (index<0) return;
    const step = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-6,ArrowDown:6}[event.key];
    const next = event.key==='Home' ? 0 : event.key==='End' ? iconButtons.length-1
      : step ? (index+step+iconButtons.length)%iconButtons.length : -1;
    if (next<0) return;
    event.preventDefault();
    iconButtons[next].focus();
  });
  function syncIcons() {
    for (const option of iconButtons) {
      const active = option.dataset.icon===typographyFields.icon.value;
      option.setAttribute('aria-pressed',String(active));
      option.tabIndex = active ? 0 : -1;
    }
  }
  const segmentInputs = Array.from({length:3},(_,i)=>{
    const input = document.createElement('input');
    input.maxLength = 100;
    input.dataset.aria = 'segmentLabel'+i;
    input.addEventListener('input',()=>setControlLabels(selected,segmentInputs.map(field=>field.value)));
    input.addEventListener('keydown',closeTextOnKey);
    return input;
  });
  segmentText.append(...segmentInputs);
  const outlineEditor = mountOutlineEditor(stage,{
    onDraw(geometry) {
      const button = addButton(geometry);
      if (button) select(button);
    },
    onCancel() { draw.focus({preventScroll:true}); }
  });

  function positionOverlay() {
    if (!selection().length || canvasTools.hidden) return;
    const bounds = stage.getBoundingClientRect();
    const rects = selection().map(piece=>piece.getBoundingClientRect());
    const left = Math.min(...rects.map(rect=>rect.left));
    const right = Math.max(...rects.map(rect=>rect.right));
    const top = Math.min(...rects.map(rect=>rect.top));
    const bottom = Math.max(...rects.map(rect=>rect.bottom));
    const toolWidth = canvasTools.offsetWidth;
    const toolHeight = canvasTools.offsetHeight;
    const x = Math.max(6,Math.min(bounds.width-toolWidth-6,(left+right-toolWidth)/2-bounds.left));
    const above = top-bounds.top-toolHeight-12;
    const y = above >= 6 ? above : Math.max(6,Math.min(bounds.height-toolHeight-6,bottom-bounds.top+12));
    canvasTools.style.translate = `${x}px ${y}px`;
    if (!resizeHandle.hidden) resizeHandle.style.translate = `${Math.max(14,Math.min(bounds.width-14,right-bounds.left))}px ${Math.max(14,Math.min(bounds.height-14,bottom-bounds.top))}px`;
  }
  function showOverlay(visible) {
    canvasTools.hidden = !visible;
    resizeHandle.hidden = !visible || !editable();
    textTool.hidden = group.length>1;
    canvasDelete.hidden = !editable();
    count.hidden = group.length<2;
    count.textContent = group.length || '';
    updateCopyLabel();
    if (visible) positionOverlay();
    else setTextEditor(false);
  }
  function updateCopyLabel() {
    const label = group.length>1 ? strings.canvasCopyMany : strings.canvasCopy;
    canvasCopy.title = label;
    canvasCopy.setAttribute('aria-label',label);
  }
  function sync() {
    for (const control of [shape,width,height,widthRange,heightRange]) control.disabled = !editable();
    copyJS.disabled = !selection().length;
    customShape.disabled = !selected?.glassOutline;
    if (editable()) {
      shape.value = selected.dataset.shape;
      syncSize(selected.getBoundingClientRect());
    } else {
      width.value = height.value = '';
    }
    add.disabled = root.querySelectorAll('.probe').length >= 5;
    draw.disabled = add.disabled;
    add.title = add.disabled ? strings.limit : '';
    draw.title = add.title;
    positionOverlay();
  }
  function syncSize(rect) {
    width.value = Math.round(rect.width*100)/100;
    height.value = Math.round(rect.height*100)/100;
    widthRange.value = width.value;
    heightRange.value = height.value;
  }
  function select(button,show = true) {
    markGroup([]);
    if (selected !== button) {
      selected?.removeAttribute('aria-current');
      selected = button;
      selected?.setAttribute('aria-current','true');
      const segment = selected?.matches('.segment');
      text.hidden = textLabel.hidden = Boolean(segment);
      segmentText.hidden = !segment;
      labelStyle.hidden = !selected?.matches('.probe');
      text.value = selected?.matches('.probe') ? selected.textContent : selected?.glassLabels?.[0] ?? '';
      if (segment) [...selected.querySelectorAll('button')].forEach((tab,i)=>segmentInputs[i].value=tab.textContent);
      for (const [key,field] of Object.entries(typographyFields)) {
        field.value = selected?.glassTypography?.[key] ?? defaultTypography[key];
      }
      syncIcons();
      message.textContent = '';
      sync();
    }
    showOverlay(Boolean(selected && show));
  }
  function setTextEditor(open) {
    textEditor.hidden = !open;
    textTool.setAttribute('aria-expanded',String(open));
    if (open) {
      (segmentText.hidden ? text : segmentInputs[0]).select();
    }
    positionOverlay();
  }
  function applyDimensions() {
    if (!editable()) return;
    const rect = selected.getBoundingClientRect();
    const w = limit(width.valueAsNumber,rect.width);
    const h = limit(height.valueAsNumber,rect.height);
    setButtonGeometry(selected,shape.value,w,h);
    syncSize(selected.getBoundingClientRect());
  }
  const limit = (value,fallback) => Math.min(400,Math.max(44,Number.isFinite(value)?value:fallback));
  function resizeCorner(rect,dx,dy) {
    const w = limit(rect.width+dx,rect.width);
    const h = limit(rect.height+dy,rect.height);
    setButtonGeometry(selected,shape.value,w,h,true);
    syncSize(selected.getBoundingClientRect());
    positionOverlay();
  }
  resizeHandle.addEventListener('pointerdown',event=>{
    if (event.button!==0 || !selected || resize) return;
    resize = {id:event.pointerId,x:event.clientX,y:event.clientY,rect:selected.getBoundingClientRect()};
    resizeHandle.setPointerCapture(event.pointerId);
  });
  resizeHandle.addEventListener('pointermove',event=>{
    if (event.pointerId===resize?.id) resizeCorner(resize.rect,event.clientX-resize.x,event.clientY-resize.y);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) {
    resizeHandle.addEventListener(event,e=>{ if (e.pointerId===resize?.id) resize=undefined; });
  }
  resizeHandle.addEventListener('keydown',event=>{
    const step = event.shiftKey?16:4;
    const direction = {ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowDown:[0,step],ArrowUp:[0,-step]}[event.key];
    if (!direction) return;
    event.preventDefault();
    resizeCorner(selected.getBoundingClientRect(),...direction);
  });
  function markGroup(next) {
    for (const piece of group) piece.removeAttribute('data-marquee-selected');
    group = next;
    for (const piece of group) piece.setAttribute('data-marquee-selected','');
  }
  function sweep(event) {
    const box = stage.getBoundingClientRect();
    const x = Math.max(box.left,Math.min(box.right,event.clientX));
    const y = Math.max(box.top,Math.min(box.bottom,event.clientY));
    const left = Math.min(marquee.x,x), right = Math.max(marquee.x,x);
    const top = Math.min(marquee.y,y), bottom = Math.max(marquee.y,y);
    marquee.active ||= Math.hypot(right-left,bottom-top)>=5;
    if (!marquee.active) return;
    selectionBox.hidden = false;
    Object.assign(selectionBox.style,{left:left-box.left+'px',top:top-box.top+'px',width:right-left+'px',height:bottom-top+'px'});
    markGroup([...root.children].filter(piece=>{
      const rect=piece.getBoundingClientRect();
      return rect.left<right && rect.right>left && rect.top<bottom && rect.bottom>top;
    }));
  }
  stage.addEventListener('pointerdown',event=>{
    if (event.button!==0 || !event.isPrimary) return;
    const button = event.target.closest('.glass');
    if (button) {
      press = {button,started:performance.now(),x:event.clientX,y:event.clientY,moved:false};
      const hadGroup = group.length>0;
      markGroup([]);
      if (hadGroup) sync();
      showOverlay(false);
    } else if (event.target===root || event.target===stage) {
      select(null,false);
      press = undefined;
      marquee = {id:event.pointerId,x:event.clientX,y:event.clientY,active:false};
      stage.setPointerCapture(event.pointerId);
    } else if (!event.target.closest('#canvas-tools,#canvas-resize,.language-tools')) showOverlay(false);
  });
  stage.addEventListener('pointermove',event=>{
    if (event.pointerId===marquee?.id) sweep(event);
    if (press && Math.hypot(event.clientX-press.x,event.clientY-press.y)>=5) press.moved=true;
  });
  function finishMarquee(event) {
    if (event.pointerId!==marquee?.id) return;
    if (event.type==='pointerup') sweep(event);
    else markGroup([]);
    marquee=undefined;
    selectionBox.hidden=true;
    if (group.length===1) select(group[0]);
    else { sync(); showOverlay(group.length>1); }
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(type,finishMarquee);
  document.addEventListener('keydown',event=>{
    if (event.key==='Escape' && group.length) { markGroup([]); sync(); showOverlay(false); }
  });
  root.addEventListener('click',event=>{
    const button = event.target.closest('.glass');
    if (button && (event.detail===0 || (press?.button===button && !press.moved && performance.now()-press.started<400))) select(button);
    press = undefined;
  });
  canvasDelete.addEventListener('click',()=>{
    removeButton(selected);
    const next = root.querySelector('.probe');
    select(next);
    if (next) next.focus();
    else add.focus();
    message.textContent = strings.deleted;
  });
  textTool.addEventListener('click',()=>setTextEditor(textEditor.hidden));
  textEditor.querySelector('details').addEventListener('toggle',positionOverlay);
  text.addEventListener('input',()=>{
    if (editable()) setButtonText(selected,text.value);
    else if (selected) setControlLabels(selected,[text.value]);
  });
  for (const field of Object.values(typographyFields)) {
    field.addEventListener('input',()=>{
      const values = Object.fromEntries(Object.entries(typographyFields).map(([key,input])=>{
        if (key==='family' || key==='icon') return [key,input.value];
        const value = input.value===''?defaultTypography[key]:Number(input.value);
        return [key,input.type==='number'?Math.min(Number(input.max),Math.max(Number(input.min),value)):value];
      }));
      setButtonTypography(selected,values);
    });
  }
  function closeTextOnKey(event) {
    if (event.isComposing || !['Enter','Escape'].includes(event.key)) return;
    setTextEditor(false);
    textTool.focus();
  }
  text.addEventListener('keydown',closeTextOnKey);
  shape.addEventListener('change',()=>{applyDimensions();sync();});
  widthRange.addEventListener('input',()=>{width.value=widthRange.value;applyDimensions();});
  heightRange.addEventListener('input',()=>{height.value=heightRange.value;applyDimensions();});
  width.addEventListener('change',()=>applyDimensions());
  height.addEventListener('change',applyDimensions);
  add.addEventListener('click',()=>{
    outlineEditor.stop();
    const button = addButton();
    if (button) select(button);
  });
  draw.addEventListener('click',()=>{
    showOverlay(false);
    outlineEditor.start();
  });
  async function copyText(value, status) {
    try {
      await navigator.clipboard.writeText(value);
      message.textContent = strings[status];
    } catch {
      copySource.value = value;
      dialog.showModal();
      copySource.select();
    }
  }
  function copySelected() {
    if (!selection().length) return;
    const config = editable() ? snapshot(selected) : snapshotSelection(selection());
    copyText(aiSpec(config,strings),'copiedSpec');
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      // The local skill reads the exact config copied to the clipboard.
      fetch('/api/glass-handoff',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)
      }).catch(()=>{});
    }
  }
  canvasCopy.addEventListener('click',copySelected);
  copyJS.addEventListener('click',async()=>{
    if (!selection().length) return;
    const config = editable() ? snapshot(selected) : snapshotSelection(selection());
    copyJS.disabled = true;
    try {
      if (config.version === 3) {
        replicaSources ??= loadReplicaSources(config);
        const sources = await replicaSources;
        const payload = portableScene(config,sources);
        const module = [
          '// Import and call mountLiquidGlassSelection(target, {backdrop: yourImageURL}).',
          '/*\n'+sources.license.trim()+'\n*/',
          mountReplica.toString(),
          'const payload = '+JSON.stringify(payload)+';',
          'export function mountLiquidGlassSelection(target, {backdrop} = {}) {',
          '  const url = backdrop ? new URL(backdrop,target.ownerDocument.baseURI).href : null;',
          '  return mountReplica(target, {...payload,config:{...payload.config,backdrop:url}});',
          '}'
        ].join('\n');
        await copyText(module,'copiedReplica');
      } else {
        runtime ??= loadButtonSources();
        await copyText(portableJS(config,await runtime),'copiedReplica');
      }
    } catch {
      runtime = undefined;
      replicaSources = undefined;
      message.textContent = strings.copyError;
    } finally {
      copyJS.disabled = !selection().length;
    }
  });
  function setLanguage(language) {
    strings = language==='zh' ? zh : en;
    document.documentElement.lang = language==='zh' ? 'zh-CN' : 'en';
    for (const button of document.querySelectorAll('[data-language]')) {
      button.setAttribute('aria-pressed',String(button.dataset.language===language));
    }
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = strings[element.dataset.i18n];
    for (const element of document.querySelectorAll('[data-aria]')) element.setAttribute('aria-label',strings[element.dataset.aria]);
    for (const element of document.querySelectorAll('[data-title]')) element.title = strings[element.dataset.title];
    updateCopyLabel();
    message.textContent = '';
    onLanguageChange(language);
    if (selected) sync();
  }
  for (const button of document.querySelectorAll('[data-language]')) {
    button.addEventListener('click',()=>{
      localStorage.setItem('liquid-glass-language',button.dataset.language);
      setLanguage(button.dataset.language);
    });
  }
  setLanguage(localStorage.getItem('liquid-glass-language')==='zh'?'zh':'en');
  window.addEventListener('resize',sync);
  select(root.querySelector('.probe'),false);
  return positionOverlay;
}
