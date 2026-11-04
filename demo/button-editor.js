import { en, zh } from './language.js';
import { mountOutlineEditor } from './outline-editor.js';
import { mergeGlassOutlines } from './merge-outline.js';
import { mountIconPicker } from './icon-picker.js';
import { mountShapePicker } from './shape-picker.js';
import { MAX_GLASS_SHAPES, measureGlassButton, normalizeGlassRotation } from '../assets/liquid-glass-renderer.js';
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

const handoffRevision = 'dee5331d0814ddf89771e9ad74aef19b0e834f82';
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

export function mountButtonEditor({root,stage,setButtonText,setControlLabels,setButtonTypography,setButtonGeometry,setButtonRotation,previewOutline,addButton,addMenu,removeButton,snapshot,snapshotSelection,onLanguageChange}) {
  const canvasTools = document.querySelector('#canvas-tools');
  const canvasCopy = document.querySelector('#canvas-copy');
  const canvasDelete = document.querySelector('#canvas-delete');
  const merge = document.querySelector('#merge-shapes');
  const menuTool = document.querySelector('#add-menu');
  const resizeHandle = document.querySelector('#canvas-resize');
  const textTool = document.querySelector('#text-tool');
  const textEditor = document.querySelector('#text-editor');
  const labelTitle = document.querySelector('#label-title');
  const geometry = document.querySelector('#object-geometry');
  const empty = document.querySelector('#object-empty');
  const exportSection = document.querySelector('#object-export');
  const inspector = document.querySelector('#presets-panel');
  const tabs = [...inspector.querySelectorAll('[role="tab"]')];
  const text = document.querySelector('#button-text');
  const textLabel = text.previousElementSibling;
  const segmentText = document.querySelector('#segment-text');
  const labelStyle = document.querySelector('#label-style');
  const selectionBox = document.querySelector('#selection-box');
  const count = document.querySelector('#selection-count');
  const typographyFields = {
    size:document.querySelector('#label-size'),weight:document.querySelector('#label-weight'),
    family:document.querySelector('#label-family'),
    x:document.querySelector('#label-x'),y:document.querySelector('#label-y')
  };
  const defaultTypography = {size:15,weight:650,family:'system',icon:'',x:50,y:50};
  const shape = document.querySelector('#button-shape');
  const width = document.querySelector('#button-width');
  const height = document.querySelector('#button-height');
  const rotation = document.querySelector('#button-rotation');
  const rotationRange = document.querySelector('#rotation-range');
  const copyJS = document.querySelector('#copy-button');
  const widthRange = document.querySelector('#width-range');
  const heightRange = document.querySelector('#height-range');
  const add = document.querySelector('#add-button');
  const draw = document.querySelector('#draw-shape');
  const syncShape = mountShapePicker(shape);
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
  const syncIcon = mountIconPicker({
    getStrings:()=>strings,
    onPick(icon,iconGlyph) { updateTypography({icon,iconGlyph}); }
  });

  function showInspector(id) {
    const previous = tabs.find(tab=>tab.getAttribute('aria-selected')==='true');
    for (const tab of tabs) {
      const active = tab.id===id;
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    if (previous?.id!==id) inspector.scrollTop = 0;
  }
  for (const [index,tab] of tabs.entries()) {
    tab.addEventListener('click',()=>showInspector(tab.id));
    tab.addEventListener('keydown',event=>{
      const next = {ArrowLeft:1-index,ArrowRight:1-index,Home:0,End:tabs.length-1}[event.key];
      if (next===undefined) return;
      event.preventDefault();
      showInspector(tabs[next].id);
      tabs[next].focus();
    });
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
    getStrings:()=>strings,
    onPreview:previewOutline,
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
    if (!resizeHandle.hidden) {
      const size = measureGlassButton(selected);
      const angle = selected.glassRotation*Math.PI/180;
      const x = size.x+(size.width*Math.cos(angle)-size.height*Math.sin(angle))/2-bounds.left;
      const y = size.y+(size.width*Math.sin(angle)+size.height*Math.cos(angle))/2-bounds.top;
      resizeHandle.style.translate = `${Math.max(14,Math.min(bounds.width-14,x))}px ${Math.max(14,Math.min(bounds.height-14,y))}px`;
    }
  }
  function showOverlay(visible) {
    canvasTools.hidden = !visible;
    resizeHandle.hidden = !visible || !editable();
    textTool.hidden = group.length>1 || Boolean(selected?.matches('.more-glass'));
    canvasDelete.hidden = !editable() && !selected?.matches('.more-glass');
    merge.hidden = group.length<2 || !group.every(piece=>piece.matches('.probe'));
    count.hidden = group.length<2;
    count.textContent = group.length || '';
    updateCopyLabel();
    if (visible) positionOverlay();
  }
  function updateCopyLabel() {
    const label = group.length>1 ? strings.canvasCopyMany : strings.canvasCopy;
    canvasCopy.title = label;
    canvasCopy.setAttribute('aria-label',label);
  }
  function sync() {
    for (const control of [width,height,widthRange,heightRange,rotation,rotationRange]) control.disabled = !editable();
    copyJS.disabled = !selection().length;
    geometry.hidden = !editable();
    textEditor.hidden = !selected || Boolean(group.length) || selected.matches('.more-glass');
    exportSection.hidden = !selection().length;
    empty.hidden = !textEditor.hidden;
    empty.textContent = group.length ? strings.selectionGroup.replace('{n}',group.length)
      : selected?.matches('.more-glass') ? strings.menuInspector : strings.selectionHint;
    labelTitle.textContent = editable() ? strings.labelTitle
      : selected?.matches('.segment') ? strings.segmentLabels : strings.controlLabel;
    if (editable()) {
      shape.value = selected.dataset.shape;
      syncSize(measureGlassButton(selected));
      rotation.value = rotationRange.value = selected.glassRotation;
    } else {
      width.value = height.value = '';
    }
    syncShape({custom:Boolean(selected?.glassOutline),disabled:!editable()});
    add.disabled = root.children.length >= MAX_GLASS_SHAPES;
    draw.disabled = add.disabled;
    menuTool.disabled = add.disabled || Boolean(root.querySelector('.more-glass'));
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
      syncIcon(selected?.glassTypography);
      message.textContent = '';
      sync();
    }
    if (show && selected) showInspector('object-tab');
    showOverlay(Boolean(selected && show));
  }
  function applyDimensions() {
    if (!editable()) return;
    const rect = measureGlassButton(selected);
    const w = limit(width.valueAsNumber,rect.width);
    const h = limit(height.valueAsNumber,rect.height);
    setButtonGeometry(selected,shape.value,w,h);
    syncSize(measureGlassButton(selected));
  }
  const limit = (value,fallback) => Math.min(400,Math.max(44,Number.isFinite(value)?value:fallback));
  function resizeCorner(rect,dx,dy) {
    const w = limit(rect.width+dx,rect.width);
    const h = limit(rect.height+dy,rect.height);
    setButtonGeometry(selected,shape.value,w,h,true);
    syncSize(measureGlassButton(selected));
    positionOverlay();
  }
  resizeHandle.addEventListener('pointerdown',event=>{
    if (event.button!==0 || !selected || resize) return;
    resize = {id:event.pointerId,x:event.clientX,y:event.clientY,rect:measureGlassButton(selected),angle:selected.glassRotation*Math.PI/180};
    resizeHandle.setPointerCapture(event.pointerId);
  });
  resizeHandle.addEventListener('pointermove',event=>{
    if (event.pointerId!==resize?.id) return;
    const dx = event.clientX-resize.x, dy = event.clientY-resize.y;
    const cos = Math.cos(resize.angle), sin = Math.sin(resize.angle);
    resizeCorner(resize.rect,dx*cos+dy*sin,dy*cos-dx*sin);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) {
    resizeHandle.addEventListener(event,e=>{ if (e.pointerId===resize?.id) resize=undefined; });
  }
  resizeHandle.addEventListener('keydown',event=>{
    const step = event.shiftKey?16:4;
    const direction = {ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowDown:[0,step],ArrowUp:[0,-step]}[event.key];
    if (!direction) return;
    event.preventDefault();
    resizeCorner(measureGlassButton(selected),...direction);
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
      if (!event.shiftKey || !button.matches('.probe')) {
        markGroup([]);
        if (hadGroup) sync();
      }
      showOverlay(false);
    } else if (event.target===root || event.target===stage) {
      // Claim the blank-canvas gesture before the browser starts a native selection drag.
      event.preventDefault();
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
    else {
      if (group.length>1) showInspector('object-tab');
      sync();
      showOverlay(group.length>1);
    }
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(type,finishMarquee);
  document.addEventListener('keydown',event=>{
    if (event.key==='Escape' && group.length) { markGroup([]); sync(); showOverlay(false); }
  });
  root.addEventListener('click',event=>{
    const button = event.target.closest('.glass');
    const isClick = event.detail===0 || (press?.button===button && !press.moved && performance.now()-press.started<400);
    if (button && !button.matches('.more-glass') && isClick) {
      if (event.shiftKey && button.matches('.probe')) {
        const current = selection().filter(piece=>piece.matches('.probe'));
        const next = current.includes(button) ? current.filter(piece=>piece!==button) : [...current,button];
        if (next.length<=1) select(next[0]);
        else {
          select(null,false);
          markGroup(next);
          sync();
          showOverlay(true);
        }
      } else select(button);
    }
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
  merge.addEventListener('click',()=>{
    const result = mergeGlassOutlines(group,stage);
    if (!result.geometry) {
      message.textContent = strings[result.error];
      return;
    }
    const label = group.find(piece=>piece.textContent || piece.glassTypography?.icon);
    const config = {...result.geometry,text:label?.textContent ?? '',typography:label?.glassTypography};
    group.forEach(removeButton);
    const mergedButton = addButton(config);
    select(mergedButton);
    mergedButton?.focus({preventScroll:true});
    message.textContent = strings.merged;
  });
  textTool.addEventListener('click',()=>{
    showInspector('object-tab');
    const field = segmentText.hidden ? text : segmentInputs[0];
    field.focus();
    field.select();
  });
  text.addEventListener('input',()=>{
    if (editable()) setButtonText(selected,text.value);
    else if (selected) setControlLabels(selected,[text.value]);
  });
  function updateTypography(patch = {}) {
    if (!editable()) return;
    const values = Object.fromEntries(Object.entries(typographyFields).map(([key,input])=>{
      if (key==='family') return [key,input.value];
      const value = input.value===''?defaultTypography[key]:Number(input.value);
      return [key,input.type==='number'?Math.min(Number(input.max),Math.max(Number(input.min),value)):value];
    }));
    const typography = {...defaultTypography,...selected.glassTypography,...values,...patch};
    setButtonTypography(selected,typography);
    syncIcon(typography);
  }
  for (const field of Object.values(typographyFields)) field.addEventListener('input',()=>updateTypography());
  function closeTextOnKey(event) {
    if (event.isComposing || !['Enter','Escape'].includes(event.key)) return;
    (canvasTools.hidden ? selected : textTool)?.focus({preventScroll:true});
  }
  text.addEventListener('keydown',closeTextOnKey);
  shape.addEventListener('change',()=>{applyDimensions();sync();});
  widthRange.addEventListener('input',()=>{width.value=widthRange.value;applyDimensions();});
  heightRange.addEventListener('input',()=>{height.value=heightRange.value;applyDimensions();});
  width.addEventListener('change',()=>applyDimensions());
  height.addEventListener('change',applyDimensions);
  function applyRotation(value) {
    if (!editable()) return;
    const angle = Number.isFinite(value) ? normalizeGlassRotation(value) : selected.glassRotation;
    setButtonRotation(selected,angle);
    rotation.value = rotationRange.value = angle;
    positionOverlay();
  }
  rotationRange.addEventListener('input',()=>applyRotation(rotationRange.valueAsNumber));
  rotation.addEventListener('change',()=>applyRotation(rotation.valueAsNumber));
  add.addEventListener('click',()=>{
    outlineEditor.stop();
    const button = addButton();
    if (button) select(button);
  });
  menuTool.addEventListener('click',()=>{
    outlineEditor.stop();
    const menu = addMenu();
    if (menu) select(menu);
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
  function copySelected(items = selection()) {
    if (!items.length) return;
    const config = items.length===1 && items[0].matches('.probe') ? snapshot(items[0]) : snapshotSelection(items);
    copyText(aiSpec(config,strings),'copiedSpec');
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      // The local skill reads the exact config copied to the clipboard.
      fetch('/api/glass-handoff',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)
      }).catch(()=>{});
    }
  }
  canvasCopy.addEventListener('click',()=>copySelected());
  root.addEventListener('glassmenuopen',()=>showOverlay(false));
  root.addEventListener('glassmenuaction',async event=>{
    if (event.detail.action==='copy') {
      copySelected([event.target]);
      return;
    }
    const design = aiSpec(snapshotSelection([event.target]),strings);
    if (navigator.share) {
      try {
        await navigator.share({text:design,title:document.title});
        return;
      } catch (error) {
        if (error.name==='AbortError') return;
      }
    }
    await copyText(design,'menuShared');
  });
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
    for (const element of document.querySelectorAll('[data-placeholder]')) element.placeholder = strings[element.dataset.placeholder];
    updateCopyLabel();
    syncIcon(selected?.glassTypography);
    message.textContent = '';
    onLanguageChange(language);
    sync();
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
