/**
 * Animation QA for makuru-ops.html
 * Checks the pinch-to-bottom page transition, the 0 -> value count-up,
 * button hover motion and the prefers-reduced-motion fallback.
 * Run: node ops-simple/tests/anim.mjs
 */
import { chromium } from 'playwright-core';
const U = 'file:///home/user/makuru-ops.html';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errs = [];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

const seed = {
  products: [
    { id: 'p1', name: 'Siomay Ayam', pack_size: '6 pcs', price: 12, kitchen: 24, shops: { s1: 10, s2: 6 } },
    { id: 'p2', name: 'Hakau Udang', pack_size: '6 pcs', price: 14, kitchen: 4, shops: { s1: 8 } }
  ],
  materials: [{ id: 'm1', name: 'Chicken mince', unit: 'kg', qty: 6.5, min: 5 }],
  shops: [
    { id: 's1', name: 'Campsie Asian Grocer', suburb: 'Campsie NSW', phone: '0412345678', commission: 20 },
    { id: 's2', name: 'Lakemba Mart', suburb: 'Lakemba NSW', phone: '', commission: 15 }
  ],
  orders: [{ id: 'o1', ref: 'ORD-001', customer: 'Mei Tan', phone: '0412345678', suburb: 'Belmore', date: '2026-11-07', items: [{ product_id: 'p1', name: 'Siomay Ayam', qty: 3, price: 12 }], packs: 3, total: 36.5, paid: true, pay: 'PayID', status: 'open', note: '' }],
  sales: [{ id: 'x1', date: '2026-11-05', shop_id: 's1', shop_name: 'Campsie Asian Grocer', product_id: 'p1', product_name: 'Siomay Ayam', qty: 4, amount: 48 }],
  seq: { order: 2 }
};
const vals = page => page.$$eval('.stat .value', els => els.map(e => e.textContent));

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(U);
await page.evaluate(s => localStorage.setItem('makuru_simple_v1', JSON.stringify(s)), seed);
await page.reload();
await page.goto(U + '#/dashboard');
await wait(1200);

ok(await page.evaluate(() => localStorage.getItem('makuru_simple_v1') !== null), 'seeded data loaded');

// 1. landing button label + hover motion
await page.goto(U);
await wait(900);
const enterText = (await page.textContent('[data-act="enter"]')).trim();
ok(/^Enter\b/.test(enterText), 'landing button reads "Enter" (got: ' + enterText + ')');
const baseT = await page.$eval('[data-act="enter"]', e => getComputedStyle(e).transform);
await page.hover('[data-act="enter"]');
await wait(420);
const hoverT = await page.$eval('[data-act="enter"]', e => getComputedStyle(e).transform);
ok(baseT !== hoverT && /matrix/.test(hoverT), 'button lifts on hover (' + baseT + ' -> ' + hoverT + ')');

// 1b. the makuru. wordmark animates letter by letter
const word = await page.evaluate(() => {
  const logo = document.querySelector('.gateway-logo');
  const letters = [...logo.querySelectorAll('.gl')];
  return {
    text: letters.map(e => e.textContent).join(''),
    delays: letters.map(e => parseFloat(getComputedStyle(e).animationDelay)),
    names: letters.map(e => getComputedStyle(e).animationName),
    float: getComputedStyle(logo).animationName,
    rule: getComputedStyle(logo.querySelector('.gl-rule')).animationName,
    halo: getComputedStyle(document.querySelector('.gateway'), '::before').animationName
  };
});
ok(word.text === 'makuru.' && word.delays.length === 7, 'wordmark is split into 7 animated letters');
ok(word.delays.every((d, i, a) => i === 0 || d > a[i - 1]), 'letters rise one after another (' + word.delays.join('/') + ')');
ok(word.names.slice(0, 6).every(n => n === 'letterUp') && word.names[6] === 'dotPop', 'letters + the full stop have their own move');
ok(word.rule === 'ruleDraw' && word.float === 'logoFloat' && word.halo === 'halo', 'rule draws, wordmark floats, halo breathes');

