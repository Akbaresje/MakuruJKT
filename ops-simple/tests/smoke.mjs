import { JSDOM } from 'jsdom';
import fs from 'node:fs';
const html = fs.readFileSync('/home/user/makuru-ops.html', 'utf8');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom; const { document } = window;
window.scrollTo = () => {};
dom.virtualConsole.on('jsdomError', e => errors.push(String(e.message || e)));
window.addEventListener('error', e => errors.push(e.message));
const wait = (ms = 30) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const q = s => document.querySelector(s);
const click = s => { const el = typeof s === 'string' ? q(s) : s; if (!el) throw new Error('missing ' + s); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };
const set = (sel, v) => { const el = q(sel); el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); el.dispatchEvent(new window.Event('change', { bubbles: true })); };
const text = () => document.body.textContent;
const nav = async r => { window.location.hash = r; await wait(50); };

await wait(50);
ok(q('.gateway') && q('[data-act="enter"]'), 'gateway shows with Enter button');
ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerHTML) && !q('img'), 'no emoji, no images');
click('[data-act="enter"]'); await wait(60);
ok(window.location.hash === '#/dashboard', 'enter goes to dashboard');
ok(/Get started/.test(text()), 'dashboard shows empty state (data starts at 0)');
ok(/Belmore/.test(text()), 'kitchen is Belmore NSW');

// product
await nav('#/stock');
click('[data-act="product-modal"]'); await wait();
set('#f-product [name=name]', 'Siomay Ayam'); set('#f-product [name=price]', '12'); set('#f-product [name=kitchen]', '20');
click('[data-act="product-save"]'); await wait();
ok(/Siomay Ayam/.test(text()) && /20/.test(text()), 'product added with 20 packs');
// add packs
click('[data-act="packs-modal"][data-mode="add"]'); await wait(); set('#f-packs [name=qty]', '10'); click('[data-act="packs-save"]'); await wait();
const db = () => JSON.parse(window.localStorage.getItem('makuru_simple_v1'));
ok(db().products[0].kitchen === 30, 'add packs -> 30');
click('[data-act="packs-modal"][data-mode="remove"]'); await wait(); set('#f-packs [name=qty]', '99'); click('[data-act="packs-save"]'); await wait();
ok(db().products[0].kitchen === 30 && q('#modal'), 'remove more than stock is blocked');
set('#f-packs [name=qty]', '5'); click('[data-act="packs-save"]'); await wait();
ok(db().products[0].kitchen === 25, 'remove packs -> 25');
ok(q('[data-act="send-modal"]').disabled, 'send disabled with no shops');

// material
await nav('#/materials');
click('[data-act="material-modal"]'); await wait();
set('#f-material [name=name]', 'Chicken mince'); set('#f-material [name=min]', '5'); set('#f-material [name=qty]', '4');
click('[data-act="material-save"]'); await wait();
ok(db().materials[0].qty === 4 && /Low/.test(text()), 'material added and shows Low');
click('[data-act="mat-qty-modal"][data-mode="add"]'); await wait(); set('#f-matqty [name=qty]', '6'); click('[data-act="matqty-save"]'); await wait();
ok(db().materials[0].qty === 10 && /OK/.test(text()), 'add material -> 10, OK');
click('[data-act="mat-qty-modal"][data-mode="use"]'); await wait(); set('#f-matqty [name=qty]', '2.5'); click('[data-act="matqty-save"]'); await wait();
ok(db().materials[0].qty === 7.5, 'use material -> 7.5');

