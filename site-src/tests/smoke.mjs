import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('JSDOM: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;
const doc = window.document;
await new Promise(r => setTimeout(r, 600));

function check(label, cond, extra = '') {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra ? ' → ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

check('no runtime errors', errors.length === 0, errors.slice(0,3).join(' | '));
check('menu cards rendered', doc.querySelectorAll('#menuGrid .card').length === 8, doc.querySelectorAll('#menuGrid .card').length);
check('category pills', doc.querySelectorAll('#filters .pill').length === 6);
check('stockists', doc.querySelectorAll('#stockistGrid .stockist').length === 4);
check('kpi cards', doc.querySelectorAll('#kpiGrid .kpi').length === 4);
check('order rows (seed)', doc.querySelectorAll('#ordersBody tr').length >= 15, doc.querySelectorAll('#ordersBody tr').length);
check('pipeline stages', doc.querySelectorAll('#pipelineHost .pl-stage').length === 6);
check('chart svg', !!doc.querySelector('#chartHost svg.chart'));
check('batch tiles', doc.querySelectorAll('#batchGrid .batch-tile').length === 3);
check('countdown filled', doc.querySelector('#bigCountdown b').textContent !== '--');
const count0 = doc.querySelector('#cartCount').textContent;

// add to cart
doc.querySelector('[data-add="siomay"]').click();
check('cart badge increments', doc.querySelector('#cartCount').textContent === String(Number(count0)+1), doc.querySelector('#cartCount').textContent);
check('cart line rendered', doc.querySelectorAll('#cartBody .cart-line').length === 1);
check('added state on card', !!doc.querySelector('[data-add="siomay"].is-added'));

// qty +
doc.querySelector('[data-qty="inc"]').click();
check('qty stepper works', doc.querySelector('#cartBody .qty b').textContent === '2');

// open checkout
doc.querySelector('#checkoutBtn').click();
check('checkout modal opens', doc.querySelector('#checkoutModal').classList.contains('is-open'));
const form = doc.querySelector('#coForm');
form.elements.name.value = 'Test Buyer';
form.elements.phone.value = '0412 345 678';
form.elements.email.value = 'test@example.com';
doc.querySelector('[data-co-outlet="mel"]').click();
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 100));
check('success screen shown', !!doc.querySelector('.success .order-code'), doc.querySelector('.order-code')?.textContent);
check('orders count increased', doc.querySelectorAll('#ordersBody tr').length >= 20, doc.querySelectorAll('#ordersBody tr').length);

// dashboard nav
doc.querySelector('#openDashBtn').click();
check('dashboard visible', !doc.querySelector('#dashboard').hidden && doc.querySelector('#storefront').hidden);
check('dash view overview active', doc.querySelector('[data-view-panel="overview"]').classList.contains('is-active'));
const firstRow = doc.querySelector('#ordersBody tr');
const firstId = firstRow.getAttribute('data-order');
// go to orders view and open row
doc.querySelector('.dash-nav button[data-view="orders"]').click();
doc.querySelector('#ordersBody tr').click();
check('order sheet opens', doc.querySelector('#orderSheet').classList.contains('is-open'), doc.querySelector('#sheetTitle').textContent);
check('timeline items', doc.querySelectorAll('#sheetBody .tl-item').length >= 6);
check('sheet action button', !!doc.querySelector('#sheetFoot [data-advance]'));
// advance status
const statusBefore = doc.querySelector('#sheetSub').textContent;
doc.querySelector('#sheetFoot [data-advance]').click();
await new Promise(r => setTimeout(r, 60));
check('status advanced', doc.querySelector('#sheetSub').textContent !== statusBefore, doc.querySelector('#sheetSub').textContent.slice(0,60));

// filters
const outletSel = doc.querySelector('#filterOutlet');
outletSel.value = 'syd';
outletSel.dispatchEvent(new window.Event('change'));
const rows = doc.querySelectorAll('#ordersBody tr').length;
check('outlet filter applies', rows > 0 && rows < 16, rows + ' rows');
// lang toggle
doc.querySelector('[data-lang="en"]').click();
check('lang switches to EN', doc.querySelector('#cartBtn') === null && doc.body.textContent.includes('Order Now'));
check('lang back to ID', (doc.querySelector('[data-lang="id"]').click(), doc.body.textContent.includes('Pesan Sekarang')));

// persistence check via localStorage
const stored = JSON.parse(window.localStorage.getItem('makuru_orders_v2') || '[]');
check('orders persisted', stored.length >= 20, stored.length);
const realErrors = errors.filter(e => !e.includes('window.scrollTo'));
check('no runtime errors after interactions', realErrors.length === 0, realErrors.slice(0,3).join(' | '));
console.log('\\nlocalStorage orders:', stored.length, '| final errors:', realErrors.length);
window.close();
process.exit(process.exitCode || 0);
