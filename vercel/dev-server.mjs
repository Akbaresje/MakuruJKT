#!/usr/bin/env node
/**
 * Local dev server that behaves like Vercel: serves index.html and
 * routes /api/* to the same function file Vercel uses.
 *
 *   DATABASE_URL=postgres://... MAKURU_PIN=1234 node dev-server.mjs
 *   (or put both in .env.local and just run `npm run dev`)
 *
 * Handy to test the Postgres build before deploying.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local / .env (written by `neon deploy` / `neon env pull`) without
// any dependency. Real env vars always win.
for (const name of ['.env.local', '.env']) {
  const file = path.join(HERE, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

const PORT = Number(process.env.PORT || 8090);

if (!process.env.MAKURU_PIN) { console.error('Set MAKURU_PIN first, e.g. MAKURU_PIN=1234'); process.exit(1); }
if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL (Neon) or POSTGRES_URL first, e.g. postgres://user:pass@127.0.0.1:5432/makuru');
  process.exit(1);
}

const { default: handler } = await import(path.join(HERE, 'api/[...path].mjs'));
const html = fs.readFileSync(path.join(HERE, 'index.html'));

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.startsWith('/api/')) {
    const tail = url.pathname.replace(/^\/api\/?/, '');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : undefined;
      req.query = { path: tail ? tail.split('/') : [] };
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (o) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(o));
      };
      try { await handler(req, res); }
      catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.end(html);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`makuru (vercel mode) on http://0.0.0.0:${PORT}`);
});
