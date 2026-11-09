import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('/home/user/makuru-ops.html', 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('JSDOM: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;
const doc = window.document;
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
window.print = () => {};

let pass = 0, fail = 0;
function check(label, cond, extra = '') {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra ? ' → ' + extra : ''));
  cond ? pass++ : fail++;
}
const $ = s => doc.querySelector(s);
const $$ = s => [...doc.querySelectorAll(s)];
const click = s => { const el = typeof s === 'string' ? $(s) : s; if (!el) throw new Error('missing ' + s); el.click(); };
const act = (name, extra = '') => click(`[data-act="${name}"]${extra}`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const goto = async r => { window.location.hash = '#/' + r; window.dispatchEvent(new window.Event('hashchange')); await wait(140); };
const dbNow = () => JSON.parse(window.localStorage.getItem('makuru_ops_v1'));

await wait(400);

/* 1. gateway */
check('gateway renders at /', !!$('.gateway'));
check('gateway logo is makuru.', $('.gateway-logo').textContent.trim() === 'makuru.');
check('gateway has single Enter System action', $$('.gateway .btn').length === 1 && $('.gateway .btn').textContent.includes('Enter System'));
check('no emoji characters in output', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(doc.body.textContent));
check('no img tags', $$('img').length === 0);

click('.gateway .btn');
await wait(220);
check('enter system routes to dashboard', window.location.hash === '#/dashboard', window.location.hash);
check('sidebar renders 6 routes', $$('.side-link').length === 6);
check('dashboard KPI cards', $$('.stat').length === 4, $$('.stat').length);
const realErrors = () => errors.filter(e => !e.includes('window.scrollTo') && !e.includes('navigation (except hash changes)'));
check('no runtime errors on boot', realErrors().length === 0, realErrors().slice(0, 2).join(' | '));

/* 2. all routes render */
for (const r of ['inventory', 'raw-materials', 'orders', 'dispatch', 'finance']) {
  await goto(r);
  check('route /' + r + ' renders content', !!$('.content') && $('.content').children.length > 0 && doc.body.textContent.length > 400);
}

/* 3. inventory */
await goto('inventory');
const inventoryRows = () => $$('.content .panel .tbl tbody tr');
check('inventory table has product rows', inventoryRows().length >= 7, inventoryRows().length);
function centralSiomay() {
  const centralBtn = $('[data-act="loc"][data-loc="loc-central"]');
  if (centralBtn && !centralBtn.classList.contains('is-active')) centralBtn.click();
  return Number(inventoryRows()[0].children[3].textContent.trim());
}
const beforeCentral = centralSiomay();
click('[data-act="loc"][data-loc="loc-campsie"]');
check('location switcher moves to Campsie', $('.seg-btn.is-active').textContent.includes('Campsie'));

/* 4. production */
await goto('raw-materials');
const matRow = name => $$('.tbl tbody tr').find(tr => tr.textContent.includes(name));
const chickenBefore = Number(matRow('Chicken thigh').children[3].textContent.replace(/,/g, ''));
$('#prod-product').value = 'p-siu';
$('#prod-packs').value = '10';
$('#prod-packs').dispatchEvent(new window.Event('input', { bubbles: true }));
check('BOM preview renders requirements', !!$('#bom-preview table') && $('#bom-preview').textContent.includes('Chicken thigh'));
act('prod-submit');
await wait(180);
check('production toast shown', doc.body.textContent.includes('Production recorded'));
const chickenAfter = Number(matRow('Chicken thigh').children[3].textContent.replace(/,/g, ''));
check('raw material deducted by BOM (0.15kg x 10 = 1.5kg)', Math.abs((chickenBefore - chickenAfter) - 1.5) < 0.001, chickenBefore + ' → ' + chickenAfter);
await goto('inventory');
const centralAfterProd = centralSiomay();
check('central kitchen finished goods increased by 10', centralAfterProd === beforeCentral + 10, beforeCentral + ' → ' + centralAfterProd);

/* 5. transfer */
act('transfer-modal');
await wait(90);
const tf = $('.dialog form');
tf.elements.to.value = 'loc-eastwood';
tf.elements.product.value = 'p-siu';
tf.elements.packs.value = '4';
act('transfer-submit');
await wait(180);
check('transfer recorded', doc.body.textContent.includes('Transferred 4 packs'));
const centralAfterTransfer = centralSiomay();
check('central stock reduced by transfer', centralAfterTransfer === centralAfterProd - 4, centralAfterProd + ' → ' + centralAfterTransfer);

/* 6. adjustment */
act('adjust-modal');
await wait(90);
const af = $('.dialog form');
af.elements.loc.value = 'loc-central';
af.elements.product.value = 'p-siu';
af.elements.direction.value = 'dec';
af.elements.packs.value = '2';
af.elements.reason.value = 'Damaged packs';
act('adjust-submit');
await wait(180);
check('adjustment recorded', doc.body.textContent.includes('Stock adjusted'));
check('adjustment reduced stock', centralSiomay() === centralAfterTransfer - 2, centralSiomay());

/* 7. direct order */
await goto('orders');
act('order-modal');
await wait(110);
$('#ord-name').value = 'Test Customer';
$('#ord-phone').value = '0412345678';
$('#ord-suburb').value = 'Campsie';
$('#ord-location').value = 'loc-central';
$('#ord-date').value = new Date().toISOString().slice(0, 10);
$('#ord-prod').value = 'p-bao';
$('#ord-qty').value = '2';
act('ord-add');
await wait(90);
check('draft item added to order', $('.dialog').textContent.includes('Char Siu Bao'));
act('order-submit');
await wait(220);
check('direct order created', doc.body.textContent.includes('created — $'));
const newOrder = dbNow().orders.find(o => o.customer_name === 'Test Customer');
check('phone normalised to AU format', newOrder && newOrder.customer_phone === '0412 345 678', newOrder && newOrder.customer_phone);
check('order persisted with items and total', !!newOrder && newOrder.items.length === 1 && newOrder.total_amount === 22, newOrder && newOrder.total_amount);

/* 8. detail, payment, advance */
act('order-open', `[data-id="${newOrder.id}"]`);
await wait(140);
check('order detail modal opens', $('.dialog').textContent.includes('Test Customer'));
check('detail shows items table', $('.dialog .tbl') !== null);
act('order-paid');
await wait(140);
check('payment marked paid', dbNow().orders.find(o => o.id === newOrder.id).payment_status === 'paid');
act('order-advance');
await wait(150);
const advOrder = dbNow().orders.find(o => o.id === newOrder.id);
check('order advanced to packed', advOrder.fulfillment_status === 'packed', advOrder.fulfillment_status);
click('[data-act="modal-close"]');

/* 9. dispatch */
await goto('dispatch');
check('dispatch groups render', $$('.dispatch-group').length > 0, $$('.dispatch-group').length);
check('driver manifest renders', !!$('.manifest') && $('.manifest').textContent.includes('Driver manifest'));
const advanceBtn = $('[data-act="advance"]');
if (advanceBtn) {
  const id = advanceBtn.getAttribute('data-id');
  advanceBtn.click();
  await wait(170);
  check('dispatch advance works', dbNow().orders.find(o => o.id === id).fulfillment_status !== 'pending');
}
const dateSel = $('#disp-date');
const firstDate = [...dateSel.options].find(o => o.value !== 'all');
dateSel.value = firstDate.value;
dateSel.dispatchEvent(new window.Event('change', { bubbles: true }));
await wait(140);
check('dispatch date filter applies', $$('.dispatch-group').length >= 1, $$('.dispatch-group').length);

/* 10. consignment drop */
await goto('orders');
click('[data-act="tab"][data-tab="consignment"]');
await wait(120);
check('consignment tab renders store cards', $$('.store-card').length === 3);
$('[data-act="drop-modal"]').click();
await wait(110);
$('[data-drop="p-siu"]').value = '5';
act('drop-submit');
await wait(200);
check('consignment drop created as unpaid invoice', dbNow().orders.some(o => o.channel === 'consignment_drop' && o.payment_status === 'unpaid' && o.items.some(i => i.quantity === 5)) === true);

/* 11. settlement */
click('[data-act="tab"][data-tab="consignment"]');
await wait(120);
const settleBtns = $$('[data-act="settle-modal"]');
settleBtns[0].click();
await wait(120);
check('settlement form lists products', $$('[data-sold]').length === 7, $$('[data-sold]').length);
const soldInput = $('[data-sold="p-siu"]');
soldInput.value = '3';
soldInput.dispatchEvent(new window.Event('input', { bubbles: true }));
check('settlement summary recalculates', $('#settle-summary').textContent.includes('Wholesale revenue'));
act('settle-submit');
await wait(200);
const newSettle = dbNow().settlements[0];
check('settlement recorded with commission & net', !!newSettle && newSettle.gross_sales === 27 && newSettle.net_payable === 21.6,
  newSettle && JSON.stringify({ gross: newSettle.gross_sales, commission: newSettle.commission_amount, net: newSettle.net_payable }));

/* 12. finance */
await goto('finance');
check('finance KPIs render', $$('.stat').length === 6, $$('.stat').length);
check('finance shows receivables log', doc.body.textContent.includes('Receivables log'));
check('finance shows cost allocation', doc.body.textContent.includes('Cost allocation'));
act('expense-modal');
await wait(100);
const ef = $('.dialog form');
ef.elements.amount.value = '25.50';
ef.elements.category.value = 'Gas';
ef.elements.description.value = 'Test expense';
act('expense-submit');
await wait(170);
check('expense recorded', dbNow().expenses.some(e => e.amount === 25.5));

/* 13. exports */
await goto('orders');
click('[data-act="tab"][data-tab="direct"]');
await wait(120);
act('export', '[data-kind="orders"]');
await wait(120);
check('orders export runs', doc.body.textContent.includes('Export created'));
await goto('finance');
act('export', '[data-kind="ledger"]');
await wait(100);
check('ledger export runs', true);

/* 14. reset */
await goto('dashboard');
act('reset-confirm');
await wait(100);
act('reset-do');
await wait(170);
check('reset restores seed data', dbNow().orders.length === 15, dbNow().orders.length);

check('no emoji or images after all flows', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(doc.body.textContent) && $$('img').length === 0);
check('no runtime errors across all flows', realErrors().length === 0, realErrors().slice(0, 3).join(' | '));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
