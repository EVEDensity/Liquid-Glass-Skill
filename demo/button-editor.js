import { en, zh } from './language.js';

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

function aiSpec(config, strings) {
  const runtime = 'https://github.com/EVEDensity/Liquid-Glass-Skill/blob/1b2440e86299a734ea9c81394bd06aba1636a498/assets/glass-button.js';
  return [
    strings.handoffTask,
    runtime,
    strings.handoffMount,
    '',
    'liquid-glass.json',
    JSON.stringify(config)
  ].join('\n');
}

export function mountButtonEditor({root,stage,setButtonText,setButtonGeometry,addButton,removeButton,snapshot,onLanguageChange}) {
  const canvasTools = document.querySelector('#canvas-tools');
  const canvasCopy = document.querySelector('#canvas-copy');
  const canvasDelete = document.querySelector('#canvas-delete');
  const resizeHandle = document.querySelector('#canvas-resize');
  const textTool = document.querySelector('#text-tool');
  const textEditor = document.querySelector('#text-editor');
  const text = document.querySelector('#button-text');
  const shape = document.querySelector('#button-shape');
  const width = document.querySelector('#button-width');
  const height = document.querySelector('#button-height');
  const copyJS = document.querySelector('#copy-button');
  const widthRange = document.querySelector('#width-range');
  const heightRange = document.querySelector('#height-range');
  const add = document.querySelector('#add-button');
  const message = document.querySelector('#editor-message');
  const dialog = document.querySelector('#copy-dialog');
  const copySource = document.querySelector('#copy-source');
  let selected;
  let runtime;
  let resize;
  let strings = en;

  function positionOverlay() {
    if (!selected || canvasTools.hidden) return;
    const bounds = stage.getBoundingClientRect();
    const rect = selected.getBoundingClientRect();
    const toolWidth = canvasTools.offsetWidth;
    const toolHeight = canvasTools.offsetHeight;
    const x = Math.max(6,Math.min(bounds.width-toolWidth-6,rect.left-bounds.left+(rect.width-toolWidth)/2));
    const above = rect.top-bounds.top-toolHeight-12;
    const y = above >= 6 ? above : Math.max(6,Math.min(bounds.height-toolHeight-6,rect.bottom-bounds.top+12));
    canvasTools.style.translate = `${x}px ${y}px`;
    resizeHandle.style.translate = `${Math.max(14,Math.min(bounds.width-14,rect.right-bounds.left))}px ${Math.max(14,Math.min(bounds.height-14,rect.bottom-bounds.top))}px`;
  }
  function showOverlay(visible) {
    canvasTools.hidden = resizeHandle.hidden = !visible;
    if (visible) positionOverlay();
    else setTextEditor(false);
  }
  function sync() {
    for (const control of [shape,width,height,widthRange,heightRange,copyJS]) control.disabled = !selected;
    if (selected) {
      shape.value = selected.dataset.shape;
      syncSize(selected.getBoundingClientRect());
    } else {
      width.value = height.value = '';
    }
    add.disabled = root.querySelectorAll('.probe').length >= 5;
    add.title = add.disabled ? strings.limit : '';
    positionOverlay();
  }
  function syncSize(rect) {
    width.value = Math.round(rect.width*100)/100;
    height.value = Math.round(rect.height*100)/100;
    widthRange.value = width.value;
    heightRange.value = height.value;
  }
  function select(button,show = true) {
    if (selected !== button) {
      selected?.removeAttribute('aria-current');
      selected = button;
      selected?.setAttribute('aria-current','true');
      text.value = selected?.textContent ?? '';
      message.textContent = '';
      sync();
    }
    showOverlay(Boolean(selected && show));
  }
  function setTextEditor(open) {
    textEditor.hidden = !open;
    textTool.setAttribute('aria-expanded',String(open));
    if (open) {
      text.select();
    }
    positionOverlay();
  }
  function applyDimensions() {
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
  stage.addEventListener('pointerdown',event=>{
    const button = event.target.closest('.probe');
    if (button) select(button);
    else if (!event.target.closest('#canvas-tools,#canvas-resize,.language-tools')) showOverlay(false);
  });
  root.addEventListener('focusin',event=>{
    const button = event.target.closest('.probe');
    if (button) select(button);
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
  text.addEventListener('input',()=>setButtonText(selected,text.value));
  text.addEventListener('keydown',event=>{
    if (event.isComposing || !['Enter','Escape'].includes(event.key)) return;
    setTextEditor(false);
    textTool.focus();
  });
  shape.addEventListener('change',()=>{applyDimensions();sync();});
  widthRange.addEventListener('input',()=>{width.value=widthRange.value;applyDimensions();});
  heightRange.addEventListener('input',()=>{height.value=heightRange.value;applyDimensions();});
  width.addEventListener('change',()=>applyDimensions());
  height.addEventListener('change',applyDimensions);
  add.addEventListener('click',()=>{
    const button = addButton();
    if (button) select(button);
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
    const config = snapshot(selected);
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
    const config = snapshot(selected);
    copyJS.disabled = true;
    try {
      runtime ??= loadButtonSources();
      await copyText(portableJS(config,await runtime),'copiedReplica');
    } catch {
      runtime = undefined;
      message.textContent = strings.copyError;
    } finally {
      copyJS.disabled = !selected;
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
