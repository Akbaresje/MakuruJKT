/**
 * Build step for the makuru Vercel deployment.
 *
 * What it does:
 *  1. Re-syncs the generated assets (index.html + lib/core.mjs) from the
 *     makuru workspace when they are reachable (monorepo / local checkout).
 *     On a host that only has this folder they are already committed, so the
 *     step is a no-op.
 *  2. Validates the deployment bundle: required files exist, every .mjs
 *     parses, every API route resolves, and the storage layer reports which
 *     driver it will use for the configured DATABASE_URL (if any).
 *
 * Exits non-zero on any problem, so it is safe as the Vercel build command.
 */
import { readFileSync, existsSync, copyFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const workspace = dirname(root);

// Pick up DATABASE_URL / MAKURU_PIN from .env.local, exactly like dev-server.
const { loadEnv } = await import(join(root, 'lib', 'load-env.mjs'));
const envFiles = loadEnv(root);

const t = (label, ok, extra = '') =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
let failures = 0;
function check(label, ok, extra) {
  if (!ok) failures++;
  t(label, ok, extra);
}
function warn(label, ok, extra) {
  console.log(`${ok ? 'PASS' : 'WARN'}  ${label}${extra ? '  ' + extra : ''}`);
}

console.log(`\nmakuru build  ${new Date().toISOString()}`);
console.log(`root: ${root}`);
console.log(`env:  ${envFiles.length ? envFiles.join(', ') : '(none loaded from .env*)'}\n`);

/* 1. re-sync generated assets when the workspace is next to us */
const syncPairs = [
  [join(workspace, 'makuru-ops.html'), join(root, 'index.html')],
  [join(workspace, 'server', 'core.mjs'), join(root, 'lib', 'core.mjs')]
];
for (const [from, to] of syncPairs) {
  if (!existsSync(from)) {
    check(`sync ${to.replace(root + '/', '')}`, true, '(source not present, using committed copy)');
    continue;
  }
  const a = readFileSync(from);
  const b = existsSync(to) ? readFileSync(to) : Buffer.alloc(0);
  if (a.equals(b)) {
    check(`sync ${to.replace(root + '/', '')}`, true, 'already current');
  } else {
    copyFileSync(from, to);
    check(`sync ${to.replace(root + '/', '')}`, true, `updated (${a.length} B)`);
  }
}

/* 2. required files */
const required = [
  'index.html',
  'api/[...path].mjs',
  'lib/core.mjs',
  'lib/storage-pg.mjs',
  'vercel.json',
  'package.json'
];
for (const f of required) {
  const p = join(root, f);
  check(`file ${f}`, existsSync(p), existsSync(p) ? `${statSync(p).size} B` : 'missing');
}

/* 3. every module parses */
const modules = ['api/[...path].mjs', 'lib/core.mjs', 'lib/storage-pg.mjs', 'dev-server.mjs']
  .filter((f) => existsSync(join(root, f)));
for (const f of modules) {
  try {
    execFileSync(process.execPath, ['--check', join(root, f)], { stdio: 'pipe' });
    check(`parse ${f}`, true);
  } catch (e) {
    check(`parse ${f}`, false, String(e.stderr || e.message).split('\n')[0]);
  }
}

/* 4. the API route module must expose a handler */
try {
  const mod = await import(join(root, 'api/[...path].mjs'));
  check('api route exports default handler', typeof mod.default === 'function');
} catch (e) {
  check('api route exports default handler', false, e.message);
}

/* 5. storage wiring */
const { createPgStorage, connectionString } = await import(join(root, 'lib', 'storage-pg.mjs'));
const url = connectionString();
if (!url) {
  check('storage DATABASE_URL', false, 'not set — add it in Vercel project settings');
} else {
  const store = createPgStorage({ url });
  const kind = await store.driverKind();
  check('storage driver', true, `${kind} (${new URL(url).hostname})`);
}

/* 6. auth wiring */
check('MAKURU_PIN set', Boolean(process.env.MAKURU_PIN),
  process.env.MAKURU_PIN ? '(hidden)' : 'missing — add it in Vercel project settings');
warn('MAKURU_SECRET set (optional)', Boolean(process.env.MAKURU_SECRET),
  process.env.MAKURU_SECRET ? '(hidden)' : 'not set — sessions fall back to a MAKURU_PIN-derived key');

console.log(`\n${failures ? `${failures} check(s) failed` : 'build ok'}\n`);
process.exit(failures ? 1 : 0);
