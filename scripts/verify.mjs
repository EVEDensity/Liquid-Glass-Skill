import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, 'evidence');
await mkdir(evidence, { recursive: true });
const url = process.env.GLASS_TEST_URL || 'http://127.0.0.1:58423';
let server;
try { if (!(await fetch(url)).ok) throw new Error(); }
catch {
  server = spawn(process.execPath, [resolve(root, 'scripts/serve.mjs')], { stdio: 'pipe' });
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error('Dev server startup timed out')), 10000);
    server.once('error', reject);
    server.stdout.on('data', () => { clearTimeout(timeout); resolveReady(); });
    server.once('exit', code => reject(new Error(`Dev server exited ${code}`)));
  });
}
let browser;
const checks = [];
const errors = [];
function record(name) { checks.push(name); console.log(`PASS ${name}`); }
async function selectWallpaper(page,name) {
  const button = page.locator(`[data-wallpaper="${name}"]`);
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
  await page.locator(`[data-wallpaper="${name}"][aria-pressed="true"]`).waitFor();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function ready(page, wallpaper = 'grid') {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.glassDemo?.source);
  await selectWallpaper(page,wallpaper);
}
try {
  // Use the caller's browser when supplied, otherwise Edge then Playwright Chromium.
  try { browser = await chromium.launch(process.env.GLASS_BROWSER_PATH ? { executablePath: process.env.GLASS_BROWSER_PATH } : { channel: 'msedge', headless: true }); }
  catch { browser = await chromium.launch({ headless: true }); }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('favicon')) errors.push(msg.text()); });
  await ready(page,'daisy');
  assert.equal(await page.evaluate(() => window.glassDemo.available), true, 'WebGL2 unavailable in verification browser');
  record('WebGL2 source loaded and shader linked');
  const screenshot = resolve(evidence, 'demo-desktop.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const wallpaperFrames = [];
  for (const name of ['daisy','prism','lake','grid']) {
    await selectWallpaper(page,name);
    assert.equal(await page.locator('[data-wallpaper][aria-pressed="true"]').count(),1);
    wallpaperFrames.push((await page.locator('#scene').screenshot()).toString('base64'));
    if (name === 'prism') await page.locator('#stage').screenshot({path:resolve(evidence,'demo-crisp-prism.png')});
  }
  assert.equal(new Set(wallpaperFrames).size,4);
  record('Three photo backgrounds and the grid switch both the stage and WebGL source');
  assert.equal(await page.evaluate(() => window.glassDemo.material.refraction), 18);
  assert.equal(await page.evaluate(() => window.glassDemo.material.merge), 10);
  assert.equal(await page.evaluate(() => window.glassDemo.material.pickup), .35);
  assert.equal(await page.locator('#controls > .glass').count(), 4);
  assert.equal(await page.locator('#layouts').count(),0);
  assert.equal(await page.locator('.canvas-caption').count(),0);
  record('The single scene opens with four interactive controls and no layout bar');
  const presetLabels=['Apple Liquid Glass','Apple clear','Thick lens','Frosted','Plain lens','Prism'];
  const materials=[];
  const sceneFrames=[];
  const initialShapes=await page.evaluate(()=>window.glassDemo.shapes);
  for(const name of presetLabels){
    const button=page.getByRole('button',{name,exact:true});
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    materials.push(await page.evaluate(()=>window.glassDemo.material));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    sceneFrames.push((await page.locator('#scene').screenshot()).toString('base64'));
  }
  assert.deepEqual(materials.map(m=>m.name),presetLabels);
  assert.equal(new Set(sceneFrames).size,6);
  assert.deepEqual(await page.evaluate(()=>window.glassDemo.shapes),initialShapes);
  const optics = await page.evaluate(async materials=>{
    const {GlassScene}=await import('/assets/liquid-glass-renderer.js');
    const canvas=document.createElement('canvas');
    canvas.style.cssText='position:fixed;top:0;left:0;width:256px;height:144px';
    document.body.append(canvas);
    const source=document.createElement('canvas');
    source.width=256;source.height=144;
    const ctx=source.getContext('2d');
    ctx.fillStyle='#b4b4b4';
    ctx.fillRect(0,0,256,144);
    ctx.fillStyle='#303030';
    for(let x=16;x<256;x+=16)ctx.fillRect(x,0,3,144);
    const scene=new GlassScene(canvas);
    scene.setSource(source);
    scene.setShapes([{x:128,y:72,width:180,height:74,radius:37}]);
    const gl=scene.gl;
    const colors=materials.map(material=>{
      scene.setMaterial({...material,clearControls:false});
      scene.render();
      const rgba=new Uint8Array(256*144*4);
      gl.readPixels(0,0,256,144,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
      const pixel=(x,y)=>rgba.subarray(((143-y)*256+x)*4,((143-y)*256+x)*4+3);
      const center=Array.from({length:49},(_,i)=>pixel(104+i,72)[0]);
      let chromatic=0;
      for(let x=52;x<=204;x++)for(let y=39;y<=50;y++){
        const rgb=pixel(x,y);
        if(Math.max(...rgb)-Math.min(...rgb)>25)chromatic++;
      }
      return {contrast:Math.max(...center)-Math.min(...center),center,chromatic,background:pixel(7,8)[0]};
    });
    const error=gl.getError();
    scene.destroy();canvas.remove();
    return {colors,error};
  },materials);
  const [regular,clear,thick,frosted,plain,prism]=optics.colors;
  assert.equal(optics.error,0);
  assert.ok(clear.contrast>regular.contrast+30 && clear.background<regular.background-40);
  assert.ok(frosted.contrast<15 && plain.contrast>75);
  assert.ok(thick.center.filter((value,index)=>Math.abs(value-plain.center[index])>50).length>5);
  assert.ok(prism.chromatic>100 && prism.chromatic>plain.chromatic+100);
  record('The six presets apply distinct blur, scrim, magnification and dispersion');

  assert.equal(await page.locator('#status').count(),0);
  await page.locator('#height-range').press('ArrowRight');
  const circle = await page.locator('#controls .probe').boundingBox();
  assert.deepEqual([circle.width,circle.height],[120,121]);
  await page.getByRole('button',{name:'Add shape',exact:true}).click();
  await page.locator('#button-shape').selectOption('rounded');
  const newButton = page.locator('#controls .probe').last();
  const initial = await newButton.boundingBox();
  const widthSlider = await page.locator('#width-range').boundingBox();
  await page.mouse.move(widthSlider.x+widthSlider.width*.25,widthSlider.y+widthSlider.height/2);
  await page.mouse.down();
  await page.mouse.move(widthSlider.x+widthSlider.width*.65,widthSlider.y+widthSlider.height/2,{steps:6});
  const during = await newButton.boundingBox();
  await page.mouse.up();
  assert.ok(during.width>initial.width+50);
  assert.equal(during.x+during.width/2,initial.x+initial.width/2);
  assert.equal(during.height,initial.height);
  assert.equal(Number(await page.locator('#button-width').inputValue()),during.width);
  const handle = await page.locator('#canvas-resize').boundingBox();
  assert.equal(handle.x+handle.width/2,during.x+during.width);
  assert.equal(handle.y+handle.height/2,during.y+during.height);
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
  await page.mouse.down();
  await page.mouse.move(handle.x+handle.width/2+24,handle.y+handle.height/2+18,{steps:4});
  await page.mouse.up();
  const resized = await newButton.boundingBox();
  assert.deepEqual([resized.width,resized.height],[during.width+24,during.height+18]);
  assert.equal(resized.x,during.x);
  assert.equal(resized.y,during.y);
  const setSize=async(id,value)=>{
    const field=page.locator(id);
    await field.fill(String(value));
    await field.press('Tab');
  };
  await setSize('#button-width',183);
  await setSize('#button-height',74);
  await page.locator('#canvas-tools').getByRole('button',{name:'Edit button text',exact:true}).click();
  assert.equal(await page.locator('#presets-panel #text-tool').count(),0);
  const label='保存 </script> & Go';
  await page.getByLabel('Button text',{exact:true}).fill(label);
  const edited=page.getByRole('button',{name:label,exact:true});
  await edited.waitFor();
  assert.equal(await page.getByRole('button',{name:'Apply',exact:true}).count(),0);
  assert.equal(await page.locator('#selected-button').count(),0);
  await page.locator('#controls .probe').first().click();
  assert.equal(await page.locator('#button-text').inputValue(),'');
  await edited.click();
  assert.equal(await page.locator('#button-text').inputValue(),label);
  await page.locator('#button-text').press('Enter');
  const editedBounds=await edited.boundingBox();
  assert.deepEqual([editedBounds.width,editedBounds.height],[183,74]);
  await page.waitForFunction(()=>window.glassDemo.shapes.length===5);
  assert.equal(await page.evaluate(()=>window.glassDemo.shapes.at(-1).radius),16);
  await page.getByRole('button',{name:'中文',exact:true}).click();
  const languageShift = () => page.locator('.language-tools').evaluate(el=>getComputedStyle(el,'::before').translate);
  assert.notEqual(await languageShift(),'54px');
  await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.language-tools'),'::before').translate)===0);
  assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
  await page.getByRole('button',{name:'周',exact:true}).waitFor();
  await page.getByRole('button',{name:'编辑按钮文字',exact:true}).waitFor();
  await page.locator('#canvas-copy').getByText('复制给 AI',{exact:true}).waitFor();
  assert.equal(await edited.textContent(),label);
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.language-tools'),'::before').translate)===54);
  await page.getByRole('button',{name:'Week',exact:true}).waitFor();
  record('Canvas selection, live text and horizontal sizing work in both editor languages');
  await page.getByRole('button',{name:'Copy selected button for AI',exact:true}).click();
  assert.equal(await page.locator('.canvas-tool-row button').first().textContent().then(text=>text.trim()),'Copy for AI');
  await page.getByRole('status').getByText('Copied. Paste this into your coding AI.').waitFor();
  const handoff=await page.evaluate(()=>navigator.clipboard.readText());
  const spec=JSON.parse(handoff.split(/liquid-glass\.json\r?\n/).at(-1));
  await page.waitForFunction(async expected=>{
    const latest = await (await fetch('/api/glass-handoff')).json();
    return latest && JSON.stringify(latest.config)===expected;
  },JSON.stringify(spec));
  record('The main demo sends the same configuration to the local skill and clipboard');
  assert.ok(handoff.length<1400);
  assert.match(handoff,/github\.com\/EVEDensity\/Liquid-Glass-Skill\/blob\/[a-f0-9]{40}\/assets\/glass-button\.js/);
  assert.match(handoff,/createLiquidGlassButton\(container, config, \{stage, source, requireExact:true\}\)/);
  assert.deepEqual(Object.keys(spec).sort(),['button','language','material','version']);
  assert.equal(spec.material.name,'Prism');
  assert.deepEqual(spec.button,{shape:'rounded',text:label,width:183,height:74,radius:16});
  const compactPage = await context.newPage();
  const compactURL = new URL('/replica-test',url).href;
  await compactPage.route(compactURL,route=>route.fulfill({
    contentType:'text/html',body:'<!doctype html><style>body{background:#647784} main{padding:30px}</style><main><p>Host content</p></main>'
  }));
  await compactPage.goto(compactURL);
  await compactPage.evaluate(async config=>{
    const {createLiquidGlassButton} = await import('/assets/glass-button.js');
    createLiquidGlassButton(document.querySelector('main'),config);
  },spec);
  const compactButton = compactPage.getByRole('button',{name:label,exact:true});
  assert.equal(await compactPage.getByRole('button').count(),1);
  assert.equal(await compactPage.locator('canvas, iframe, svg, img, input').count(),0);
  assert.equal(await compactPage.locator('main p').textContent(),'Host content');
  assert.equal(await compactButton.evaluate(el=>getComputedStyle(document.body).backgroundColor),'rgb(100, 119, 132)');
  const firstBackdrop = await compactButton.screenshot();
  await compactPage.evaluate(()=>document.body.style.backgroundColor='#bd7555');
  assert.ok(!firstBackdrop.equals(await compactButton.screenshot()),'Glass responds to the target page backdrop');
  await compactPage.close();
  record('AI handoff mounts only the chosen button and uses the host page background');

  const opticalPage = await context.newPage();
  const stageSize = await page.locator('#stage').boundingBox();
  await opticalPage.route(compactURL,route=>route.fulfill({
    contentType:'text/html',body:'<!doctype html><body style="margin:0"><main style="position:relative"><div style="position:absolute"></div></main></body>'
  }));
  await opticalPage.goto(compactURL);
  await opticalPage.evaluate(async ({spec,stageSize,editedBounds})=>{
    const stage = document.querySelector('main');
    Object.assign(stage.style,{width:stageSize.width+'px',height:stageSize.height+'px',background:'url(/assets/glass-grid.svg) center/cover'});
    const target = stage.firstElementChild;
    Object.assign(target.style,{left:editedBounds.x-stageSize.x+'px',top:editedBounds.y-stageSize.y+'px'});
    const source = new Image();
    source.src = '/assets/glass-grid.svg';
    await source.decode();
    const {createLiquidGlassButton} = await import('/assets/glass-button.js');
    createLiquidGlassButton(target,spec,{stage,source,requireExact:true});
  },{spec,stageSize,editedBounds});
  const opticalButton = opticalPage.getByRole('button',{name:label,exact:true});
  await opticalPage.locator('button[data-refractive]').waitFor();
  assert.deepEqual(await opticalButton.boundingBox(),editedBounds);
  const clip = {...editedBounds};
  const hideEditor = '#canvas-tools,#canvas-resize { visibility: hidden !important; }';
  const originalGlass = await page.screenshot({clip,style:hideEditor});
  const exportedGlass = await opticalPage.screenshot({clip});
  const averageError = await opticalPage.evaluate(async shots=>{
    const pixels = await Promise.all(shots.map(async shot=>{
      const image = new Image();
      image.src='data:image/png;base64,'+shot;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width=image.width; canvas.height=image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image,0,0);
      return ctx.getImageData(0,0,canvas.width,canvas.height).data;
    }));
    return pixels[0].reduce((sum,value,index)=>sum+Math.abs(value-pixels[1][index]),0)/pixels[0].length;
  },[originalGlass,exportedGlass].map(shot=>shot.toString('base64')));
  await writeFile(resolve(evidence,'button-webgl-reference.png'),originalGlass);
  await writeFile(resolve(evidence,'button-webgl-export.png'),exportedGlass);
  assert.equal(averageError,0,'Exact WebGL export must match every channel');
  const center = [clip.x+clip.width/2,clip.y+clip.height/2];
  const expandedClip = {x:clip.x-16,y:clip.y-12,width:clip.width+32,height:clip.height+24};
  await page.bringToFront();
  await page.mouse.move(...center);
  await page.mouse.down();
  await page.waitForFunction(()=>window.glassDemo.shapes.at(-1).press===1);
  const referenceHeld = await page.screenshot({clip:expandedClip,style:hideEditor,path:resolve(evidence,'button-webgl-reference-held.png')});
  const dragEnd = [center[0]+32,center[1]+18];
  await page.mouse.move(...dragEnd,{steps:5});
  await page.mouse.up();
  await page.waitForFunction(()=>{
    const button = window.glassDemo.shapes.at(-1);
    return button.press===0 && button.motion===0 && button.stretchX===0 && button.stretchY===0;
  });
  const movedClip = {...expandedClip,x:expandedClip.x+32,y:expandedClip.y+18};
  const referenceReleased = await page.screenshot({clip:movedClip,style:hideEditor});
  await opticalPage.bringToFront();
  await opticalPage.mouse.move(...center);
  await opticalPage.mouse.down();
  await opticalPage.waitForTimeout(420);
  const heldGlass = await opticalPage.screenshot({clip});
  assert.ok(!heldGlass.equals(exportedGlass));
  const exportedHeld = await opticalPage.screenshot({clip:expandedClip,path:resolve(evidence,'button-webgl-export-held.png')});
  assert.ok(referenceHeld.equals(exportedHeld),'Exact WebGL export must match the held button pixel for pixel');
  await opticalPage.mouse.move(...dragEnd,{steps:5});
  await opticalPage.mouse.up();
  const moved = await opticalButton.boundingBox();
  assert.deepEqual([moved.x,moved.y],[clip.x+32,clip.y+18]);
  await opticalPage.waitForTimeout(650);
  const exportedReleased = await opticalPage.screenshot({clip:movedClip});
  assert.ok(referenceReleased.equals(exportedReleased),'Exact WebGL export must match after drag and release');
  await opticalButton.evaluate(el=>el.disposeLiquidGlass());
  assert.equal(await opticalPage.locator('canvas').count(),0);
  await opticalPage.close();
  record('Single-button WebGL export matches the demo pixel for pixel at rest, on hold and after drag release');
  await page.getByRole('button',{name:'Copy offline JS',exact:true}).click();
  await page.getByRole('status').getByText('Offline JavaScript copied.').waitFor();
  const moduleCode = await page.evaluate(()=>navigator.clipboard.readText());
  assert.ok(!/glass-grid|createElement\('iframe'\)/.test(moduleCode));
  const replicaPage = await context.newPage();
  const replicaRequests = [];
  replicaPage.on('request',request=>{if(/^https?:/.test(request.url()))replicaRequests.push(request.url());});
  replicaPage.on('pageerror',error=>errors.push(error.message));
  await replicaPage.addStyleTag({content:'body { margin: 100px; }'});
  await replicaPage.evaluate(async code=>{
    const url = URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
    try {
      const {mountLiquidGlassButton} = await import(url);
      window.mountCopiedGlass = mountLiquidGlassButton;
      const button = mountLiquidGlassButton(document.body);
      window.activations = 0;
      button.addEventListener('click',()=>window.activations++);
    } finally {
      URL.revokeObjectURL(url);
    }
  },moduleCode);
  const replicaButton = replicaPage.getByRole('button',{name:label,exact:true});
  const copied = await replicaButton.boundingBox();
  assert.deepEqual([copied.width,copied.height],[183,74]);
  assert.equal(await replicaButton.evaluate(el=>getComputedStyle(el).borderRadius),'16px');
  await replicaButton.press('Enter');
  assert.equal(await replicaPage.evaluate(()=>window.activations),1);
  await replicaPage.mouse.move(copied.x+copied.width/2,copied.y+copied.height/2);
  await replicaPage.mouse.down();
  await replicaPage.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('button'),'::before').scale)>1.1);
  await replicaPage.mouse.move(copied.x+copied.width/2+36,copied.y+copied.height/2+20,{steps:5});
  await replicaPage.mouse.up();
  const dragged = await replicaButton.boundingBox();
  assert.deepEqual([dragged.x,dragged.y],[copied.x+36,copied.y+20]);
  assert.equal(await replicaPage.evaluate(()=>window.activations),1);
  await replicaPage.evaluate(()=>{
    document.querySelector('button').remove();
    const stage = document.createElement('main');
    Object.assign(stage.style,{position:'relative',width:'360px',height:'180px'});
    document.body.append(stage);
    const source = document.createElement('canvas');
    source.width=360; source.height=180;
    const ctx=source.getContext('2d');
    ctx.fillStyle='#314c42';
    ctx.fillRect(0,0,360,180);
    window.mountCopiedGlass(stage,{stage,source});
  });
  await replicaPage.locator('button[data-refractive]').waitFor();
  assert.equal(await replicaPage.locator('canvas').count(),1);
  assert.deepEqual(replicaRequests,[]);
  await replicaPage.close();
  record('Offline JS exports one native button with exact geometry, keyboard activation, and press/drag motion');
  await page.getByRole('button',{name:'Delete selected button',exact:true}).click();
  await edited.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Delete selected button',exact:true}).click();
  assert.equal(await page.locator('#controls .probe').count(),0);
  assert.equal(await page.locator('#controls > .glass').count(),3);
  assert.equal(await page.locator('#copy-button').isDisabled(),true);
  await page.locator('#add-button').click();
  await page.locator('#canvas-tools').waitFor();
  record('Floating toolbar deletes only the selected shape and recovers when a shape is added');
  await page.getByRole('button',{name:'Draw shape',exact:true}).click();
  await page.mouse.move(155,115);
  await page.mouse.down();
  for (const [x,y] of [[300,115],[300,145],[220,145],[220,204],[155,204],[155,115]]) {
    await page.mouse.move(x,y);
  }
  await page.mouse.up();
  const custom = page.locator('.probe[data-shape="custom"]');
  await custom.waitFor();
  await page.waitForFunction(()=>window.glassDemo.shapes.some(shape=>shape.outline?.length>=6));
  assert.equal(await page.evaluate(()=>document.elementFromPoint(175,165).dataset.shape),'custom');
  assert.notEqual(await page.evaluate(()=>document.elementFromPoint(260,174).dataset.shape),'custom');
  await page.getByRole('button',{name:'Copy selected button for AI',exact:true}).click();
  const customHandoff = await page.evaluate(()=>navigator.clipboard.readText());
  const customConfig = JSON.parse(customHandoff.split(/liquid-glass\.json\r?\n/).at(-1));
  assert.equal(customConfig.button.shape,'custom');
  assert.equal(customConfig.button.outline.length,7);
  const customStage = await page.locator('#stage').boundingBox();
  const customBox = await custom.boundingBox();
  const customPixels = await page.screenshot({clip:customBox,style:hideEditor,path:resolve(evidence,'custom-glass-shape.png')});
  const customPage = await context.newPage();
  await customPage.route(compactURL,route=>route.fulfill({
    contentType:'text/html',body:'<!doctype html><body style="margin:0"><main style="position:relative"><div style="position:absolute"></div></main></body>'
  }));
  await customPage.goto(compactURL);
  await customPage.evaluate(async ({config,stageBox,box})=>{
    const stage = document.querySelector('main');
    Object.assign(stage.style,{width:stageBox.width+'px',height:stageBox.height+'px',background:'url(/assets/glass-grid.svg) center/cover'});
    const target = stage.firstElementChild;
    Object.assign(target.style,{left:box.x-stageBox.x+'px',top:box.y-stageBox.y+'px'});
    const source = new Image();
    source.src = '/assets/glass-grid.svg';
    await source.decode();
    const {createLiquidGlassButton} = await import('/assets/glass-button.js');
    createLiquidGlassButton(target,config,{stage,source,requireExact:true});
  },{config:customConfig,stageBox:customStage,box:customBox});
  await customPage.locator('[data-refractive]').waitFor();
  await customPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const copiedCustomPixels = await customPage.screenshot({clip:customBox,path:resolve(evidence,'custom-glass-export.png')});
  assert.ok(customPixels.equals(copiedCustomPixels),'A copied concave outline must render pixel for pixel');
  await customPage.close();
  record('A hand-drawn concave glass button preserves its hit area and exports pixel for pixel');
  await ready(page);
  // Sample the actual rendered selector, rather than the CSS transition or its target.
  await page.waitForFunction(()=>window.glassDemo.shapes.some(s=>s.surface==='selection'));
  const flow = await page.evaluate(async () => {
    const shape = () => window.glassDemo.shapes.find(s=>s.surface==='selection');
    const frame = () => new Promise(requestAnimationFrame);
    const buttons = document.querySelectorAll('.segment button');
    const start = shape();
    const base = window.glassDemo.bases.segment;
    const samples = [];
    buttons[2].click();
    const deadline = performance.now()+850;
    while(performance.now()<deadline){
      await frame();
      samples.push(shape());
    }
    return {start,end:shape(),base,finalBase:window.glassDemo.bases.segment,
      peak:Math.max(...samples.map(s=>s.width)),thin:Math.min(...samples.map(s=>s.height)),
      intermediate:samples.filter(s=>s.x>start.x+15&&s.x<shape().x-15).length};
  });
  assert.ok(flow.intermediate>=2, 'Selector must move through intermediate positions');
  assert.ok(flow.peak > flow.start.width*1.55, 'Selector must stretch between distant cells');
  assert.ok(flow.thin < flow.start.height-3, 'Selector must become thinner while stretched');
  assert.equal(flow.end.width,flow.start.width);
  assert.equal(flow.end.height,flow.start.height);
  assert.ok(flow.end.x>flow.start.x+250);
  assert.deepEqual(flow.base,flow.finalBase);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Day',exact:true}).evaluate(b=>b.click());
  await page.waitForFunction(x=>Math.abs(window.glassDemo.shapes.find(s=>s.surface==='selection').x-x)<.5,flow.start.x);
  await page.emulateMedia({reducedMotion:'no-preference'});
  record('Segment lens stretches, thins and settles while its track stays fixed');
  const firstPeriod = page.getByRole('button',{name:'Day',exact:true});
  const lastPeriod = page.getByRole('button',{name:'Month',exact:true});
  const startButton = await firstPeriod.boundingBox();
  const endButton = await lastPeriod.boundingBox();
  await page.mouse.move(startButton.x+startButton.width/2,startButton.y+startButton.height/2);
  await page.mouse.down();
  await page.waitForFunction(()=>window.glassDemo.shapes.find(s=>s.surface==='selection').press===1);
  const heldPeriod=await page.evaluate(()=>window.glassDemo.shapes.find(s=>s.surface==='selection'));
  assert.ok(heldPeriod.width>=flow.start.width+53.5 && heldPeriod.height>=flow.start.height+18.5, JSON.stringify({heldPeriod,start:flow.start}));
  await page.mouse.move(endButton.x+endButton.width/2-24,endButton.y+endButton.height/2,{steps:5});
  await page.waitForFunction(x=>window.glassDemo.shapes.find(s=>s.surface==='selection').x>x+220,flow.start.x);
  assert.equal(await firstPeriod.getAttribute('aria-pressed'),'true','The previous choice stays selected while dragging');
  await page.mouse.up();
  assert.equal(await lastPeriod.getAttribute('aria-pressed'),'true','Release should select the closest choice once');
  await page.waitForFunction(x=>{
    const s=window.glassDemo.shapes.find(s=>s.surface==='selection');
    return s.press===0 && s.motion===0 && s.stretchX===0 && Math.abs(s.x-x)<.5;
  },flow.end.x);
  assert.deepEqual(await page.evaluate(()=>window.glassDemo.bases.segment),flow.base);
  record('Segment glass follows a held drag and snaps to the nearest choice on release');

  await ready(page);
  const range = page.getByRole('slider', { name: 'Glass level' });
  await range.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await range.inputValue(), '36');
  await page.waitForFunction(() => {
    const t = window.glassDemo.slider?.track;
    return t && Math.abs((t.fillX - t.x - 30) / (t.width - 60) - .36) < .001;
  });
  const sliderState = () => page.evaluate(() => window.glassDemo.slider);
  await page.waitForFunction(() => window.glassDemo.slider?.knob.motion === 0 && window.glassDemo.slider.knob.stretchX === 0);
  const rest = await sliderState();
  const origin = await page.locator('#scene').boundingBox();
  await page.mouse.move(origin.x + rest.knob.x, origin.y + rest.knob.y);
  assert.equal(await range.evaluate(input=>getComputedStyle(input).cursor),'grab');
  await page.mouse.down();
  assert.equal(await range.evaluate(input=>getComputedStyle(input).cursor),'grabbing');
  await page.waitForFunction(() => window.glassDemo.slider?.knob.press === 1);
  assert.equal((await sliderState()).knob.motion, 0, 'Holding the same value must not add color');
  const held = await sliderState();
  assert.equal(held.knob.width, 120);
  assert.equal(held.knob.height, 58);
  assert.deepEqual(held.track, rest.track, 'Track moved or changed fill while holding the same value');
  assert.equal(held.knob.x, rest.knob.x);
  assert.equal(held.knob.y, rest.knob.y);
  await page.mouse.up();
  await page.waitForFunction(() => window.glassDemo.slider?.knob.press === 0);
  assert.deepEqual(await sliderState(), rest, 'Release must return the knob to its resting shape');
  await page.mouse.move(origin.x + rest.knob.x, origin.y + rest.knob.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + rest.knob.x + 78, origin.y + rest.knob.y + 9, { steps: 4 });
  assert.ok(Number(await range.inputValue()) > 36, 'Dragging the knob must change the value');
  await page.waitForFunction(x => window.glassDemo.slider.track.fillX > x, rest.track.fillX);
  const { fillX, ...movedTrack } = (await sliderState()).track;
  assert.deepEqual({ ...movedTrack, fillX: rest.track.fillX }, rest.track);
  await page.mouse.up();
  await page.waitForFunction(() => window.glassDemo.slider?.knob.press === 0);
  record('Slider presses, drags and releases independently of its fixed track');

  const rail = await page.evaluate(async () => {
    const { GlassScene } = await import('/assets/liquid-glass-renderer.js');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:240px;height:96px';
    document.body.append(canvas);
    const source = document.createElement('canvas');
    source.width = 240; source.height = 96;
    const ctx = source.getContext('2d');
    ctx.fillStyle = '#527878';
    ctx.fillRect(0, 0, 240, 96);
    const renderer = new GlassScene(canvas);
    renderer.setSource(source);
    renderer.setSliderTrack({ x: 12, y: 48, width: 216, height: 9, fillX: 120 });
    const gl = renderer.gl;
    const read = (press, refraction) => {
      const width = 60 + press * 44, height = 39 + press * 12;
      renderer.setShapes([{ x: 120, y: 48, width, height, radius: height / 2, press, slider: true }]);
      renderer.setMaterial({ refraction });
      renderer.render();
      const pixels = new Uint8Array(240 * 96 * 4);
      gl.readPixels(0, 0, 240, 96, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    };
    const resting = read(0, 18), straight = read(1, 0), refracted = read(1, 18);
    const centerOffRail = ((96 - 58 - 1) * 240 + 120) * 4;
    let bent = 0, movedOutside = 0;
    for (let i = 0; i < refracted.length; i += 4) {
      if (Math.abs(refracted[i] - straight[i]) > 8) bent++;
      const x = (i / 4) % 240;
      if ((x < 66 || x > 174) && refracted[i] !== resting[i]) movedOutside++;
    }
    const results = {
      bent, movedOutside, error: gl.getError(),
      transparency: resting[centerOffRail] - refracted[centerOffRail]
    };
    renderer.setMaterial({ clearControls: true });
    const clearStraight = read(1, 0), clearBent = read(1, 18);
    results.clearBent = clearBent.filter((channel, i) => i % 4 === 0 && Math.abs(channel - clearStraight[i]) > 8).length;
    renderer.setSliderTrack(null);
    ctx.fillStyle = '#d1e2de';
    ctx.fillRect(0, 0, 240, 96);
    ctx.fillStyle = '#355367';
    ctx.fillRect(118, 0, 4, 96);
    renderer.setSource(source);
    const sample = (x) => {
      const pixel = new Uint8Array(4);
      gl.readPixels(x, 47, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return pixel[0];
    };
    results.clearContrast = [];
    results.heldContrast = [];
    for (const surface of [{slider:true}, {surface:'switch'}, {surface:'selection'}, {}]) {
      renderer.setShapes([{x:120,y:48,width:80,height:52,radius:26,...surface}]);
      renderer.render();
      results.clearContrast.push(sample(110) - sample(120));
      renderer.setShapes([{x:120,y:48,width:80,height:52,radius:26,press:1,...surface}]);
      renderer.render();
      results.heldContrast.push(sample(110)-sample(120));
    }
    ctx.fillStyle = '#646464';
    ctx.fillRect(0,0,240,96);
    renderer.setSource(source);
    const optical = (press, motion, x) => {
      renderer.setShapes([{x:120,y:48,width:80,height:52,radius:26,press,motion}]);
      renderer.render();
      const p = new Uint8Array(4);
      gl.readPixels(x,47,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);
      return [...p.slice(0,3)];
    };
    results.idleLight = optical(0,0,120)[0];
    results.heldLight = optical(1,0,120)[0];
    results.neutralRim = optical(1,0,82);
    results.movingRim = optical(1,1,82);
    ctx.fillStyle = '#ededed';
    ctx.fillRect(0,0,240,96);
    renderer.setSource(source);
    renderer.setControlBases({segment:{x:120,y:48,width:216,height:58}});
    renderer.setShapes([{x:120,y:48,width:188,height:71,radius:35.5,press:1,surface:'selection'}]);
    renderer.render();
    const readRed = (x,y) => {
      const pixel=new Uint8Array(4);
      gl.readPixels(x,95-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      return pixel[0];
    };
    results.selectionProfile={body:readRed(120,48),shoulder:readRed(120,17),rim:readRed(120,13)};
    renderer.setControlBases();
    ctx.fillStyle = '#31566d';
    ctx.fillRect(0,0,240,96);
    ctx.fillStyle = '#e85a3f';
    ctx.fillRect(129,0,6,96);
    renderer.setSource(source);
    renderer.setShapes([{x:120,y:48,width:64,height:64,radius:32,surface:'lens'}]);
    renderer.setMaterial({refraction:0});
    renderer.render();
    const unmagnified=sample(136);
    renderer.setMaterial({refraction:18});
    renderer.render();
    results.domeMagnification=sample(136)-unmagnified;
    renderer.destroy(); canvas.remove();
    return results;
  });
  assert.equal(rail.error, 0);
  assert.ok(rail.heldLight > rail.idleLight + 22, 'Holding clear standalone glass must visibly brighten the lens');
  assert.ok(Math.max(...rail.neutralRim)-Math.min(...rail.neutralRim)<=2, 'A stationary hold must not add chromatic tint');
  assert.ok(Math.max(...rail.movingRim)-Math.min(...rail.movingRim)>10, 'Travel must add a visible colored rim');
  assert.ok(rail.domeMagnification > 50, 'The water dome must magnify inside its body, away from the rim');
  assert.ok(rail.selectionProfile.shoulder < rail.selectionProfile.body+50 && rail.selectionProfile.rim > rail.selectionProfile.shoulder+15, JSON.stringify(rail.selectionProfile));
  assert.ok(rail.clearBent > 25, 'Shared clear glass must still bend the track');
  assert.ok(rail.heldContrast.slice(0,3).every((held,i) => held > 70 && held > rail.clearContrast[i] + 35), 'Knobs and the selection must reveal more background on hold');
  assert.ok(rail.clearContrast[3] > 95 && rail.heldContrast[3] > 65, 'Standalone glass must preserve background detail at rest and while held');
  assert.equal(rail.movedOutside, 0, 'Press changed the track outside the knob');
  assert.ok(rail.bent > 25, `Lens failed to bend the track on a solid backdrop: ${rail.bent}px`);
  assert.ok(rail.transparency > 100, 'Held glass should reveal substantially more of the backdrop');
  record(`Slider glass refracts its track (${rail.bent} pixels) and becomes clearer on hold`);


  await ready(page);
  await page.waitForFunction(() => window.glassDemo.source && window.glassDemo.shapes.length === 4);
  const testScene = () => page.evaluate(() => ({ shapes: window.glassDemo.shapes, bases: window.glassDemo.bases }));
  const toggleProbe = page.getByRole('switch', {name:'Glass setting'});
  const toggleBox = await toggleProbe.boundingBox();
  const oldBase = (await testScene()).bases.toggle;
  const oldKnob = (await testScene()).shapes[0];
  await page.mouse.move(toggleBox.x+70,toggleBox.y+22);
  await page.mouse.down();
  await page.mouse.move(toggleBox.x+35,toggleBox.y+22,{steps:4});
  await page.waitForFunction(x => window.glassDemo.shapes[0].x < x-23,oldKnob.x);
  assert.deepEqual((await testScene()).bases.toggle,oldBase);
  assert.equal(await toggleProbe.getAttribute('aria-checked'),'true');
  await page.mouse.up();
  assert.equal(await toggleProbe.getAttribute('aria-checked'),'false');
  await toggleProbe.focus();
  await page.keyboard.press('Space');
  assert.equal(await toggleProbe.getAttribute('aria-checked'),'true');
  await page.waitForFunction(x => {
    const knob=window.glassDemo.shapes[0];
    return Math.abs(knob.x-x)<.1 && knob.press===0 && knob.motion===0 && knob.stretchX===0;
  },oldKnob.x);
  record('Switch drag previews only the knob and commits once on release');
  const beforeDrag = await testScene();
  assert.deepEqual(beforeDrag.shapes.map(shape => shape.surface ?? (shape.slider ? 'slider' : 'glass')), ['switch', 'slider', 'selection', 'lens']);
  assert.equal(beforeDrag.bases.toggle.width, 102);
  assert.equal(beforeDrag.bases.segment.width, 432);
  const probe = page.locator('.probe');
  const probeBox = await probe.boundingBox();
  await page.mouse.click(probeBox.x+60,probeBox.y+60);
  await page.waitForFunction(()=>window.glassDemo.shapes.at(-1).press>.5);
  await page.waitForFunction(()=>window.glassDemo.shapes.at(-1).press===0);
  await page.mouse.move(probeBox.x + 60, probeBox.y + 60);
  await page.mouse.down();
  await page.waitForFunction(() => window.glassDemo.shapes.at(-1).press===1);
  const enlargedLens=await page.evaluate(()=>window.glassDemo.shapes.at(-1));
  assert.ok(enlargedLens.width >= beforeDrag.shapes[3].width*1.29);
  assert.equal(enlargedLens.width,enlargedLens.height);
  await page.mouse.move(probeBox.x + 25, probeBox.y + 100);
  await page.waitForFunction(() => {
    const circle = window.glassDemo.shapes.at(-1);
    return Math.hypot(circle.stretchX, circle.stretchY) > 8;
  });
  await page.mouse.up();
  await page.waitForFunction(() => {
    const circle = window.glassDemo.shapes.at(-1);
    return circle.press === 0 && circle.stretchX === 0 && circle.stretchY === 0;
  });
  const afterDrag = await testScene();
  assert.deepEqual(afterDrag.bases, beforeDrag.bases);
  assert.deepEqual(afterDrag.shapes.slice(0, 3), beforeDrag.shapes.slice(0, 3));
  assert.ok(Math.abs(afterDrag.shapes[3].x - beforeDrag.shapes[3].x + 35) < 1);
  assert.ok(Math.abs(afterDrag.shapes[3].y - beforeDrag.shapes[3].y - 40) < 1);
  record('The round lens visibly stretches and settles without moving the controls');

  const fusion = await page.evaluate(async () => {
    const { GlassScene } = await import('/assets/liquid-glass-renderer.js');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:240px;height:112px';
    document.body.append(canvas);
    const source = document.createElement('canvas');
    source.width = 240; source.height = 112;
    const ctx = source.getContext('2d');
    ctx.fillStyle = '#527878';
    ctx.fillRect(0, 0, 240, 112);
    const scene = new GlassScene(canvas);
    scene.setSource(source);
    scene.setMaterial({ brightness: .10, shadow: 0 });
    const gl = scene.gl;
    const pixel = (x, y) => {
      const out = new Uint8Array(4);
      gl.readPixels(x, 111-y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return [...out].slice(0, 3);
    };
    const circle = { x: 66, y: 56, width: 48, height: 48, radius: 24 };
    const knob = { x: 124, y: 56, width: 60, height: 39, radius: 19.5 };
    const results = {};
    for (const [name, surface] of [['slider', {slider:true}], ['switch', {surface:'switch'}], ['selection', {surface:'selection'}], ['glass', {}]]) {
      scene.setShapes([circle, {...knob,...surface}]);
      scene.setMaterial({ merge: 0 }); scene.render();
      const noBridge = pixel(92, 56);
      scene.setMaterial({ merge: 18 }); scene.render();
      results[name] = pixel(92, 56)[0] - noBridge[0];
    }
    const crossingCircle = { ...circle, x: 90 };
    scene.setShapes([crossingCircle]);
    scene.setControlBases({ toggle: { x: 153, y: 56, width: 102, height: 45, on: true } });
    scene.setMaterial({ merge: 0 }); scene.render();
    const baseOff = pixel(108, 56);
    const outsideWithBase = pixel(116, 56);
    scene.setMaterial({ merge: 18 }); scene.render();
    const baseOn = pixel(108, 56);
    const outsideWithMerge = pixel(116, 56);
    scene.setControlBases(); scene.render();
    const noBase = pixel(108, 56);
    // Two resting shapes, a fixed red track and identical geometry in both optical frames.
    scene.setShapes([circle, {...knob,surface:'switch'}]);
    scene.setControlBases({toggle:{x:140,y:41,width:105,height:38,on:true}});
    scene.setMaterial({clearControls:true,merge:24,refraction:0});
    const frame = () => {
      const pixels = new Uint8Array(240*112*4);
      scene.render();
      gl.readPixels(0,0,240,112,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      return pixels;
    };
    const neutral=frame();
    scene.setMaterial({refraction:18});
    const optical=frame();
    let neckChanges=0;
    for(let y=46;y<=61;y++) for(let x=90;x<=94;x++){
      const i=((111-y)*240+x)*4;
      if(Math.abs(neutral[i]-optical[i])+Math.abs(neutral[i+1]-optical[i+1])+Math.abs(neutral[i+2]-optical[i+2])>18)neckChanges++;
    }
    const error = gl.getError();
    scene.destroy(); canvas.remove();
    return { results, baseOn, baseOff, outsideWithBase, outsideWithMerge, noBase, neckChanges, error };
  });
  assert.equal(fusion.error, 0);
  for (const [part, difference] of Object.entries(fusion.results)) assert.ok(difference > 10, part + ' failed to form a visible bridge (' + difference + ')');
  assert.deepEqual(fusion.baseOn, fusion.baseOff);
  assert.deepEqual(fusion.outsideWithMerge, fusion.outsideWithBase);
  assert.ok(fusion.baseOn[0] > fusion.noBase[0] + 35, 'The non-merging switch base should still tint the glass');
  record('Only glass surfaces form a bridge; a fixed control base still colors the glass');
  assert.ok(fusion.neckChanges > 5, 'A joined outline must bend the sampled base at the neck (' + fusion.neckChanges + ' changed pixels)');
  record('Joined glass optically bends the fixed base at its neck');


  // Controlled checkerboard fixture proves refraction changes pixels, not just labels.
  const renderResult = await page.evaluate(async () => {
    const { GlassScene } = await import('/assets/liquid-glass-renderer.js');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:256px;height:256px';
    document.body.append(canvas);
    const source = document.createElement('canvas'); source.width=source.height=256;
    const ctx = source.getContext('2d');
    for(let y=0;y<16;y++) for(let x=0;x<16;x++){ctx.fillStyle=(x+y)%2?'#fff':'#101010';ctx.fillRect(x*16,y*16,16,16);}
    const renderer = new GlassScene(canvas);
    renderer.setSource(source); renderer.setShapes([{x:128,y:128,width:180,height:180,radius:50}]);
    renderer.setMaterial({refraction:0,blur:0,frost:0,dispersion:0,merge:0}); renderer.render();
    const gl = renderer.gl;
    const a = new Uint8Array(256*256*4), b = new Uint8Array(a.length);
    gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,a);
    renderer.setMaterial({refraction:35}); renderer.render();
    gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,b);
    let changed=0;for(let i=0;i<a.length;i+=4) if(Math.abs(a[i]-b[i])>12)changed++;
    const error=gl.getError();renderer.destroy();canvas.remove();
    return {changed,error};
  });
  assert.equal(renderResult.error, 0);
  assert.ok(renderResult.changed>500, `Expected refracted pixels, found ${renderResult.changed}`);
  record(`Real refraction pixel change (${renderResult.changed} checkerboard pixels)`);
  // JS lighting cleanup must release inline values on unmount.
  const cleanupResult = await page.evaluate(async () => {
    const { mountGlass } = await import('/assets/liquid-glass.js');
    const host=document.createElement('div');const button=document.createElement('button');
    button.className='glass';button.textContent='fixture';host.append(button);document.body.append(host);
    const cleanup=mountGlass(host);button.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:10,clientY:10}));
    await new Promise(requestAnimationFrame);cleanup();
    const clean=!button.style.getPropertyValue('--glass-x');host.remove();return clean;
  });
  assert.ok(cleanupResult); record('Pointer light unmount cleanup');
  const mounted = await page.evaluate(async () => {
    const {mountLiquidGlass}=await import('/assets/mount-liquid-glass.js');
    const host=document.createElement('div');
    host.style.cssText='position:fixed;inset:0 auto auto 0;width:220px;height:120px';
    const canvas=document.createElement('canvas');
    canvas.style.cssText='width:100%;height:100%';
    canvas.setAttribute('aria-hidden','true');
    const button=document.createElement('button');
    button.textContent='Save';
    let activations=0;
    button.addEventListener('click',()=>activations++);
    host.append(canvas,button);
    document.body.append(host);
    const source=document.createElement('canvas');
    source.width=220;source.height=120;
    const painter=source.getContext('2d');
    painter.fillStyle='#688b8a';painter.fillRect(0,0,220,120);
    let x=75;
    const renderedCenters=[];
    const states=[];
    const binding=mountLiquidGlass({
      canvas,source,
      getFrame:()=>{
        renderedCenters.push(x);
        return {shapes:[{x,y:60,width:80,height:40,radius:20}]};
      },
      onAvailabilityChange:active=>states.push(active)
    });
    const frame=()=>new Promise(requestAnimationFrame);
    await frame();await frame();
    x=120;binding.invalidate();
    await frame();await frame();
    canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
    button.click();
    const hiddenInFallback=canvas.hidden && !binding.available;
    binding.destroy();binding.destroy();
    const restored=!canvas.hidden;
    host.remove();
    return {renderedCenters,states,hiddenInFallback,restored,activations};
  });
  assert.ok(mounted.renderedCenters.includes(75)&&mounted.renderedCenters.includes(120));
  assert.deepEqual(mounted.states,[true,false]);
  assert.ok(mounted.hiddenInFallback && mounted.restored);
  assert.equal(mounted.activations,1);
  record('Reusable WebGL mount redraws a host control and falls back after context loss');

  await context.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const phone = await mobile.newPage();phone.on('pageerror', e => errors.push(e.message));
  await ready(phone);
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
  await phone.screenshot({ path: resolve(evidence, 'demo-mobile.png'), fullPage: true });
  assert.equal(await phone.locator('#scene').evaluate(canvas=>canvas.width/canvas.clientWidth),2);
  record('390px mobile layout and reduced motion');
  await phone.setViewportSize({ width: 320, height: 740 });
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '320px horizontal overflow');
  record('320px narrow viewport has no horizontal overflow');
  await phone.emulateMedia({ forcedColors: 'active' });
  await phone.waitForFunction(() => getComputedStyle(document.getElementById('scene')).display === 'none');
  assert.notEqual(await phone.locator('.glass').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
  record('Forced colors hide the refractive canvas');
  await mobile.close();
  const fallback = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await fallback.addInitScript(() => {
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:getContext.call(this,type,...args);};
  });
  const fallbackPage=await fallback.newPage();await ready(fallbackPage);
  assert.equal(await fallbackPage.evaluate(() => window.glassDemo.available), false);
  assert.equal(await fallbackPage.locator('#scene').isHidden(), true);
  await fallbackPage.locator('.slider .track').waitFor();
  const fallbackRange = fallbackPage.getByRole('slider', { name: 'Glass level' });
  await fallbackRange.focus();
  await fallbackPage.keyboard.press('End');
  assert.equal(await fallbackRange.inputValue(), '100');
  await fallbackPage.waitForFunction(() => document.querySelector('.slider').style.getPropertyValue('--thumb-x') === '386px');
  record('WebGL unavailable: controls remain usable');
  await fallback.close();
  const skill=await readFile(resolve(root,'SKILL.md'),'utf8');
  assert.match(skill,/^---\r?\nname: liquid-glass-ui\r?\n/);
  for (const file of ['assets/liquid-glass.css','assets/liquid-glass.js','assets/liquid-glass-renderer.js','README.md','LICENSE','THIRD_PARTY_NOTICES.md']) await readFile(resolve(root,file));
  record('Skill metadata and release files');
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('; ')}`);
  const report = { status: 'passed', browser: await browser.version(), checks, refractionPixelsChanged: renderResult.changed, errors, date: new Date().toISOString() };
  await writeFile(resolve(evidence,'verification.json'), JSON.stringify(report,null,2));
  console.log(`Verified ${checks.length} checks; screenshots and report in evidence/.`);
} finally { await browser?.close(); server?.kill(); }