// 2. enter -> dashboard: pinch overlay appears then cleans itself up
await page.click('[data-act="enter"]');
await wait(90);
const snapMid = await page.$$eval('.snap', e => e.length);
const appMid = await page.$$eval('.app', e => e.length);
await wait(900);
const snapEnd = await page.$$eval('.snap', e => e.length);
ok(appMid === 1 && snapMid === 1, 'gateway is cloned into a pinch overlay on Enter');
ok(snapEnd === 0, 'pinch overlay removes itself');

// 3. count-up runs 0 -> value, then lands exactly
await page.evaluate(() => { location.hash = '#/orders'; });
await wait(70);
const early = await vals(page);
await wait(1200);
const settled = await vals(page);
ok(early.join(',') !== settled.join(','), 'stat numbers animate (early ' + early.join('/') + ')');
ok(settled.join(',') === '1,0,1,$84.50', 'stat numbers settle on the real values (' + settled.join('/') + ')');
ok(!(await page.$$('.snap')).length, 'no overlay left behind after in-app navigation');

// 4. in-app navigation only pinches the main column (sidebar stays put)
await page.evaluate(() => { location.hash = '#/shops'; });
await wait(110);
const navInfo = await page.evaluate(() => {
  const s = document.querySelector('.snap');
  return s ? { cls: s.className, kids: !!s.querySelector('.sidebar') } : null;
});
ok(navInfo && /snap--main/.test(navInfo.cls) && !navInfo.kids, 'page change pinches the main column only');
await wait(900);
const shopVals = await page.$$eval('.shop-total .cnt', els => els.map(e => e.textContent));
ok(shopVals.length === 2, 'packs per shop still render (' + shopVals.join('/') + ')');

// 5. numbers on the dashboard also count up from zero on each visit
await page.evaluate(() => { location.hash = '#/dashboard'; });
await wait(80);
const dAshEarly = await vals(page);
await wait(1200);
const dAsh = await vals(page);
ok(dAsh.join(',') === '28,24,1,0' && dAshEarly.join(',') !== dAsh.join(','), 'dashboard packs count up 0 -> 28/24 (' + dAshEarly.join('/') + ' -> ' + dAsh.join('/') + ')');

// 6. reduced motion: no animation, values are final immediately
const rm = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
rm.on('pageerror', e => errs.push('rm:' + e.message));
await rm.goto(U);
await rm.evaluate(s => localStorage.setItem('makuru_simple_v1', JSON.stringify(s)), seed);
await rm.reload();
await rm.goto(U + '#/dashboard');
await wait(90);
ok((await vals(rm)).join(',') === '28,24,1,0', 'reduced motion jumps straight to the final numbers');
await rm.click('[data-act="go"][data-to="orders"]');
await wait(60);
ok(!(await rm.$$('.snap')).length, 'reduced motion skips the pinch overlay');
await rm.waitForTimeout(300);
await rm.screenshot({ path: 'shots-ops/anim-reduced-motion.png' });

// 7. coming back with Exit replays the wordmark
await page.click('[data-act="go"][data-to=""]');
await wait(70);
const replay = await page.evaluate(() => {
  const l = document.querySelector('.gateway-logo .gl');
  return l ? { op: +getComputedStyle(l).opacity, name: getComputedStyle(l).animationName } : null;
});
ok(replay && replay.name === 'letterUp' && replay.op < 0.95, 'Exit replays the wordmark entrance (opacity ' + (replay && replay.op) + ')');
await wait(1600);
await page.screenshot({ path: 'shots-ops/w-landing-desktop.png' });

ok(errs.length === 0, 'no console/page errors ' + JSON.stringify(errs));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
await browser.close();
process.exit(fail ? 1 : 0);
