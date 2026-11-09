/**
 * API tests for server/server.mjs
 * Spawns the real server on a temp data dir and talks to it over HTTP.
 * Run: node server/test-api.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'makuru-test-'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };

function start(env = {}) {
  const child = spawn(process.execPath, [path.join(HERE, 'server.mjs')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: tmp, PUBLIC_DIR: path.join(HERE, 'public'), MAKURU_PIN: '2468', ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server did not start')), 8000);
    child.stdout.on('data', (d) => { if (String(d).includes('running on')) { clearTimeout(t); resolve(); } });
    child.stderr.on('data', (d) => process.stderr.write('[server] ' + d));
  });
  return { child, ready };
}
const stop = (child) => new Promise((r) => { child.once('exit', r); child.kill('SIGTERM'); });

const api = async (p, opts = {}) => {
  const res = await fetch(BASE + p, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text, headers: res.headers };
};

const sample = {
  products: [{ id: 'p1', name: 'Siomay Ayam', pack_size: '6 pcs', price: 12, kitchen: 20, shops: {} }],
  materials: [], shops: [], orders: [], sales: [], seq: { order: 1 }
};

console.log('temp data dir:', tmp);
let srv = start();
await srv.ready;

// --- health & static ---
let r = await api('/api/health');
ok(r.status === 200 && r.json.mode === 'cloud' && r.json.version === 0, 'health reports cloud mode, version 0');

r = await api('/');
ok(r.status === 200 && /<title>makuru\.<\/title>/.test(r.text), 'serves the app at /');
ok(/default-src 'self'/.test(r.headers.get('content-security-policy') || ''), 'sends a content security policy');
ok(r.headers.get('x-content-type-options') === 'nosniff', 'sends nosniff');

r = await api('/some/route');
ok(r.status === 200 && /<title>makuru\.<\/title>/.test(r.text), 'unknown path falls back to the app shell');

// --- auth ---
r = await api('/api/state');
ok(r.status === 401, 'state needs a token');

r = await api('/api/login', { method: 'POST', body: { pin: '0000' } });
ok(r.status === 401 && /wrong pin/i.test(r.json.error), 'wrong PIN rejected');

r = await api('/api/login', { method: 'POST', body: { pin: '2468' } });
ok(r.status === 200 && typeof r.json.token === 'string' && r.json.token.split('.').length === 3, 'correct PIN returns a signed token');
const token = r.json.token;

r = await api('/api/state', { token: 'v1.9999999999999.badsignature' });
ok(r.status === 401, 'forged token rejected');

// --- read / write ---
r = await api('/api/state', { token });
ok(r.status === 200 && r.json.version === 0 && Array.isArray(r.json.data.products), 'fresh state is empty');

r = await api('/api/state', { method: 'PUT', token, body: { data: sample, baseVersion: 0 } });
ok(r.status === 200 && r.json.version === 1, 'first save moves to version 1');

r = await api('/api/state', { token });
ok(r.json.version === 1 && r.json.data.products[0].name === 'Siomay Ayam', 'saved data comes back');

// --- conflicts ---
r = await api('/api/state', { method: 'PUT', token, body: { data: { ...sample, shops: [] }, baseVersion: 0 } });
ok(r.status === 409 && r.json.version === 1 && r.json.data.products.length === 1, 'stale baseVersion -> 409 with current data');

r = await api('/api/state', { method: 'PUT', token, body: { data: sample, baseVersion: 1 } });
ok(r.status === 200 && r.json.version === 2, 'retry with fresh baseVersion succeeds');

r = await api('/api/state', { method: 'PUT', token, body: { baseVersion: 2 } });
ok(r.status === 400, 'PUT without data is rejected');

// --- validation ---
r = await api('/api/state', { method: 'PUT', token, body: { data: { products: 'nope' }, baseVersion: 2 } });
ok(r.status === 200, 'junk collections are accepted but normalised');
r = await api('/api/state', { token });
ok(Array.isArray(r.json.data.products) && r.json.data.products.length === 0, 'junk collections normalised to empty arrays');

// --- persistence across restart ---
await stop(srv.child);
ok(fs.existsSync(path.join(tmp, 'state.json')), 'state.json written to the data dir');
srv = start();
await srv.ready;
r = await api('/api/state', { token });
ok(r.status === 200 && r.json.version === 3, 'data and version survive a restart');
ok(r.json.data && Array.isArray(r.json.data.products), 'same token still works after restart');

// --- rate limit ---
let blocked = false;
for (let i = 0; i < 12; i++) {
  const t = await api('/api/login', { method: 'POST', body: { pin: '9999' } });
  if (t.status === 429) { blocked = true; break; }
}
ok(blocked, 'brute force is rate limited');

await stop(srv.child);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
