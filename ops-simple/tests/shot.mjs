import { chromium } from 'playwright-core';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errs = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(8000);
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const U = 'file:///home/user/makuru-ops.html';
await page.goto(U); await page.waitForTimeout(2400);
await page.screenshot({ path: 'shots-ops/s01-gateway.png' });
await page.click('[data-act="enter"]'); await page.waitForTimeout(900);
await page.screenshot({ path: 'shots-ops/s02-home-empty.png' });
// seed via localStorage to a realistic state
await page.evaluate(() => {
  const db = { products: [
    { id: 'p1', name: 'Siomay Ayam', pack_size: '6 pcs', price: 12, kitchen: 24, shops: { s1: 10, s2: 6 } },
    { id: 'p2', name: 'Hakau Udang', pack_size: '6 pcs', price: 14, kitchen: 4, shops: { s1: 8 } },
    { id: 'p3', name: 'Bakpao Char Siu', pack_size: '3 pcs', price: 11, kitchen: 0, shops: {} } ],
    materials: [ { id: 'm1', name: 'Chicken mince', unit: 'kg', qty: 6.5, min: 5 }, { id: 'm2', name: 'Prawn', unit: 'kg', qty: 1.2, min: 3 }, { id: 'm3', name: 'Wrappers', unit: 'pack', qty: 18, min: 10 }, { id: 'm4', name: 'Vacuum bags', unit: 'pcs', qty: 320, min: 100 } ],
    shops: [ { id: 's1', name: 'Campsie Asian Grocer', suburb: 'Campsie NSW', phone: '0412345678', commission: 20 }, { id: 's2', name: 'Lakemba Mart', suburb: 'Lakemba NSW', phone: '', commission: 15 } ],
    orders: [ { id: 'o1', ref: 'ORD-001', customer: 'Mei Tan', phone: '0412345678', suburb: 'Belmore', date: '2026-11-07', items: [{ product_id: 'p1', name: 'Siomay Ayam', qty: 3, price: 12 }, { product_id: 'p2', name: 'Hakau Udang', qty: 1, price: 14 }], packs: 4, total: 50, paid: true, pay: 'PayID', status: 'open', note: '' },
      { id: 'o2', ref: 'ORD-002', customer: 'Daniel Okafor', phone: '0466903512', suburb: 'Pickup', date: '2026-11-08', items: [{ product_id: 'p1', name: 'Siomay Ayam', qty: 5, price: 12 }], packs: 5, total: 60, paid: false, pay: '', status: 'open', note: '' } ],
    sales: [ { id: 'x1', date: '2026-11-05', shop_id: 's1', shop_name: 'Campsie Asian Grocer', product_id: 'p1', product_name: 'Siomay Ayam', qty: 4, amount: 48 } ], seq: { order: 3 } };
  localStorage.setItem('makuru_simple_v1', JSON.stringify(db));
});
for (const [r, f] of [['dashboard', 's03-home'], ['stock', 's04-stock'], ['materials', 's05-materials'], ['shops', 's06-shops'], ['orders', 's07-orders']]) {
  await page.goto(U + '#/' + r); await page.reload(); await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots-ops/${f}.png`, fullPage: true });
}
await page.click('[data-act="order-modal"]'); await page.waitForTimeout(500);
await page.screenshot({ path: 'shots-ops/s08-order-modal.png' });
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', e => errs.push('m:' + e.message));
await m.goto(U + '#/stock'); await m.waitForTimeout(1200);
await m.screenshot({ path: 'shots-ops/s09-m-stock.png' });
await m.goto(U + '#/shops'); await m.waitForTimeout(1200);
await m.screenshot({ path: 'shots-ops/s10-m-shops.png' });
console.log('errors:', errs);
await browser.close();
