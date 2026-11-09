/**
 * Mascot QA for makuru-ops.html (placement A: bottom-right, every page)
 * Run: node ops-simple/tests/mascot.mjs
 */
import { chromium } from 'playwright-core';
const U = 'file:///home/user/makuru-ops.html';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errs = [];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

const seed = {
  products: [{ id: 'p1', name: 'Siomay Ayam', pack_size: '6 pcs', price: 12, kitchen: 24, shops: { s1: 10 } }],
  materials: [{ id: 'm1', name: 'Prawn', unit: 'kg', qty: 1.2, min: 3 }],
  shops: [{ id: 's1', name: 'Campsie Asian Grocer', suburb: 'Campsie NSW', phone: '0412345678', commission: 20 }],
  orders: [], sales: [], seq: { order: 1 }
};

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(U);
await page.evaluate(s => localStorage.setItem('makuru_simple_v1', JSON.stringify(s)), seed);
await page.reload();
await wait(800);

// 1. on the landing page
const land = await page.evaluate(() => {
  const mk = document.querySelector('.mk--fixed');
  if (!mk) return null;
  const r = mk.getBoundingClientRect();
  return {
    w: Math.round(r.width), h: Math.round(r.height),
    right: Math.round(innerWidth - r.right), bottom: Math.round(innerHeight - r.bottom),
    steam: !!mk.querySelector('.mk-puff'), eyes: mk.querySelectorAll('.mk-eye').length,
    hit: !!mk.querySelector('.mk-hit')
  };
});
ok(land && land.w === 120 && land.h === 120, 'mascot sits on the landing page at 120px');
ok(land && land.right < 40 && land.bottom < 40, 'mascot is pinned to the bottom-right corner');
ok(land && land.eyes === 2 && land.steam && land.hit, 'eyes, steam and the click target are all there');
await wait(1200);
ok((await page.textContent('.mk-bubble')).trim() === 'Hi! Hungry?' && /is-talking/.test(await page.$eval('.mk', e => e.className)), 'he says hi once on the start screen');
await page.screenshot({ path: 'shots-mascot/a01-landing.png' });

// 2. eyes follow the pointer
const pupil = () => page.$eval('.mk-pupil', e => e.style.transform || 'none');
await page.mouse.move(300, 200); await wait(400);
const lookLeft = await pupil();
await page.mouse.move(1380, 820); await wait(400);
const lookRight = await pupil();
ok(lookLeft !== lookRight, 'eyes follow the pointer (' + lookLeft + ' -> ' + lookRight + ')');

// 3. he stays on every page
await page.click('[data-act="enter"]');
await wait(1100);
ok(!!(await page.$('.app .main')) && !!(await page.$('.mk--fixed')), 'mascot stays after Enter (on Home)');
for (const r of ['#/stock', '#/materials', '#/shops', '#/orders']) {
  await page.evaluate(h => { location.hash = h; }, r);
  await wait(700);
  ok(!!(await page.$('.mk--fixed')), 'mascot still there on ' + r);
}

// 4. clicks react
await page.click('.mk--fixed .mk-hit');
await wait(140);
ok(/is-hop/.test(await page.$eval('.mk--fixed', e => e.className)), 'clicking him makes him jump');
await wait(900);

// 5. hidden while a dialog is open
await page.evaluate(() => { location.hash = '#/stock'; }); await wait(800);
await page.click('[data-act="product-modal"]'); await wait(300);
const hidden = await page.$eval('.mk--fixed', e => getComputedStyle(e).display);
ok(hidden === 'none', 'mascot hides while a dialog is open (no covering Delete)');
await page.keyboard.press('Escape'); await wait(350);
ok(await page.$eval('.mk--fixed', e => getComputedStyle(e).display) !== 'none', 'mascot comes back when the dialog closes');

// 6. toast lift keeps him clear
await page.click('[data-act="product-del-ask"]'); await wait(250);
await page.click('[data-act="product-del"]'); await wait(250);
ok(/is-lifted/.test(await page.$eval('.mk--fixed', e => e.className)), 'mascot lifts while a toast is showing');
await wait(2800);
ok(!/is-lifted/.test(await page.$eval('.mk--fixed', e => e.className)), 'mascot settles back down after the toast');

// 7. reduced motion: no bobbing, still visible
const rm = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
rm.on('pageerror', e => errs.push('rm:' + e.message));
await rm.goto(U); await wait(500);
const calm = await rm.evaluate(() => {
  const mk = document.querySelector('.mk--fixed');
  return { bob: getComputedStyle(mk.querySelector('.mk-bob')).animationName, visible: mk.getBoundingClientRect().width > 0 };
});
ok(calm.visible && calm.bob === 'none', 'reduced motion stops the bobbing but keeps the mascot');

// 8. phones: 88px, lifted, toast readable
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', e => errs.push('m:' + e.message));
await m.goto(U + '#/stock'); await wait(900);
const mw = await m.$eval('.mk--fixed', e => Math.round(e.getBoundingClientRect().width));
ok(mw === 88, 'mascot shrinks to 88px on a phone');
await m.screenshot({ path: 'shots-mascot/a02-mobile.png' });
await m.evaluate(() => { location.hash = '#/materials'; }); await wait(900);
await m.screenshot({ path: 'shots-mascot/a03-mobile-materials.png' });

await page.evaluate(() => { location.hash = '#/dashboard'; }); await wait(1000);
await page.screenshot({ path: 'shots-mascot/a04-home.png' });

ok(errs.length === 0, 'no console/page errors ' + JSON.stringify(errs));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
await browser.close();
process.exit(fail ? 1 : 0);
