#!/usr/bin/env node
/**
 * makuru. server — for a VPS, Railway, Fly or your own laptop.
 * Zero dependencies, Node 20+.
 *
 *   MAKURU_PIN=1234 node server.mjs
 *
 * Env:
 *   PORT         default 8080
 *   MAKURU_PIN   the PIN every device types (generated once if not set)
 *   DATA_DIR     where state.json / backups live (default ./data)
 *   PUBLIC_DIR   where index.html lives (default ./public)
 *   TOKEN_DAYS   how long a login lasts (default 30)
 */

import http from 'node:http';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp } from './core.mjs';
import { createFileStorage } from './storage-file.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || path.join(HERE, 'data');
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(HERE, 'public');
const TOKEN_DAYS = Math.max(1, Number(process.env.TOKEN_DAYS || 30));
const MAX_BODY = 4 * 1024 * 1024;

const log = (...a) => console.log(new Date().toISOString(), ...a);

/* --------------------------------------------------------------- secrets */

async function bootSecrets() {
  const secretFile = path.join(DATA_DIR, 'secret');
  const pinFile = path.join(DATA_DIR, 'pin');
  let secret = '';
  try {
    secret = (await fsp.readFile(secretFile, 'utf8')).trim();
  } catch { /* created below */ }
  if (!secret || secret.length < 32) {
    secret = crypto.randomBytes(32).toString('hex');
    await fsp.writeFile(secretFile, secret, { mode: 0o600 });
    log('new signing secret created');
  }

  const fromEnv = (process.env.MAKURU_PIN || '').trim();
  if (fromEnv) {
    log('PIN taken from MAKURU_PIN');
    return { secret, pin: fromEnv };
  }
  let pin = '';
  try {
    pin = (await fsp.readFile(pinFile, 'utf8')).trim();
  } catch { /* created below */ }
  if (!pin) {
    pin = String(crypto.randomInt(100000, 999999));
    await fsp.writeFile(pinFile, pin, { mode: 0o600 });
    log('=================================================');
    log('  No MAKURU_PIN set. Generated PIN: ' + pin);
    log('  Type this PIN on every device. It is also in ' + pinFile);
    log('=================================================');
  }
  return { secret, pin };
}

/* --------------------------------------------------------------- server */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

function commonHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; " +
    "base-uri 'none'; form-action 'none'");
}

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('bad json'), { code: 400 })); }
    });
    req.on('error', reject);
  });
}

function clientIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function bearer(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : '';
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

  try {
    const stat = await fsp.stat(file);
    if (stat.isDirectory()) throw new Error('dir');
    const body = await fsp.readFile(file);
    const ext = path.extname(file).toLowerCase();
    const isHTML = ext === '.html';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': isHTML ? 'no-cache' : 'public, max-age=604800'
    });
    res.end(body);
  } catch {
    // unknown path: show the app shell (hash routing handles the rest)
    try {
      const body = await fsp.readFile(path.join(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('index.html not found in ' + PUBLIC_DIR);
    }
  }
}

const server = http.createServer(async (req, res) => {
  commonHeaders(res);
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    /* ---------------- api ---------------- */
    if (p.startsWith('/api/')) {
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        body = await readBody(req);
      }
      const out = await app.handle({
        method: req.method,
        path: p,
        body,
        ip: clientIP(req),
        headers: req.headers
      });
      return sendJSON(res, out.status, out.body);
    }

    /* ---------------- static ---------------- */
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); return res.end('Method not allowed');
    }
    return await serveStatic(req, res, p);

  } catch (e) {
    const code = e.code === 413 ? 413 : e.code === 400 ? 400 : 500;
    if (code === 500) log('ERROR', e);
    if (!res.headersSent) sendJSON(res, code, { error: e.message });
    else res.end();
  }
});

/* ----------------------------------------------------------------- boot */

await fsp.mkdir(DATA_DIR, { recursive: true });
const { secret, pin } = await bootSecrets();

const storage = createFileStorage({ dir: DATA_DIR, log });
await storage.init();

const app = createApp({ storage, pin, secret, tokenDays: TOKEN_DAYS, log });

server.listen(PORT, '0.0.0.0', () => {
  log(`makuru. running on http://0.0.0.0:${PORT}`);
  log(`data: ${storage.file}`);
  log(`public: ${PUBLIC_DIR}`);
});

function shutdown(sig) {
  log(sig + ' received, closing');
  server.close(() => {
    storage.flush().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 4000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
