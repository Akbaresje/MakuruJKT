/**
 * Finance + Home money QA for makuru-ops.html
 * Run: node ops-simple/tests/finance.mjs
 */
import { chromium } from 'playwright-core';
const U = 'file:///home/user/makuru-ops.html';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errs = [];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

const now = new Date();
const ym = now.toISOString().slice(0, 7);
const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 20);
const prev = prevDate.toISOString().slice(0, 7);

/* one clean month that the numbers below are checked against:
   paid orders this month        44 + 60 = 104
   shop sales this month         90 + 60 + 42 = 192
   revenue                       296
   commission   90*20% + 60*15% + 42*20% = 18 + 9 + 8.40 = 35.40
   food cost    3 packs @ p1 6 + p2 6.5 = 12.5 ... per pack cost * qty:
                o1: 2*6 + 1*6.5 = 18.5   o2: 4*6 = 24   sales x1: 6*6=36  x2: 4*6=24  x3: 3*6.5=19.5  total 122
   fixed costs   120
   net           296 - 35.4 - 122 - 120 = 18.60
   unpaid        28 (not in revenue)
*/
const seed = {
  products: [
    { id: 'p1', name: 'Dimsum Mentai', pack_size: '6 pcs', price: 15, cost: 6, clock: '25 min', kitchen: 40, shops: { s1: 12, s2: 8 } },
    { id: 'p2', name: 'Hakau Udang', pack_size: '6 pcs', price: 14, cost: 6.5, clock: '30 min', kitchen: 18, shops: { s1: 6 } }
  ],
  materials: [{ id: 'm1', name: 'Prawn', unit: 'kg', qty: 1.2, min: 3 }],
  shops: [
    { id: 's1', name: 'Campsie Asian Grocer', suburb: 'Campsie NSW', phone: '0412345678', commission: 20 },
    { id: 's2', name: 'Bankstown Dim Sum Co', suburb: 'Bankstown NSW', phone: '0400111222', commission: 15 },
    { id: 's3', name: 'Marrickville Market', suburb: 'Marrickville NSW', phone: '0400333444', commission: 10 }
  ],
  orders: [
    { id: 'o1', ref: 'ORD-001', customer: 'Mei Tan', phone: '0412345678', suburb: 'Belmore', date: ym + '-03', time: '17:30', items: [{ product_id: 'p1', name: 'Dimsum Mentai', qty: 2, price: 15 }, { product_id: 'p2', name: 'Hakau Udang', qty: 1, price: 14 }], packs: 3, total: 44, paid: true, paid_month: ym, pay: 'PayID', status: 'delivered', note: '', created: ym + '-02T10:00:00.000Z' },
    { id: 'o2', ref: 'ORD-002', customer: 'Adi Putra', phone: '0498765432', suburb: 'Lakemba', date: ym + '-11', time: '12:15', items: [{ product_id: 'p1', name: 'Dimsum Mentai', qty: 4, price: 15 }], packs: 4, total: 60, paid: true, paid_month: ym, pay: 'Cash', status: 'delivered', note: '', created: ym + '-10T08:00:00.000Z' },
    { id: 'o3', ref: 'ORD-003', customer: 'Rina', phone: '0455111999', suburb: 'Pickup', date: ym + '-12', time: '18:00', items: [{ product_id: 'p2', name: 'Hakau Udang', qty: 2, price: 14 }], packs: 2, total: 28, paid: false, pay: '', status: 'open', note: '', created: ym + '-12T04:00:00.000Z' },
    { id: 'o4', ref: 'ORD-004', customer: 'Bayu', phone: '0411999888', suburb: 'Belmore', date: prev + '-20', time: '16:00', items: [{ product_id: 'p1', name: 'Dimsum Mentai', qty: 6, price: 15 }], packs: 6, total: 90, paid: true, paid_month: prev, pay: 'PayID', status: 'delivered', note: '', created: prev + '-20T06:00:00.000Z' }
  ],
  sales: [
    { id: 'x1', date: ym + '-05', sale_month: ym, shop_id: 's1', shop_name: 'Campsie Asian Grocer', product_id: 'p1', product_name: 'Dimsum Mentai', qty: 6, amount: 90 },
    { id: 'x2', date: ym + '-09', sale_month: ym, shop_id: 's2', shop_name: 'Bankstown Dim Sum Co', product_id: 'p1', product_name: 'Dimsum Mentai', qty: 4, amount: 60 },
    { id: 'x3', date: ym + '-10', sale_month: ym, shop_id: 's1', shop_name: 'Campsie Asian Grocer', product_id: 'p2', product_name: 'Hakau Udang', qty: 3, amount: 42 },
    { id: 'x4', date: prev + '-15', sale_month: prev, shop_id: 's1', shop_name: 'Campsie Asian Grocer', product_id: 'p1', product_name: 'Dimsum Mentai', qty: 5, amount: 75 }
  ],
  seq: { order: 5 }, settings: { rent: 120 }
};

