const files = {
  renderer: '../assets/liquid-glass-renderer.js',
  runtime: './demo.js',
  css: './demo.css',
  backdrop: '../assets/glass-grid.svg',
  license: '../LICENSE'
};

async function loadRuntime() {
  const entries = await Promise.all(Object.entries(files).map(async ([key,path]) => {
    const response = await fetch(new URL(path,import.meta.url));
    if (!response.ok) throw new Error('Could not load '+path);
    return [key,await response.text()];
  }));
  return Object.fromEntries(entries);
}

function portableHTML(config, sources) {
  const backdrop = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sources.backdrop);
  const json = JSON.stringify({...config,backdrop},null,2).replaceAll('<','\u005Cu003c');
  const css = sources.css.replace('../assets/glass-grid.svg',backdrop);
  const runtime = sources.runtime.replace(/^import .*;\r?\n/gm,'');
  return [
    '<!doctype html>',
    '<!-- Liquid Glass UI, MIT. The selected ID identifies the button to reproduce. Keep the stage, backdrop and renderer for matching refraction and merge behavior. -->',
    '<html lang="en" data-glass-export><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Liquid Glass button</title>',
    '<!--\n'+sources.license.trim()+'\n-->',
    '<style>'+css+'</style>',
    '<main id="stage"><canvas id="scene" aria-hidden="true"></canvas><section id="controls"></section></main>',
    '<script id="glass-button-config" type="application/json">'+json+'</script>',
    '<script type="module">\n'+sources.renderer+'\n'+runtime+'\n</script>',
    '</html>'
  ].join('\n');
}

export function mountButtonEditor({root,setButtonText,setButtonGeometry,schedule,addButton,snapshot}) {
  const textTool = document.querySelector('#text-tool');
  const form = document.querySelector('#text-editor');
  const text = document.querySelector('#button-text');
  const picker = document.querySelector('#selected-button');
  const shape = document.querySelector('#button-shape');
  const width = document.querySelector('#button-width');
  const height = document.querySelector('#button-height');
  const copy = document.querySelector('#copy-button');
  const add = document.querySelector('#add-button');
  const message = document.querySelector('#editor-message');
  const dialog = document.querySelector('#copy-dialog');
  const copySource = document.querySelector('#copy-source');
  let selected;
  let runtime;

  function sync() {
    const buttons = [...root.querySelectorAll('.probe')];
    const rect = selected.getBoundingClientRect();
    picker.replaceChildren(...buttons.map((button,index) =>
      new Option((index+1)+'. '+(button.textContent || button.dataset.shape),button.dataset.buttonId)
    ));
    picker.value = selected.dataset.buttonId;
    text.value = selected.textContent;
    shape.value = selected.dataset.shape;
    width.value = Math.round(rect.width*100)/100;
    height.value = Math.round(rect.height*100)/100;
    height.disabled = shape.value === 'circle' || shape.value === 'square';
    add.disabled = buttons.length >= 5;
    add.title = add.disabled ? 'The scene supports up to five editable buttons.' : '';
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
  function applyDimensions() {
    const rect = selected.getBoundingClientRect();
    const limit = (value,fallback) => Math.min(400,Math.max(44,Number.isFinite(value)?value:fallback));
    const w = limit(width.valueAsNumber,rect.width);
    const h = ['circle','square'].includes(shape.value) ? w : limit(height.valueAsNumber,rect.height);
    setButtonGeometry(selected,shape.value,w,h);
    sync();
    schedule();
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
  shape.addEventListener('change',applyDimensions);
  width.addEventListener('change',applyDimensions);
  height.addEventListener('change',applyDimensions);
  add.addEventListener('click',()=>{
    const button = addButton();
    if (button) select(button);
  });
  copy.addEventListener('click',async()=>{
    const config = snapshot(selected);
    copy.disabled = true;
    try {
      runtime ??= loadRuntime();
      const html = portableHTML(config,await runtime);
      try {
        await navigator.clipboard.writeText(html);
        message.textContent = 'Copied the button, backdrop, and effects.';
      } catch {
        copySource.value = html;
        dialog.showModal();
        copySource.select();
      }
    } catch {
      runtime = undefined;
      message.textContent = 'Could not prepare the button. Try copying again.';
    } finally {
      copy.disabled = false;
    }
  });
  window.addEventListener('resize',sync);
  select(root.querySelector('.probe'));
}
