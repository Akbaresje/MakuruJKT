/**
 * Multi-device test: two browsers, one server, one shared database.
 * Run: node ops-simple/tests/cloud.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 8130;
const BASE = `http://127.0.0.1:${PORT}`;
const PIN = '4321';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'makuru-cloud-'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const wait = (ms = 400) => new Promise(r => setTimeout(r, ms));

/* ---------- server ---------- */
const srv = spawn(process.execPath, ['server/server.mjs'], {
  cwd: '/home/user',
  env: { ...process.env, PORT: String(PORT), DATA_DIR: tmp, PUBLIC_DIR: '/home/user/server/public', MAKURU_PIN: PIN },
  stdio: ['ignore', 'pipe', 'pipe']
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('server start timeout')), 8000);
  srv.stdout.on('data', d => { if (String(d).includes('running on')) { clearTimeout(t); resolve(); } });
});

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errs = [];

async function device(name) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(name + ': ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // 401 (wrong PIN) and 409 (merge) are deliberate parts of this test
    if (/Failed to load resource.*status of (401|409)/.test(m.text())) return;
    errs.push(name + ' log: ' + m.text());
  });
  return { ctx, page };
}
const signIn = async (page, pin = PIN) => {
  await page.fill('input[name=pin]', pin);
  await page.click('[data-act="login"]');
  await wait(900);
};
const enter = async (page) => { await page.click('[data-act="enter"]'); await wait(900); };
const go = async (page, route) => {
  await page.evaluate(r => { location.hash = '#/' + r; }, route);
  await wait(700);
};
const addProduct = async (page, name, kitchen = 10) => {
  await go(page, 'stock');
  await page.click('[data-act="product-modal"]');
  await wait(350);
  await page.fill('#f-product [name=name]', name);
  await page.fill('#f-product [name=price]', '12');
  await page.fill('#f-product [name=kitchen]', String(kitchen));
  await page.click('[data-act="product-save"]');
  await wait(800);
};
const addShop = async (page, name) => {
  await go(page, 'shops');
  await page.click('[data-act="shop-modal"]');
  await wait(350);
  await page.fill('#f-shop [name=name]', name);
  await page.fill('#f-shop [name=suburb]', 'Belmore NSW');
  await page.click('[data-act="shop-save"]');
  await wait(800);
};
/** make the page refresh from the server right away instead of waiting for the 12s poll */
const pull = async (page) => {
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await wait(800);
};

/* ---------- 1. login gate ---------- */
const A = await device('A');
await A.page.goto(BASE, { waitUntil: 'load' });
await wait(1200);
ok(!!(await A.page.$('#f-login')), 'app asks for the PIN when a server is present');
ok(!(await A.page.$('.gateway [data-act="enter"]')), 'the app is not reachable before signing in');
await A.page.screenshot({ path: 'shots-cloud/c01-login.png' });

await signIn(A.page, '0000');
ok(/Wrong PIN/.test(await A.page.textContent('.login-err').catch(() => '')), 'wrong PIN shows an error');

await signIn(A.page);
ok(!!(await A.page.$('.gateway [data-act="enter"]')), 'correct PIN opens the app');
await enter(A.page);
ok((await A.page.textContent('[data-sync]')).includes('Synced'), 'sidebar shows Synced');

/* ---------- 2. device A creates data ---------- */
await addProduct(A.page, 'Siomay Ayam', 20);
ok((await A.page.textContent('body')).includes('Siomay Ayam'), 'device A added a product');

/* ---------- 3. device B sees it ---------- */
const B = await device('B');
await B.page.goto(BASE, { waitUntil: 'load' });
await wait(1200);
ok(!!(await B.page.$('#f-login')), 'device B also needs the PIN');
await signIn(B.page);
await enter(B.page);
ok((await B.page.textContent('body')).includes('Siomay Ayam'), 'device B sees device A data after signing in');
await B.page.screenshot({ path: 'shots-cloud/c02-deviceB.png' });

/* ---------- 4. B writes, A picks it up ---------- */
await addShop(B.page, 'Campsie Grocer');
await pull(A.page);
await go(A.page, 'shops');
ok((await A.page.textContent('body')).includes('Campsie Grocer'), 'device A sees the shop device B added (no reload)');

/* ---------- 5. both save at the same time ---------- */
// A adds a product (server version bumps), B is still on the old version
await addProduct(A.page, 'Hakau Udang', 5);
await addProduct(B.page, 'Bakpao Char Siu', 7);
await wait(900);
const state = await fetch(`${BASE}/api/state`, { headers: { Authorization: 'Bearer ' + (await B.page.evaluate(() => localStorage.getItem('makuru_token_v1'))) } }).then(r => r.json());
const names = state.data.products.map(p => p.name).sort().join(' | ');
ok(names === 'Bakpao Char Siu | Hakau Udang | Siomay Ayam', 'a simultaneous save merged instead of overwriting (' + names + ')');
ok(state.data.shops.length === 1, 'the shop survives the merge');

await pull(A.page); await go(A.page, 'stock');
const aBody = await A.page.textContent('body');
ok(aBody.includes('Hakau Udang') && aBody.includes('Bakpao Char Siu'), 'device A ends up with both products');

/* ---------- 6. reload keeps the session ---------- */
await A.page.reload({ waitUntil: 'load' });
await wait(1200);
ok(!(await A.page.$('#f-login')), 'reload keeps device A signed in');
ok((await A.page.textContent('body')).includes('makuru'), 'app renders after reload');

/* ---------- 7. changes are really on the server ---------- */
const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'state.json'), 'utf8'));
ok(onDisk.data.products.length === 3 && onDisk.version >= 3, 'state.json on the server holds the merged data (v' + onDisk.version + ')');

/* ---------- 8. sign out ---------- */
await A.page.evaluate(() => { location.hash = '#/dashboard'; });
await wait(500);
await A.page.click('[data-act="signout"]');
await wait(500);
ok(!!(await A.page.$('#f-login')), 'sign out returns to the PIN screen');
await A.page.reload({ waitUntil: 'load' });
await wait(900);
ok(!!(await A.page.$('#f-login')), 'sign out survives a reload');

/* ---------- 9. wrong server / offline falls back ---------- */
const C = await device('C');
await C.page.goto('file:///home/user/makuru-ops.html', { waitUntil: 'load' });
await wait(900);
ok(!!(await C.page.$('.gateway [data-act="enter"]')), 'opened from disk there is no login: local mode still works');

console.log('\nconsole errors:', errs.length ? errs : 'none');
ok(errs.length === 0, 'no console errors');
console.log('\n' + pass + ' passed, ' + fail + ' failed');

await browser.close();
srv.kill('SIGTERM');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
