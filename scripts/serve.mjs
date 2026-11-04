import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { buttonChoice } from '../demo/button-choice.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/plain; charset=utf-8' };
const picking = process.argv[2] === '--pick';
const token = picking ? randomBytes(24).toString('hex') : null;
const context = picking ? {
  text:process.argv[3] || '按钮',
  width:Number(process.argv[4] ?? 88),
  height:Number(process.argv[5] ?? 44),
  background:process.argv[6] ?? '#1a1a2e'
} : null;
if (context && (![context.width,context.height].every(n=>Number.isFinite(n)&&n>=24&&n<=400)
    || !/^#[a-f\d]{6}$/i.test(context.background) || context.text.length>100)) {
  throw new Error('Picker requires a short label, dimensions from 24 to 400, and a six-digit hex backdrop.');
}
let submitted = false;
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (picking && pathname === '/selection') {
      if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(403).end(); return; }
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Type','application/json; charset=utf-8');
      if (req.method === 'GET') { res.end(JSON.stringify(context)); return; }
      if (req.method !== 'POST') { res.writeHead(405).end(); return; }
      if (submitted) { res.writeHead(409).end(); return; }
      const length = Number(req.headers['content-length']);
      if (!Number.isInteger(length) || length<1 || length>1024) { res.writeHead(413).end(); return; }
      let body = '';
      for await (const chunk of req) body += chunk;
      let choice;
      try { choice = buttonChoice(JSON.parse(body),context); }
      catch { res.writeHead(400).end(); return; }
      if (submitted) { res.writeHead(409).end(); return; }
      submitted = true;
      res.end(JSON.stringify({submitted:true}));
      console.log('GLASS_SELECTION '+JSON.stringify(choice));
      server.close();
      return;
    }
    if (pathname === '/') { res.writeHead(302, { Location: '/demo/' }).end(); return; }
    if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
const port = picking ? 0 : Number(process.env.GLASS_PORT ?? 4173);
server.listen(port, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}`;
  console.log(picking ? `GLASS_PICKER ${address}/demo/picker.html#${token}` : `Liquid Glass UI: ${address}`);
});
