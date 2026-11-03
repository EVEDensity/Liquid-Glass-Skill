import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, 'evidence');
await mkdir(evidence, { recursive: true });
const url = process.env.GLASS_TEST_URL || 'http://127.0.0.1:4173';
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
async function ready(page) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.glassDemo?.source);
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
  await ready(page);
  assert.equal(await page.evaluate(() => window.glassDemo.available), true, 'WebGL2 unavailable in verification browser');
  record('WebGL2 source loaded and shader linked');
  const screenshot = resolve(evidence, 'demo-desktop.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  assert.equal(await page.evaluate(() => window.glassDemo.material.refraction), 18);
  assert.equal(await page.evaluate(() => window.glassDemo.material.merge), 10);
  assert.equal(await page.evaluate(() => window.glassDemo.material.pickup), .35);
  assert.equal(await page.locator('#controls > .glass').count(), 7);
  record('Scene layout renders the combined glass pieces');
  await page.locator('#layouts [data-layout="controls"]').click();
  await page.waitForFunction(() => window.glassDemo.layout === 'controls');
  const search = page.locator('.search');
  const before = await search.boundingBox();
  await search.focus();
  await page.keyboard.press('ArrowLeft');
  const after = await search.boundingBox();
  assert.equal(Math.round(before.x-after.x), 8);
  const dragResult = await page.evaluate(() => {
    const piece = document.querySelector('.search');
    const before = piece.getBoundingClientRect().x;
    piece.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 400, clientY: 500 }));
    piece.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 1, clientX: 300, clientY: 500 }));
    piece.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return before - piece.getBoundingClientRect().x;
  });
  assert.ok(dragResult >= 90, `Search glass only moved ${dragResult}px`);
  record('Pointer dragging and keyboard movement');
  const home = page.locator('.dock button').first();
  const homeBox = await home.boundingBox();
  await page.mouse.move(homeBox.x + homeBox.width / 2, homeBox.y + homeBox.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.glassDemo.shapes[1]?.press > .8);
  await page.mouse.up();
  await page.waitForFunction(() => window.glassDemo.shapes[1]?.press === 0);
  record('Button press grows its glass and releases');
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  const searchButton = page.getByRole('button', { name: 'Search', exact: true });
  const iconBounds = await searchButton.boundingBox();
  const px = iconBounds.x + iconBounds.width / 2, py = iconBounds.y + iconBounds.height / 2;
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.mouse.move(px - 34, py, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() => window.glassDemo.shapes[2]?.press === 0);
  const movedIcon = await searchButton.boundingBox();
  assert.ok(Math.abs(movedIcon.x - iconBounds.x + 34) < 1, 'Dragging directly on the icon must move the glass');
  record('The search button can be dragged from its icon');
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none', colorScheme: 'dark' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  record('System preference changes keep the page usable');
  const layoutState = await page.evaluate(() => {
    const names = [];
    for (const name of ['panel', 'lens', 'morph', 'ios']) {
      document.querySelector(`#layouts [data-layout="${name}"]`).click();
      names.push(window.glassDemo.layout);
    }
    return { names, count: document.querySelectorAll('#controls > .glass').length, html: document.querySelector('#controls').innerHTML.slice(0, 300) };
  });
  assert.deepEqual(layoutState.names, ['panel', 'lens', 'morph', 'ios'], JSON.stringify(layoutState));
  assert.equal(layoutState.count, 3, JSON.stringify(layoutState));
  const interaction = await page.evaluate(() => {
    const button = document.querySelector('#layouts [data-layout="ios"]');
    if (!button) throw new Error('missing layout button');
    button.click();
    const toggle = document.querySelector('#controls .switch');
    if (!toggle) throw new Error('missing switch');
    toggle.click();
    const slider = document.querySelector('#controls .slider input');
    if (!slider) throw new Error('layout=' + window.glassDemo.layout + ' children=' + document.querySelector('#controls').childElementCount);
    slider.value = '70';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelectorAll('.segment button')[1].click();
    return {
      toggle: toggle.getAttribute('aria-checked'),
      status: document.querySelector('#status').textContent,
      week: document.querySelectorAll('.segment button')[1].getAttribute('aria-pressed')
    };
  });
  assert.equal(interaction.toggle, 'false');
  assert.equal(interaction.status, 'Week selected.');
  assert.equal(interaction.week, 'true');
  record('Panel, lens, morph, switch, slider, and segment animate');
  // Sample the actual rendered selector, rather than the CSS transition or its target.
  await page.getByRole('button',{name:'iOS controls',exact:true}).click();
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
  assert.ok(heldPeriod.width>=flow.start.width+45.5 && heldPeriod.height>=flow.start.height+15.5, JSON.stringify({heldPeriod,start:flow.start}));
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

  await page.getByRole('button', { name: 'Slider', exact: true }).click();
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
    renderer.destroy(); canvas.remove();
    return results;
  });
  assert.equal(rail.error, 0);
  assert.ok(rail.heldLight > rail.idleLight + 22, 'Holding clear standalone glass must visibly brighten the lens');
  assert.ok(Math.max(...rail.neutralRim)-Math.min(...rail.neutralRim)<=2, 'A stationary hold must not add chromatic tint');
  assert.ok(Math.max(...rail.movingRim)-Math.min(...rail.movingRim)>10, 'Travel must add a visible colored rim');
  assert.ok(rail.clearBent > 25, 'Shared clear glass must still bend the track');
  assert.ok(rail.heldContrast.slice(0,3).every((held,i) => held > 70 && held > rail.clearContrast[i] + 35), 'Knobs and the selection must reveal more background on hold');
  assert.ok(rail.clearContrast[3] > 95 && rail.heldContrast[3] > 65, 'Standalone glass must preserve background detail at rest and while held');
  assert.equal(rail.movedOutside, 0, 'Press changed the track outside the knob');
  assert.ok(rail.bent > 25, `Lens failed to bend the track on a solid backdrop: ${rail.bent}px`);
  assert.ok(rail.transparency > 100, 'Held glass should reveal substantially more of the backdrop');
  record(`Slider glass refracts its track (${rail.bent} pixels) and becomes clearer on hold`);


  await page.getByRole('button', { name: 'Merge test', exact: true }).click();
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
  await page.mouse.move(probeBox.x + 60, probeBox.y + 60);
  await page.mouse.down();
  await page.mouse.move(probeBox.x + 25, probeBox.y + 100);
  await page.waitForFunction(() => {
    const circle = window.glassDemo.shapes.at(-1);
    return Math.hypot(circle.stretchX, circle.stretchY) > 22;
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
  await context.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const phone = await mobile.newPage();phone.on('pageerror', e => errors.push(e.message));
  await ready(phone);
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
  await phone.screenshot({ path: resolve(evidence, 'demo-mobile.png'), fullPage: true });
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
  await fallbackPage.locator('#layouts [data-layout="controls"]').click();
  await fallbackPage.locator('.dock').waitFor();
  assert.equal(await fallbackPage.locator('.dock button').count(), 3);
  await fallbackPage.getByRole('button', { name: 'Slider', exact: true }).click();
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
