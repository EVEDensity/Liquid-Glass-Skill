import { en, zh } from './language.js';

async function loadButtonSources() {
  const [runtime,license] = await Promise.all(['../assets/glass-button.js','../LICENSE'].map(async path=>{
    const response = await fetch(new URL(path,import.meta.url));
    if (!response.ok) throw new Error('Could not load '+path);
    return response.text();
  }));
  return {runtime,license};
}

function portableJS(config, sources) {
  const json = JSON.stringify(config).replaceAll('<','\u005Cu003c');
  return [
    '// Save as glass-button.js. Import and call mountLiquidGlassButton(targetElement).',
    '/*\n'+sources.license.trim()+'\n*/',
    sources.runtime.trim(),
    'export function mountLiquidGlassButton(target) {',
    '  return createLiquidGlassButton(target, '+json+');',
    '}'
  ].join('\n');
}

function aiSpec(config, strings) {
  const runtime = 'https://github.com/EVEDensity/Liquid-Glass-Skill/blob/4f5479e87cfa442b312cfab47315927f7d24da37/assets/glass-button.js';
  return [
    strings.handoffTask,
    runtime,
    strings.handoffMount,
    '',
    'liquid-glass.json',
    JSON.stringify(config)
  ].join('\n');
}

export function mountButtonEditor({root,setButtonText,setButtonGeometry,addButton,snapshot,onLanguageChange}) {
  const textTool = document.querySelector('#text-tool');
  const textEditor = document.querySelector('#text-editor');
  const text = document.querySelector('#button-text');
  const shape = document.querySelector('#button-shape');
  const width = document.querySelector('#button-width');
  const height = document.querySelector('#button-height');
  const copyJS = document.querySelector('#copy-button');
  const copyReplica = document.querySelector('#copy-replica');
  const widthRange = document.querySelector('#width-range');
  const heightRange = document.querySelector('#height-range');
  const sizeLink = document.querySelector('#size-link');
  const add = document.querySelector('#add-button');
  const message = document.querySelector('#editor-message');
  const dialog = document.querySelector('#copy-dialog');
  const copySource = document.querySelector('#copy-source');
  let selected;
  let runtime;
  let strings = en;

  function sync() {
    const rect = selected.getBoundingClientRect();
    shape.value = selected.dataset.shape;
    syncSize(rect);
    sizeLink.hidden = !equalSides();
    add.disabled = root.querySelectorAll('.probe').length >= 5;
    add.title = add.disabled ? strings.limit : '';
  }
  function syncSize(rect) {
    width.value = Math.round(rect.width*100)/100;
    height.value = Math.round(rect.height*100)/100;
    widthRange.value = width.value;
    heightRange.value = height.value;
  }
  function select(button) {
    if (!button || selected === button) return;
    selected?.removeAttribute('aria-current');
    selected = button;
    selected.setAttribute('aria-current','true');
    text.value = selected.textContent;
    message.textContent = '';
    sync();
  }
  function setTextEditor(open) {
    textEditor.hidden = !open;
    textTool.setAttribute('aria-expanded',String(open));
    if (open) {
      text.select();
    }
  }
  function equalSides() {
    return shape.value === 'circle' || shape.value === 'square';
  }
  function applyDimensions(axis = 'width') {
    const rect = selected.getBoundingClientRect();
    const limit = (value,fallback) => Math.min(400,Math.max(44,Number.isFinite(value)?value:fallback));
    const w = limit(width.valueAsNumber,rect.width);
    const h = limit(height.valueAsNumber,rect.height);
    const linked = equalSides();
    const side = axis === 'height' ? h : w;
    setButtonGeometry(selected,shape.value,linked ? side : w,linked ? side : h);
    syncSize(selected.getBoundingClientRect());
  }
  root.addEventListener('pointerdown',event=>select(event.target.closest('.probe')));
  root.addEventListener('focusin',event=>select(event.target.closest('.probe')));
  textTool.addEventListener('click',()=>setTextEditor(textEditor.hidden));
  text.addEventListener('input',()=>setButtonText(selected,text.value));
  text.addEventListener('keydown',event=>{
    if (event.isComposing || !['Enter','Escape'].includes(event.key)) return;
    setTextEditor(false);
    textTool.focus();
  });
  shape.addEventListener('change',()=>{applyDimensions();sync();});
  widthRange.addEventListener('input',()=>{width.value=widthRange.value;applyDimensions();});
  heightRange.addEventListener('input',()=>{height.value=heightRange.value;applyDimensions('height');});
  width.addEventListener('change',()=>applyDimensions());
  height.addEventListener('change',()=>applyDimensions('height'));
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
  copyReplica.addEventListener('click',()=>copyText(aiSpec(snapshot(selected),strings),'copiedSpec'));
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
      copyJS.disabled = false;
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
  select(root.querySelector('.probe'));
}