const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
page.on('pageerror', e => errs.push('page:' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
await page.addInitScript(s => localStorage.setItem('makuru_simple_v1', JSON.stringify(s)), seed);
await page.goto(U);
await wait(500);
await page.click('[data-act="enter"]');
await wait(1100);

/* ---------- 1. Home: the two info blocks ---------- */
const hero = await page.evaluate(() => ({
  label: document.querySelector('.hm-label')?.textContent.trim(),
  value: document.querySelector('.hm-value')?.textContent.trim(),
  sub: document.querySelector('.hm-sub')?.textContent.trim(),
  chips: [...document.querySelectorAll('.hm-chip')].map(c => c.innerText.replace(/\n/g, ' '))
}));
ok(/Sales this month/i.test(hero.label), 'Home states this month at the top (' + hero.label + ')');
ok(hero.value === '$296.00', 'Home month figure is paid orders + shop sales (' + hero.value + ')');
ok(/2 paid orders/.test(hero.sub) && /3 shop sales/.test(hero.sub), 'Home says where the money came from (' + hero.sub + ')');
ok(hero.chips.some(c => /Net after costs.*\$18\.60/.test(c)), 'Home shows net after costs (' + hero.chips.join(' | ') + ')');
ok(hero.chips.some(c => /Still to collect.*\$28\.00/.test(c)), 'Home shows what is still unpaid, kept out of revenue');

const shopsBlock = await page.evaluate(() => {
  const t = document.querySelector('.tbl--shops');
  if (!t) return null;
  return {
    title: t.closest('.panel').querySelector('h2').textContent.trim(),
    sub: t.closest('.panel').querySelector('.panel-head p').textContent.trim(),
    rows: [...t.querySelectorAll('tbody tr')].map(r => ({
      shop: r.querySelector('.td-main').textContent.trim(),
      packs: r.querySelector('.pack') ? [...r.querySelectorAll('.pack')].map(p => p.textContent.trim()) : [],
      total: r.children[2].textContent.trim(),
      value: r.children[3].textContent.trim()
    }))
  };
});
ok(shopsBlock && /Stock in shops/.test(shopsBlock.title), 'Home has the per-shop stock block');
ok(shopsBlock.rows.length === 3 && /No packs yet/.test(shopsBlock.rows[2].packs.join(' ')) === false, 'every shop gets a line, empty ones last');
ok(shopsBlock.rows[2].total === '0', 'a shop with no packs shows 0 (' + shopsBlock.rows[2].shop + ')');
ok(shopsBlock.rows[0].shop === 'Campsie Asian Grocer' && shopsBlock.rows[0].total === '18', 'biggest shop first, with its pack count (' + shopsBlock.rows[0].total + ')');
ok(shopsBlock.rows[0].packs.join('|') === '12 x Dimsum Mentai|6 x Hakau Udang', 'each product and how many packs (' + shopsBlock.rows[0].packs.join(' / ') + ')');
ok(shopsBlock.rows[0].value === '$264.00', 'stock at selling price per shop (' + shopsBlock.rows[0].value + ')');
ok(/26 packs out at shops, \$384\.00/.test(shopsBlock.sub), 'the block totals itself (' + shopsBlock.sub + ')');

/* ---------- 2. Finance page ---------- */
await page.evaluate(() => { location.hash = '#/finance'; });
await wait(1100);
ok(await page.$('.tbl--pl'), 'Finance page exists and is reachable from the menu');

const fin = await page.evaluate(() => ({
  title: document.querySelector('.page-head h1').textContent.trim(),
  stats: [...document.querySelectorAll('.stats .stat')].map(s => s.innerText.replace(/\n/g, ' | ')),
  pl: [...document.querySelectorAll('.tbl--pl tr')].map(r => r.children[0].querySelector('.td-main').textContent.trim() + '=' + r.children[1].textContent.trim()),
  story: document.querySelector('.story')?.textContent.trim(),
  tips: [...document.querySelectorAll('.tip b')].map(e => e.textContent.trim()),
  bars: [...document.querySelectorAll('.bar-col')].length,
  spark: [...document.querySelectorAll('.spark i')].length,
  rank: [...document.querySelectorAll('.rank-row')].length,
  ledger: [...document.querySelectorAll('.tbl--ledger tbody tr')].length,
  months: [...document.querySelectorAll('.months-pick .mp')].map(b => b.textContent.trim())
}));
ok(fin.title === 'Finance', 'the page is called Finance');
ok(fin.stats.some(s => /\$296\.00/.test(s) && /2 orders \+ 3 shop sales/.test(s)), 'revenue headline matches the month');
ok(fin.stats.some(s => /\$35\.40/.test(s)), 'commission is 20%/15%/20% of the shop sales ($35.40)');
ok(fin.stats.some(s => /\$242\.00/.test(s) && /\$120\.00 fixed/.test(s) && /\$122\.00 food/.test(s)), 'costs split into fixed and food ($242.00)');
ok(fin.stats.some(s => /\$18\.60/.test(s)), 'net is 296 - 35.40 - 122 - 120 = $18.60');
ok(fin.pl.includes('Revenue=$296.00'), 'P&L revenue line (' + fin.pl.join(' ') + ')');
ok(fin.pl.includes('Shop commission=-$35.40'), 'P&L commission is negative and readable');
ok(fin.pl.includes('Food cost=-$122.00'), 'P&L food cost from the cost per pack');
ok(fin.pl.includes('Fixed costs=-$120.00'), 'P&L fixed costs from the monthly costs setting');
ok(fin.pl.includes('Net profit=$18.60'), 'P&L bottom line');
ok(/you kept \$18\.60/.test(fin.story || ''), 'plain words say what you kept');
ok(/still unpaid/.test(fin.story || ''), 'plain words mention the money not counted yet');
ok(fin.tips.some(t => /Collect \$28\.00/.test(t)), 'it tells you to collect the unpaid order');
ok(fin.tips.some(t => /Marrickville Market/.test(t)) === false, 'a shop that sold nothing this month with no packs is not nagged about');
ok(fin.bars === 6, 'six months of bars (' + fin.bars + ')');
ok(fin.spark === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), 'one bar per day of the month (' + fin.spark + ')');
ok(fin.rank === 4, 'two ranking lists with two rows each (' + fin.rank + ')');
ok(fin.ledger === 5, 'ledger lists every paid sale of the month, unpaid excluded (' + fin.ledger + ')');
ok(fin.months.length === 2, 'month picker offers the months that have money (' + fin.months.join(', ') + ')');

/* the last month keeps its own money */
const prevStats = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.months-pick .mp')].find(x => !x.classList.contains('is-now'));
  b.click(); return b.textContent.trim();
});
await wait(900);
const prevNow = await page.evaluate(() => ({
  hero: document.querySelector('.stats .stat .value')?.textContent.trim(),
  pl: [...document.querySelectorAll('.tbl--pl tr')].map(r => r.children[0].querySelector('.td-main').textContent.trim() + '=' + r.children[1].textContent.trim())
}));
ok(prevNow.pl.includes('Revenue=$165.00'), 'switching month shows that month only (Oct: 90 order + 75 sale = $165.00)');
ok(prevNow.pl.includes('Fixed costs=-$120.00'), 'fixed costs apply to every month');
await page.evaluate(() => {
  const want = new Date().toISOString().slice(0, 7);
  const btn = [...document.querySelectorAll('.months-pick .mp')].find(b => b.getAttribute('data-ym') === want);
  if (btn) btn.click();
});
await wait(900);

