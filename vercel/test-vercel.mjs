/**
 * Tests the Vercel build against a REAL Postgres.
 * - wraps api/[...path].mjs in a tiny http server that mimics Vercel
 * - checks the API contract (same as server/test-api.mjs, but on Postgres)
 * - then drives two browsers to prove two devices share one database
 *
 * Needs a local Postgres. Default:
 *   postgres://makuru:makuru@127.0.0.1:5432/makuru
 * Override with DATABASE_URL=... (Neon, Vercel Postgres, Supabase, anything)
 *
 * Run: node vercel/test-vercel.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgres://makuru:makuru@127.0.0.1:5432/makuru';
const PORT = 8131;
const BASE = `http://127.0.0.1:${PORT}`;
const PIN = '5555';

process.env.POSTGRES_URL = DB_URL;
process.env.DATABASE_URL = DB_URL;
process.env.MAKURU_PIN = PIN;
delete process.env.MAKURU_SECRET;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const wait = (ms = 400) => new Promise(r => setTimeout(r, ms));

/* ---------- clean database ---------- */
const db = new pg.Client({ connectionString: DB_URL });
await db.connect();
await db.query('DROP TABLE IF EXISTS makuru_state');
await db.end();

/* ---------- the Vercel-style host ---------- */
const { default: handler } = await import(path.join(HERE, 'api/[...path].mjs'));

function vReq(req, res, extraQuery = {}) {
  // what Vercel gives the function
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    let body;
    if (raw) { try { body = JSON.parse(raw); } catch { body = raw; } }
    req.body = body;
    req.query = { ...extraQuery };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      const s = JSON.stringify(obj);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(s);
    };
    try { await handler(req, res); }
    catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, BASE);
  if (url.pathname.startsWith('/api/')) {
    const tail = url.pathname.replace(/^\/api\/?/, '');
    return vReq(req, res, { path: tail ? tail.split('/') : [] });
  }
  // static: serve index.html like Vercel does after the rewrite
  const file = path.join(HERE, 'index.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
console.log('vercel-style host on', BASE, '| db:', DB_URL.replace(/:\/\/[^@]*@/, '://***@'));

const api = async (p, opts = {}) => {
  const res = await fetch(BASE + p, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text };
};

/* ---------- API contract on Postgres ---------- */
let r = await api('/api/health');
ok(r.status === 200 && r.json.mode === 'cloud' && r.json.version === 0, 'table is created on first request (version 0)');

r = await api('/api/state');
ok(r.status === 401, 'state needs a token');

r = await api('/api/login', { method: 'POST', body: { pin: '0000' } });
ok(r.status === 401, 'wrong PIN rejected');

r = await api('/api/login', { method: 'POST', body: { pin: PIN } });
ok(r.status === 200 && /^v1\./.test(r.json.token), 'PIN login returns a token');
const token = r.json.token;

const sample = {
  products: [{ id: 'p1', name: 'Siomay Ayam', pack_size: '6 pcs', price: 12, kitchen: 20, shops: {} }],
  materials: [], shops: [], orders: [], sales: [], seq: { order: 1 }
};
r = await api('/api/state', { method: 'PUT', token, body: { data: sample, baseVersion: 0 } });
ok(r.status === 200 && r.json.version === 1, 'save writes to Postgres (version 1)');

r = await api('/api/state', { token });
ok(r.json.data.products[0].name === 'Siomay Ayam', 'data reads back from Postgres');

r = await api('/api/state', { method: 'PUT', token, body: { data: sample, baseVersion: 0 } });
ok(r.status === 409 && r.json.version === 1, 'stale baseVersion -> 409 (optimistic locking in SQL)');

// two writers racing: only one wins per version
const [a, b] = await Promise.all([
  api('/api/state', { method: 'PUT', token, body: { data: { ...sample, shops: [{ id: 's1', name: 'A' }] }, baseVersion: 1 } }),
  api('/api/state', { method: 'PUT', token, body: { data: { ...sample, shops: [{ id: 's2', name: 'B' }] }, baseVersion: 1 } })
]);
const codes = [a.status, b.status].sort().join(',');
ok(codes === '200,409', 'racing writes: one succeeds, one gets 409 (' + codes + ')');

r = await api('/api/state', { method: 'PUT', token, body: { data: { products: 'nope' }, baseVersion: 2 } });
r = await api('/api/state', { token });
ok(Array.isArray(r.json.data.products) && r.json.data.products.length === 0, 'junk input normalised before it reaches Postgres');

// fresh process would use a new pool: simulate by re-importing with cache busting
const before = r.json.version;
const fresh = await import(path.join(HERE, 'lib/storage-pg.mjs') + '?v=' + Date.now());
const store = fresh.createPgStorage();
const readBack = await store.read();
ok(readBack.version === before, 'a cold start sees the same data (version ' + readBack.version + ')');

/* ---------- two devices, one database ---------- */
const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errs = [];
const device = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource.*status of (401|409)/.test(m.text())) return;
    errs.push(name + ' log: ' + m.text());
  });
  return p;
};
const signIn = async (p) => { await p.fill('input[name=pin]', PIN); await p.click('[data-act="login"]'); await wait(1100); };
const enter = async (p) => { await p.click('[data-act="enter"]'); await wait(900); };
const go = async (p, r) => { await p.evaluate(x => { location.hash = '#/' + x; }, r); await wait(700); };
const addProduct = async (p, name) => {
  await go(p, 'stock');
  await p.click('[data-act="product-modal"]'); await wait(350);
  await p.fill('#f-product [name=name]', name);
  await p.fill('#f-product [name=price]', '12');
  await p.fill('#f-product [name=kitchen]', '10');
  await p.click('[data-act="product-save"]'); await wait(900);
};