// shop
await nav('#/shops');
click('[data-act="shop-modal"]'); await wait();
set('#f-shop [name=name]', 'Campsie Grocer'); set('#f-shop [name=suburb]', 'Campsie NSW'); set('#f-shop [name=commission]', '20');
click('[data-act="shop-save"]'); await wait();
ok(db().shops.length === 1, 'shop added');
await nav('#/stock');
click('[data-act="send-modal"]'); await wait(); set('#f-send [name=qty]', '10'); click('[data-act="send-save"]'); await wait();
const p0 = () => db().products[0];
ok(p0().kitchen === 15 && p0().shops[db().shops[0].id] === 10, 'send 10 packs to shop');
await nav('#/shops');
ok(/10/.test(text()) && /Campsie Grocer/.test(text()), 'shop page shows 10 packs');
click('[data-act="sold-modal"]'); await wait(); set('#f-sold [name=qty]', '4'); click('[data-act="sold-save"]'); await wait();
ok(p0().shops[db().shops[0].id] === 6 && db().sales[0].amount === 48, 'sold 4 -> 6 left, sale $48');
click('[data-act="back-modal"]'); await wait(); set('#f-back [name=qty]', '2'); click('[data-act="back-save"]'); await wait();
ok(p0().shops[db().shops[0].id] === 4 && p0().kitchen === 17, 'take back 2 -> kitchen 17');
click('[data-act="sale-del-ask"]'); await wait(); click('[data-act="sale-del"]'); await wait();
ok(db().sales.length === 0 && p0().shops[db().shops[0].id] === 8, 'delete sale restores shop packs');

// order
await nav('#/orders');
click('[data-act="order-modal"]'); await wait();
set('#f-order [name=customer]', 'Mei Tan'); set('#f-order [name=phone]', '0412345678'); set('#f-order [name=suburb]', 'Lakemba');
click('[data-act="item-add"]'); await wait();
const rows = document.querySelectorAll('.order-item'); rows[0].querySelector('input').value = 3; rows[1].querySelector('input').value = 2;
rows[1].querySelector('input').dispatchEvent(new window.Event('input', { bubbles: true }));
ok(q('#order-total').textContent === '$60.00', 'order total live = $60');
click('[data-act="order-save"]'); await wait();
ok(db().orders.length === 1 && db().orders[0].ref === 'ORD-001' && db().orders[0].total === 60 && p0().kitchen === 12, 'order saved, 5 packs out of kitchen');
ok(/0412 345 678/.test(text()), 'phone shown as 04xx xxx xxx');
click('[data-act="order-modal"]'); await wait(); q('.order-item input').value = 50; click('[data-act="order-save"]'); await wait();
ok(db().orders.length === 1 && q('#modal'), 'order blocked when not enough stock'); click('[data-act="close"]'); await wait();
click('[data-act="paid-modal"]'); await wait(); click('[data-act="paid-save"]'); await wait();
ok(db().orders[0].paid && /PayID/.test(text()), 'order marked paid');
click('[data-act="order-deliver"]'); await wait();
ok(db().orders[0].status === 'delivered', 'order delivered');
click('[data-act="order-filter"][data-f="done"]'); await wait();
ok(/ORD-001/.test(text()), 'delivered filter shows order');
click('[data-act="order-del-ask"]'); await wait(); click('[data-act="order-del"]'); await wait();
ok(db().orders.length === 0, 'order deleted');

// deletes
await nav('#/materials'); click('[data-act="material-del-ask"]'); await wait(); click('[data-act="material-del"]'); await wait();
ok(db().materials.length === 0, 'material deleted');
await nav('#/shops'); click('[data-act="shop-del-ask"]'); await wait(); click('[data-act="shop-del"]'); await wait();
ok(db().shops.length === 0 && p0().kitchen === 20, 'shop deleted, packs back to kitchen');
await nav('#/stock'); click('[data-act="product-del-ask"]'); await wait(); click('[data-act="product-del"]'); await wait();
ok(db().products.length === 0, 'product deleted');
click('[data-act="clear-ask"]'); await wait(); click('[data-act="clear-do"]'); await wait();
ok(/Get started/.test(text()), 'clear all data works');
ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerHTML) && !q('img'), 'still no emoji / images');
ok(errors.length === 0, 'no runtime errors ' + JSON.stringify(errors.slice(0, 3)));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