/* ---------- 3. monthly costs are editable ---------- */
await page.click('[data-act="fin-settings"]');
await wait(400);
ok(await page.$('#f-fincost'), 'monthly costs open in a sheet');
await page.fill('#f-fincost input[name=rent]', '250');
await page.click('[data-act="fin-settings-save"]');
await wait(900);
const afterRent = await page.evaluate(() => [...document.querySelectorAll('.tbl--pl tr')].map(r => r.children[0].querySelector('.td-main').textContent.trim() + '=' + r.children[1].textContent.trim()));
ok(afterRent.includes('Fixed costs=-$250.00'), 'saving a new rent moves the fixed cost line');
ok(afterRent.includes('Net profit=-$111.40'), 'and moves the net with it (296 - 35.40 - 122 - 250 = -111.40)');
const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('makuru_simple_v1')).settings.rent);
ok(persisted === 250, 'the rent is saved with everything else, so it syncs');

/* ---------- 4. a cost per pack can be added later ---------- */
await page.evaluate(() => { location.hash = '#/stock'; });
await wait(900);
await page.click('[data-act="product-modal"][data-id="p2"]');
await wait(400);
ok(await page.$('#f-product input[name=cost]'), 'the product sheet has cost per pack and cooking time');
await page.fill('#f-product input[name=cost]', '7');
await page.click('[data-act="product-save"]');
await wait(900);
await page.evaluate(() => { location.hash = '#/finance'; });
await wait(1000);
const afterCost = await page.evaluate(() => [...document.querySelectorAll('.tbl--pl tr')].map(r => r.children[0].querySelector('.td-main').textContent.trim() + '=' + r.children[1].textContent.trim()));
ok(afterCost.includes('Food cost=-$124.00'), 'raising a cost per pack re-prices the food cost (6.50 -> 7 on 4 packs = +2.00)');

