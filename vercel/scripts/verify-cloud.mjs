#!/usr/bin/env node
/**
 * End-to-end check of the cloud build against whatever Postgres
 * DATABASE_URL points at — Neon, Vercel Postgres, Supabase, local.
 *
 *   DATABASE_URL='postgres://...' MAKURU_PIN=1234 node scripts/verify-cloud.mjs
 *
 * Boots dev-server.mjs on a spare port, then walks the real HTTP API:
 * health -> wrong PIN (401) -> login -> GET -> PUT -> GET -> stale PUT (409)
 * -> restarts the process and reads the row back (proves it is in Postgres,
 * not in memory). Exits non-zero on the first failure.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import net from 'node:net';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const pin = process.env.MAKURU_PIN || '';

if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
if (!pin) { console.error('MAKURU_PIN is not set'); process.exit(1); }

let pass = 0;
let fail = 0;
const ok = (m, x = '') => { pass++; console.log(`PASS  ${m}${x ? `  ${x}` : ''}`); };
const bad = (m, x = '') => { fail++; console.log(`FAIL  ${m}${x ? `  ${x}` : ''}`); };
const check = (m, cond, x) => (cond ? ok(m, x) : bad(m, x));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, [join(ROOT, 'dev-server.mjs')], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });

  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) return { child, port, base: `http://127.0.0.1:${port}`, log: () => log };
    } catch { /* not listening yet */ }
    await sleep(200);
  }
  child.kill('SIGKILL');
  throw new Error(`server did not become healthy:\n${log}`);
}

const host = new URL(url).hostname;
const masked = url.replace(/:\/\/([^:/@]+):[^@]*@/, '://$1:***@');
console.log(`\nmakuru cloud verification   ${new Date().toISOString()}`);
console.log(`target  ${masked}`);
console.log(`host    ${host}\n`);

let srv;
try {
  srv = await startServer();
  const api = (p) => `${srv.base}/api/${p}`;

  /* 1. health */
  const health = await (await fetch(api('health'))).json();
  check('health responds', health.ok === true, JSON.stringify(health));
  check('mode is cloud', health.mode === 'cloud');

  /* 2. which driver the storage layer picked for this host */
  const { createPgStorage } = await import(join(ROOT, 'lib', 'storage-pg.mjs'));
  const kind = await createPgStorage({ url }).driverKind();
  ok('storage driver', `${kind} on ${host}`);

  /* 3. auth */
  const wrong = await fetch(api('login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pin: 'definitely-not-it' })
  });
  check('wrong PIN rejected', wrong.status === 401, `HTTP ${wrong.status}`);

  const login = await fetch(api('login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  const session = await login.json();
  check('PIN login returns a token', login.status === 200 && Boolean(session.token),
    `expires in ${session.expiresInDays} days`);
  const auth = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };

  /* 4. read */
  const before = await (await fetch(api('state'), { headers: auth })).json();
  check('state readable', typeof before.version === 'number', `version ${before.version}`);

  /* 5. write + read back */
  const marker = `verify-${Date.now()}`;
  const doc = structuredClone(before.data || {});
  doc.products = doc.products || [];
  doc.products.push({ id: marker, name: 'Siomay Ayam', category: 'steamed', price: 12.5, active: true });

  const put = await fetch(api('state'), {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ baseVersion: before.version, data: doc })
  });
  const saved = await put.json();
  check('write accepted', put.status === 200 && saved.version === before.version + 1,
    `v${before.version} -> v${saved.version}`);

  const after = await (await fetch(api('state'), { headers: auth })).json();
  check('product round-trips', (after.data.products || []).some((p) => p.id === marker));

  /* 6. optimistic locking */
  const stale = await fetch(api('state'), {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ baseVersion: before.version, data: doc })
  });
  check('stale write rejected', stale.status === 409, `HTTP ${stale.status}`);

  /* 7. fresh process, same data */
  srv.child.kill('SIGTERM');
  await new Promise((r) => srv.child.once('exit', r));
  srv = await startServer();

  const login2 = await (await fetch(`${srv.base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pin })
  })).json();

  const reloaded = await (await fetch(`${srv.base}/api/state`, {
    headers: { authorization: `Bearer ${login2.token}` }
  })).json();
  check('data survives a process restart',
    (reloaded.data.products || []).some((p) => p.id === marker),
    `version ${reloaded.version}`);
} catch (e) {
  bad('unexpected error', e.message);
} finally {
  if (srv) srv.child.kill('SIGKILL');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
