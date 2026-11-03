import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, 'evidence');
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('https://goodmachines.ai/lab/liquid-glass', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#gl').waitFor();
  await page.screenshot({ path: resolve(evidence, 'reference.png') });
  const result = await page.evaluate(() => ({ title: document.title, canvas: { width: document.querySelector('#gl').width, height: document.querySelector('#gl').height }, presets: document.querySelector('#presets').innerText, body: document.body.innerText.slice(-900) }));
  await writeFile(resolve(evidence, 'reference-inspection.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
