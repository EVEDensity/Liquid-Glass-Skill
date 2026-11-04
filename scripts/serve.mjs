import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/plain; charset=utf-8' };
const port = Number(process.env.GLASS_PORT ?? 58423);
let latestHandoff;
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/glass-handoff') {
      const host = req.headers.host;
      const boundPort = server.address().port;
      if (host !== `localhost:${boundPort}` && host !== `127.0.0.1:${boundPort}`) {
        res.writeHead(403).end(); return;
      }
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Type','application/json; charset=utf-8');
      if (req.method === 'GET') { res.end(JSON.stringify(latestHandoff ?? null)); return; }
      if (req.method !== 'POST') { res.writeHead(405).end(); return; }
      if (req.headers.origin !== `http://${host}` || req.headers['content-type'] !== 'application/json') {
        res.writeHead(403).end(); return;
      }
      const length = Number(req.headers['content-length']);
      if (!Number.isInteger(length) || length<1 || length>4096) { res.writeHead(413).end(); return; }
      let body = '';
      for await (const chunk of req) body += chunk;
      let config;
      try { config = JSON.parse(body); }
      catch { res.writeHead(400).end(); return; }
      if (config?.version !== 2 || !config.button || !config.material) { res.writeHead(400).end(); return; }
      latestHandoff = {copiedAt:Date.now(),config};
      res.writeHead(204).end();
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
server.listen(port, '127.0.0.1', () => console.log(`Liquid Glass UI: http://localhost:${server.address().port}`));
