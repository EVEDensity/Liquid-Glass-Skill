const files = {
  renderer: '../assets/liquid-glass-renderer.js',
  motion: '../assets/glass-motion.js',
  runtime: './demo.js',
  css: './demo.css',
  backdrop: '../assets/glass-grid.svg',
  license: '../LICENSE'
};

export async function loadReplicaSources() {
  const entries = await Promise.all(Object.entries(files).map(async ([key,path]) => {
    const response = await fetch(new URL(path,import.meta.url));
    if (!response.ok) throw new Error('Could not load '+path);
    return [key,await response.text()];
  }));
  return Object.fromEntries(entries);
}

export function portableScene(config, sources) {
  const backdrop = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sources.backdrop);
  return {
    config: {...config,backdrop},
    css: sources.css.replace('../assets/glass-grid.svg',backdrop),
    runtime: sources.renderer+'\n'+sources.motion+'\n'+sources.runtime.replace(/^import .*;\r?\n/gm,'')
  };
}

// Use a separate document so host styles cannot change the captured scene.
export function mountReplica(target, {config,css,runtime}) {
  const frame = target.ownerDocument.createElement('iframe');
  const button = config.buttons.find(item=>item.id===config.selected);
  frame.title = button.text || (config.language==='zh'?'液态玻璃按钮':'Liquid glass button');
  frame.width = config.stage.width;
  frame.height = config.stage.height;
  Object.assign(frame.style,{
    display:'block',border:'0',width:config.stage.width+'px',height:config.stage.height+'px'
  });
  target.append(frame);
  const doc = frame.contentDocument;
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

export async function mountLiquidGlassReplica(target, config) {
  return mountReplica(target, portableScene(config, await loadReplicaSources()));
}
