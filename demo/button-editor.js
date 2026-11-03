import { en, zh } from './language.js';
import { loadReplicaSources, mountReplica, portableScene } from './replica.js';

function portableHTML(config, sources) {
  const scene = portableScene(config,sources);
  const json = JSON.stringify(scene.config,null,2).replaceAll('<','\u005Cu003c');
  return [
    '<!doctype html>',
    '<!-- Liquid Glass UI, MIT. The selected ID identifies the button to reproduce. Keep the stage, backdrop and renderer for matching refraction and merge behavior. -->',
    '<html lang="'+(config.language==='zh'?'zh-CN':'en')+'" data-glass-export><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Liquid Glass button</title>',
    '<!--\n'+sources.license.trim()+'\n-->',
    '<style>'+scene.css+'</style>',
    '<main id="stage"><canvas id="scene" aria-hidden="true"></canvas><section id="controls"></section></main>',
    '<script id="glass-button-config" type="application/json">'+json+'</script>',
    '<script type="module">\n'+scene.runtime+'\n</script>',
    '</html>'
  ].join('\n');
}

function portableJS(config, sources) {
  const scene = JSON.stringify(portableScene(config,sources)).replaceAll('<','\u005Cu003c');
  return [
    '// Save as glass-button.js. Import and call mountLiquidGlassButton(targetElement).',
    '// The returned iframe contains the original backdrop and neighboring controls for matching optics.',
    '/*\n'+sources.license.trim()+'\n*/',
    mountReplica.toString(),
    'export function mountLiquidGlassButton(target) {',
    '  return mountReplica(target, '+scene+');',
    '}'
  ].join('\n');
}

function aiSpec(config) {
  const button = config.buttons.find(item=>item.id===config.selected);
  const repo = 'https://github.com/EVEDensity/Liquid-Glass-Skill';
  const runtime = repo+'/tree/6721e538ec29bb4d25cacf32e3a32a7978155b9d';
  return [
    'Recreate the button from the JSON below. Reuse assets/liquid-glass-renderer.js, demo/demo.js and demo/demo.css at the pinned revision. Keep the stage and backdrop for matching refraction, and preserve native button semantics.',
    'Runtime and integration: '+runtime,
    JSON.stringify({
      version:config.version, button, material:config.material,
      stage:config.stage, scene:{controls:config.controls,buttons:config.buttons.filter(item=>item.id!==config.selected)},
      backdrop:'assets/glass-grid.svg', language:config.language,
      rendering:{pixelUnits:'CSS px',opacity:'clear at rest',pressScale:button.shape==='circle'?1.3:1.15,
        font:'650 15px/1.35 "Segoe UI", sans-serif',textColor:'#17242b',
        behavior:['press and release','drag with spring stretch','merge with nearby glass']}
    },null,2)
  ].join('\n\n');
}

export function mountButtonEditor({root,setButtonText,setButtonGeometry,addButton,snapshot,onLanguageChange}) {
  const textTool = document.querySelector('#text-tool');
  const form = document.querySelector('#text-editor');
  const text = document.querySelector('#button-text');
  const picker = document.querySelector('#selected-button');
  const shape = document.querySelector('#button-shape');
  const width = document.querySelector('#button-width');
  const height = document.querySelector('#button-height');
  const copy = document.querySelector('#copy-button');
  const copyReplica = document.querySelector('#copy-replica');
  const copyHTML = document.querySelector('#copy-html');
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
    const buttons = [...root.querySelectorAll('.probe')];
    const rect = selected.getBoundingClientRect();
    picker.replaceChildren(...buttons.map((button,index) =>
      new Option((index+1)+'. '+(button.textContent || strings[button.dataset.shape]),button.dataset.buttonId)
    ));
    picker.value = selected.dataset.buttonId;
    text.value = selected.textContent;
    shape.value = selected.dataset.shape;
    syncSize(rect);
    sizeLink.hidden = !equalSides();
    add.disabled = buttons.length >= 5;
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
    selected = button;
    message.textContent = '';
    sync();
  }
  function setTextEditor(open) {
    form.hidden = !open;
    textTool.setAttribute('aria-expanded',String(open));
    if (open) {
      text.value = selected.textContent;
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
  picker.addEventListener('change',()=>select([...root.querySelectorAll('.probe')].find(button=>button.dataset.buttonId===picker.value)));
  root.addEventListener('pointerdown',event=>select(event.target.closest('.probe')));
  root.addEventListener('focusin',event=>select(event.target.closest('.probe')));
  textTool.addEventListener('click',()=>setTextEditor(form.hidden));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    setButtonText(selected,text.value);
    setTextEditor(false);
    sync();
    textTool.focus();
  });
  form.addEventListener('keydown',event=>{
    if (event.key!=='Escape') return;
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
  copy.addEventListener('click',()=>copyText(aiSpec(snapshot(selected)),'copiedSpec'));
  async function copyExport(button, serialize, status) {
    const config = snapshot(selected);
    button.disabled = true;
    try {
      runtime ??= loadReplicaSources();
      await copyText(serialize(config,await runtime),status);
    } catch {
      runtime = undefined;
      message.textContent = strings.copyError;
    } finally {
      button.disabled = false;
    }
  }
  copyReplica.addEventListener('click',()=>copyExport(copyReplica,portableJS,'copiedReplica'));
  copyHTML.addEventListener('click',()=>copyExport(copyHTML,portableHTML,'copiedHTML'));
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
