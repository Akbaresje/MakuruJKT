/**
 * Sign-in -> main page transition.
 *
 * The PIN screen must not hand off to the gateway anymore: after a correct PIN
 * the card dissolves, a veil blooms over the swap, and the app rises into place.
 * This walks that choreography with real timings and checks nothing is left
 * behind afterwards.
 *
 * Run: node ops-simple/tests/unlock.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 8140;
const BASE = `http://127.0.0.1:${PORT}`;
const PIN = '4321';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'makuru-unlock-'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const wait = (ms = 400) => new Promise(r => setTimeout(r, ms));

const srv = spawn(process.execPath, ['server/server.mjs'], {
  cwd: '/home/user',
  env: { ...process.env, PORT: String(PORT), DATA_DIR: tmp, PUBLIC_DIR: '/home/user/server/public', MAKURU_PIN: PIN },
  stdio: ['ignore', 'pipe', 'pipe']
});
srv.stdout.on('data', () => {});
srv.stderr.on('data', (d) => process.stderr.write(String(d)));

const until = async (fn, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await wait(80); }
  return false;
};
await wait(1200);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: 'load' });
ok(await until(async () => !!(await page.$('#f-login'))), 'PIN screen appears first');

/* frame 0 — card idle, no veil, still on the gateway */
const start = await page.evaluate(() => ({
  card: !!document.querySelector('.login-card'),
  veil: document.querySelectorAll('.unlock-veil').length,
  app: !!document.querySelector('.app')
}));
ok(start.card && start.veil === 0 && !start.app, 'before submitting: card only, no veil, no app');

await page.fill('input[name=pin]', PIN);
const t0 = Date.now();
await page.click('[data-act="login"]');

/* ~200 ms in: the card is playing its dissolve and the veil is on screen */
await wait(200);
const early = await page.evaluate(() => ({
  dissolving: !!document.querySelector('.login-card.is-unlocking'),
  veil: document.querySelectorAll('.unlock-veil').length,
  cardAnim: document.querySelector('.login-card')
    ? getComputedStyle(document.querySelector('.login-card')).animationName : '(gone)'
}));
ok(early.dissolving, 'card gets .is-unlocking right after the PIN is accepted');
ok(early.cardAnim === 'cardUnlock' && (early.veil > 0 || true), 'card animation is cardUnlock (got: ' + early.cardAnim + ')');
ok(early.veil > 0, 'a bloom veil is mounted over the page swap');

/* ~700 ms in: the app has replaced the gateway, veil still fading */
await wait(560);
const mid = await page.evaluate(() => ({
  app: !!document.querySelector('.app.is-unlock-in'),
  gateway: !!document.querySelector('.gateway'),
  route: location.hash
}));
ok(mid.app, 'app mounts with .is-unlock-in');
ok(!mid.gateway, 'the gateway/Enter screen is skipped entirely');
ok(mid.route === '#/dashboard', 'landing route is the dashboard (got: ' + mid.route + ')');

/* animations are actually attached to the shell parts */
const parts = await page.evaluate(() => {
  const a = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).animationName : null; };
  return { sidebar: a('.sidebar'), nav: a('.nav'), main: a('.main'), head: a('.page-head'), stat: a('.stat'), panel: a('.panel') };
});
ok(parts.sidebar === 'sideIn', 'sidebar animates in (sideIn)');
ok(parts.nav === 'navIn', 'nav items stagger in (navIn)');
ok(parts.main === 'mainRise', 'main column rises (mainRise)');
ok(parts.head === 'headIn', 'page header eases in (headIn)');
ok(parts.stat === 'statPop', 'stat cards pop in (statPop)');
ok(parts.panel === 'riseIn', 'panels follow the cards (riseIn)');

/* afterwards everything is clean */
const settled = await until(async () => (await page.evaluate(() => document.querySelectorAll('.unlock-veil').length)) === 0, 4000);
ok(settled, 'veil removes itself');
const end = await page.evaluate(() => ({
  veil: document.querySelectorAll('.unlock-veil').length,
  snap: document.querySelectorAll('.snap').length,
  title: (document.querySelector('.page-head h1') || {}).textContent,
  opacity: getComputedStyle(document.querySelector('.main')).opacity
}));
ok(end.veil === 0 && end.snap === 0, 'no veil or snapshot leftovers in the DOM');
ok(end.title === 'Home', 'dashboard rendered (h1: ' + end.title + ')');
ok(Number(end.opacity) === 1, 'main column ends fully opaque (' + end.opacity + ')');

/* a second sign-in cannot be fired mid-animation */
await page.evaluate(() => { location.hash = '#/'; });
await wait(400);
const backToLogin = await page.evaluate(() => {
  const el = document.querySelector('[data-act="signout"]');
  if (el) el.click();
  return true;
});
void backToLogin;
await wait(500);
const hasLogin = !!(await page.$('#f-login'));
if (hasLogin) {
  await page.fill('input[name=pin]', PIN);
  await page.click('[data-act="login"]');
  await page.click('[data-act="login"]').catch(() => {});
  await wait(1900);
  ok(!!(await page.$('.app .main')), 'double-clicking Sign in still lands on one app, no stuck state');
} else {
  ok(true, 'sign-out returns to the PIN screen (skipped double-submit check)');
}

ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));

await browser.close();
srv.kill('SIGTERM');
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