/* ---------- 5. the CSV ---------- */
const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
await page.click('[data-act="fin-csv"]');
await wait(250);
const dm = await page.evaluate(() => document.querySelector('.toast')?.textContent.trim());
const download = await dl;
ok(dm === 'CSV ready', 'the CSV button answers (' + dm + ')');
if (download) {
  const fs = await import('node:fs/promises');
  const p = await download.path();
  const txt = await fs.readFile(p, 'utf8');
  ok(download.suggestedFilename() === 'makuru-' + ym + '.csv', 'file is named for the month (' + download.suggestedFilename() + ')');
  ok(/revenue,296\.00/.test(txt), 'CSV starts with the month recap');
  ok(/net,-113\.40/.test(txt), 'CSV net matches the page (296 - 35.40 - 124 - 250)');
  ok(/ORD-002,Adi Putra,Dimsum Mentai,4,60\.00/.test(txt), 'CSV has one row per order item');
  ok(/shop sale,,Campsie Asian Grocer,Dimsum Mentai,6,90\.00/.test(txt), 'CSV has the shop sales');
} else ok(false, 'CSV download fired');

/* ---------- 6. a phone ---------- */
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', e => errs.push('m:' + e.message));
m.on('console', x => { if (x.type() === 'error') errs.push('m:' + x.text()); });
await m.addInitScript(s => localStorage.setItem('makuru_simple_v1', JSON.stringify(s)), seed);
await m.goto(U);
await wait(500);
await m.click('[data-act="enter"]');
await wait(900);
await m.evaluate(() => { location.hash = '#/finance'; });
await wait(1000);
const mfin = await m.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  hero: getComputedStyle(document.querySelector('.hero-month') || document.body).display,
  ledgerCards: getComputedStyle(document.querySelector('.tbl--ledger tbody tr')).display,
  ledgerAmountVisible: (() => { const c = document.querySelector('.tbl--ledger tbody tr td:nth-child(5)'); const r = c.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1; })(),
  bars: document.querySelectorAll('.bar-col').length,
  valueHidden: getComputedStyle(document.querySelector('.bar-val')).display
}));
ok(mfin.overflow === 0, 'no sideways scroll on a phone (' + mfin.overflow + ')');
ok(mfin.ledgerCards === 'grid', 'the ledger becomes cards on a phone');
ok(mfin.ledgerAmountVisible, 'the amount column is on screen, not cut off');
ok(mfin.bars === 6, 'the month bars survive the small screen');
await m.screenshot({ path: 'shots-finance/m-01-finance.png', fullPage: true });
await m.evaluate(() => { location.hash = '#/dashboard'; });
await wait(900);
await m.screenshot({ path: 'shots-finance/m-02-home.png', fullPage: true });
await page.screenshot({ path: 'shots-finance/d-01-finance.png', fullPage: true });
await page.evaluate(() => { location.hash = '#/dashboard'; });
await wait(900);
await page.screenshot({ path: 'shots-finance/d-02-home.png', fullPage: true });

ok(errs.length === 0, 'no console or page errors ' + JSON.stringify(errs.slice(0, 3)));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
await browser.close();
process.exit(fail ? 1 : 0);