const A = await device('A');
await A.goto(BASE, { waitUntil: 'load' }); await wait(1200);
ok(!!(await A.$('#f-login')), 'browser: PIN screen shows on Vercel build');
await signIn(A); await enter(A);
await addProduct(A, 'Hakau Udang');

const B = await device('B');
await B.goto(BASE, { waitUntil: 'load' }); await wait(1200);
await signIn(B); await enter(B);
await go(B, 'stock');
ok((await B.textContent('body')).includes('Hakau Udang'), 'second device sees the product from the shared database');
await B.screenshot({ path: 'shots-cloud/v01-device-b.png' });

await addProduct(B, 'Bakpao Char Siu');
await A.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await wait(900); await go(A, 'stock');
const bodyA = await A.textContent('body');
ok(bodyA.includes('Bakpao Char Siu') && bodyA.includes('Hakau Udang'), 'first device picks up the second device change');

const disk = await (async () => {
  const c = new pg.Client({ connectionString: DB_URL }); await c.connect();
  const q = await c.query('SELECT version, jsonb_array_length(data->\'products\') AS n FROM makuru_state WHERE id = 1');
  await c.end(); return q.rows[0];
})();
ok(Number(disk.n) === 2 && Number(disk.version) >= 3, 'Postgres holds both products (v' + disk.version + ', ' + disk.n + ' products)');

ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));

/* ---------- misconfiguration is loud, not silent ---------- */
delete process.env.MAKURU_PIN;
const fresh2 = await import(path.join(HERE, 'api/[...path].mjs') + '?v=' + Date.now());
const fakeRes = {
  statusCode: 0, headers: {}, setHeader() {}, status(c) { this.statusCode = c; return this; },
  json(o) { this.body = o; }
};
await fresh2.default({ method: 'GET', url: '/api/health', headers: {}, query: { path: ['health'] }, socket: {} }, fakeRes);
ok(fakeRes.statusCode === 500 && /MAKURU_PIN/.test(JSON.stringify(fakeRes.body)), 'missing MAKURU_PIN gives a clear error');

await browser.close();
server.close();
await db.end().catch(() => {});
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
