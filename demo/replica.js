const files = {
  renderer: '../assets/liquid-glass-renderer.js',
  motion: '../assets/glass-motion.js',
  button: '../assets/glass-button.js',
  mount: '../assets/mount-liquid-glass.js',
  runtime: './demo.js',
  css: './demo.css',
  backdrop: '../assets/glass-grid.svg',
  license: '../LICENSE'
};

export async function loadReplicaSources(config) {
  const entries = await Promise.all(Object.entries(files).filter(([key])=>key!=='backdrop'||config?.version!==3).map(async ([key,path]) => {
    const response = await fetch(new URL(path,import.meta.url));
    if (!response.ok) throw new Error('Could not load '+path);
    return [key,await response.text()];
  }));
  return Object.fromEntries(entries);
}

export function portableScene(config, sources, options = {}) {
  const grid = sources.backdrop && 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sources.backdrop);
  const backdrop = options.backdrop ?? (config.version === 3 ? null : grid);
  return {
    config: {...config,backdrop:backdrop && new URL(backdrop,options.baseURI ?? document.baseURI).href},
    css: sources.css.replace("url('../assets/glass-grid.svg')",grid ? `url('${grid}')` : 'none'),
    runtime: [sources.renderer,sources.motion,sources.mount,sources.button,sources.runtime]
      .map(source=>source.replace(/^import .*;\r?\n/gm,'')).join('\n')
  };
}

// Use a separate document so host styles cannot change the captured scene.
export function mountReplica(target, {config,css,runtime}) {
  const frame = target.ownerDocument.createElement('iframe');
  const button = config.buttons?.find(item=>item.id===config.selected);
  frame.title = button?.text || (config.language==='zh'?'液态玻璃控件':'Liquid glass controls');
  frame.width = config.stage.width;
  frame.height = config.stage.height;
  Object.assign(frame.style,{
    display:'block',border:'0',width:config.stage.width+'px',height:config.stage.height+'px'
  });
  target.append(frame);
  const doc = frame.contentDocument;
  frame.glassReady = new Promise(resolve=>doc.addEventListener('glassready',()=>resolve(doc),{once:true}));
  doc.documentElement.lang = config.language==='zh'?'zh-CN':'en';
  doc.documentElement.setAttribute('data-glass-export','');
  const style = doc.createElement('style');
  style.textContent = css;
  doc.head.append(style);
  const stage = doc.createElement('main');
  stage.id = 'stage';
  const canvas = doc.createElement('canvas');
  canvas.id = 'scene';
  canvas.setAttribute('aria-hidden','true');
  const controls = doc.createElement('section');
  controls.id = 'controls';
  stage.append(canvas,controls);
  const state = doc.createElement('script');
  state.type = 'application/json';
  state.id = 'glass-button-config';
  state.textContent = JSON.stringify(config);
  const script = doc.createElement('script');
  script.type = 'module';
  script.textContent = runtime;
  doc.body.append(stage,state,script);
  return frame;
}

export async function mountLiquidGlassReplica(target, config, options) {
  return mountReplica(target, portableScene(config, await loadReplicaSources(config), {baseURI:target.ownerDocument.baseURI,...options}));
}
