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
  assert.equal(await page.evaluate(() => window.glassDemo.material.refraction), 32);
  assert.equal(await page.evaluate(() => window.glassDemo.material.merge), 46);
  assert.equal(await page.evaluate(() => window.glassDemo.material.pickup), .58);
  assert.equal(await page.locator('#controls > .glass').count(), 6);
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
  await home.dispatchEvent('pointerdown');
  await page.waitForTimeout(350);
  await page.waitForTimeout(300);
  const pressed = await page.evaluate(() => getComputedStyle(document.querySelector('.dock')).scale);
  assert.ok(Number.parseFloat(pressed) > 1.05, `Expected press scale, got ${pressed}`);
  await home.dispatchEvent('pointerup');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.dock')).scale === '1');
  record('Button press scales the glass and releases');
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
      toggle: toggle.getAttribute('aria-pressed'),
      status: document.querySelector('#status').textContent,
      week: document.querySelectorAll('.segment button')[1].getAttribute('aria-pressed')
    };
  });
  assert.equal(interaction.toggle, 'true');
  assert.equal(interaction.status, 'Week selected.');
  assert.equal(interaction.week, 'true');
  record('Panel, lens, morph, switch, slider, and segment animate');
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
