/* =========================================================
   Router, shell and actions
   ========================================================= */

var draft = { items: [] };

function currentRoute() {
  var h = String(location.hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
  if (!h) return 'gateway';
  for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === h) return h;
  return 'dashboard';
}
function routeMeta(id) {
  for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i];
  return ROUTES[0];
}
function viewFor(route) {
  if (route === 'inventory') return viewInventory();
  if (route === 'raw-materials') return viewRawMaterials();
  if (route === 'orders') return viewOrders();
  if (route === 'dispatch') return viewDispatch();
  if (route === 'finance') return viewFinance();
  return viewDashboard();
}

function gatewayView() {
  return '<div class="gateway">' +
    '<a class="gateway-logo" href="#/" aria-label="makuru.">makuru<span>.</span></a>' +
    '<button class="btn btn--primary btn--lg" data-act="enter"><span>Enter System</span>' + icon('arrowRight', 16) + '</button>' +
    '</div>';
}

function shell(route) {
  var meta = routeMeta(route);
  var nav = ROUTES.map(function (r) {
    return '<a class="side-link' + (r.id === route ? ' is-active' : '') + '" href="#/' + r.id + '">' +
      icon(r.icon, 17) + '<span>' + esc(r.label) + '</span></a>';
  }).join('');

  return '<div class="app">' +
    '<aside class="sidebar">' +
      '<div class="side-brand"><a class="side-logo" href="#/">makuru<span>.</span></a>' +
        '<span class="side-logo-sub">Operations</span></div>' +
      '<nav class="side-nav">' + nav + '</nav>' +
      '<div class="side-foot">' +
        '<div class="side-loc"><span class="side-loc-label">Active venue</span><b>Central Kitchen</b><span>Alexandria NSW 2015</span></div>' +
        '<div class="side-actions">' +
          '<a class="side-reset" href="#/">' + icon('logout', 14) + '<span>Exit to gateway</span></a>' +
          '<button class="side-reset" data-act="reset-confirm">' + icon('refresh', 14) + '<span>Reset data</span></button>' +
        '</div>' +
      '</div>' +
    '</aside>' +
    '<div class="main">' +
      '<header class="topbar">' +
        '<div class="topbar-left"><span class="topbar-crumb">makuru. ops</span><span class="topbar-sep">/</span><span class="topbar-page">' + esc(meta.label) + '</span></div>' +
        '<div class="topbar-right"><span class="topbar-chip">' + icon('calendar', 14) + '<span>' + dateLabel(todayISO(), 'weekday') + '</span></span>' +
        '<span class="topbar-chip topbar-chip--muted">AUD</span></div>' +
      '</header>' +
      '<main class="content">' + viewFor(route) + '</main>' +
    '</div>' +
  '</div>';
}

function render() {
  var route = currentRoute();
  var root = document.getElementById('root');
  if (route === 'gateway') {
    document.body.classList.add('is-gateway');
    root.innerHTML = gatewayView();
    document.title = 'makuru. — Operations';
  } else {
    document.body.classList.remove('is-gateway');
    root.innerHTML = shell(route);
    document.title = 'makuru. ops — ' + routeMeta(route).label;
    if (route === 'raw-materials') productionPreview();
  }
}

/* ---------------------------------------------------------
   Stock operations
--------------------------------------------------------- */
function doProduction(prodId, packs, note) {
  var p = product(prodId);
  if (!p || packs <= 0) return { ok: false, error: 'Invalid product or quantity' };
  var short = [];
  bomFor(prodId).forEach(function (b) {
    var req = b.qty * packs;
    if (req > Number(b.material.current_stock) + 1e-9) {
      short.push(b.material.name + ' (' + qtyFmt(b.material.current_stock) + ' ' + b.material.unit + ' on hand, ' + num(req, 3) + ' needed)');
    }
  });
  if (short.length) return { ok: false, error: 'Insufficient materials: ' + short.join('; ') };
  bomFor(prodId).forEach(function (b) {
    b.material.current_stock = Math.round((Number(b.material.current_stock) - b.qty * packs) * 1000) / 1000;
  });
  addStock(CENTRAL, prodId, packs);
  logMove('production', CENTRAL, prodId, packs, note || packs + ' packs produced');
  saveDB();
  return { ok: true, packs: packs };
}

function doTransfer(prodId, toLoc, packs, note) {
  if (packs <= 0) return { ok: false, error: 'Quantity must be greater than zero' };
  var available = stockAt(CENTRAL, prodId);
  if (packs > available) return { ok: false, error: 'Only ' + available + ' packs at Central Kitchen' };
  addStock(CENTRAL, prodId, -packs);
  addStock(toLoc, prodId, packs);
  logMove('transfer', CENTRAL, prodId, packs, note || 'Transfer to ' + locById(toLoc).name, toLoc);
  saveDB();
  return { ok: true };
}

function doAdjust(locId, prodId, delta, reason) {
  if (!delta) return { ok: false, error: 'Enter a non-zero quantity' };
  if (delta < 0 && Math.abs(delta) > stockAt(locId, prodId)) return { ok: false, error: 'Adjustment exceeds stock on hand' };
  addStock(locId, prodId, delta);
  logMove('adjustment', locId, prodId, delta, reason || 'Manual adjustment');
  saveDB();
  return { ok: true };
}

function doProcurement(p) {
  var m = material(p.material_id);
  if (!m) return { ok: false, error: 'Select a material' };
  if (!(p.quantity > 0)) return { ok: false, error: 'Quantity must be greater than zero' };
  var stock = Number(m.current_stock), cost = Number(m.cost_per_unit);
  var newStock = stock + p.quantity;
  m.cost_per_unit = newStock > 0 ? Math.round(((stock * cost + p.quantity * p.unit_cost) / newStock) * 100) / 100 : p.unit_cost;
  m.current_stock = Math.round(newStock * 1000) / 1000;
  db.procurement.unshift({ id: uid('proc'), purchase_date: p.purchase_date, supplier: p.supplier, material_id: p.material_id, quantity: p.quantity, unit_cost: p.unit_cost });
  logMove('procurement', CENTRAL, null, p.quantity, 'Received ' + qtyFmt(p.quantity) + ' ' + m.unit + ' from ' + p.supplier);
  saveDB();
  return { ok: true };
}

function returnOrderStock(o) {
  if (o.stock_returned) return;
  if (o.channel === 'consignment_drop') {
    o.items.forEach(function (i) {
      addStock(o.destination_location_id, i.product_id, -i.quantity);
      addStock(CENTRAL, i.product_id, i.quantity);
    });
  } else {
    o.items.forEach(function (i) { addStock(o.destination_location_id, i.product_id, i.quantity); });
  }
  o.stock_returned = true;
}

/* ---------------------------------------------------------
   Modals
--------------------------------------------------------- */
function productionModal() {
  modal({
    title: 'Record production intake',
    sub: 'Finished packs produced are added to Central Kitchen; raw materials are deducted by BOM.',
    body: '<form id="prod-modal-form" class="form-grid">' +
      '<div class="form-row form-row--3">' +
      field('Product', select('product_id', db.products.map(function (p) { return { value: p.id, label: p.name + ' (' + p.sku + ')' }; }), 'p-siu').replace('class="input"', 'class="input" id="mprod-product"')) +
      field('Packs produced', '<input class="input" id="mprod-packs" name="packs" type="number" min="1" step="1" value="12">') +
      field('Production date', '<input class="input" id="mprod-date" name="production_date" type="date" value="' + todayISO() + '">') +
      '</div>' +
      '<div class="panel-inner"><div class="panel-inner-head"><span>Material deduction preview</span></div><div id="mprod-preview"></div></div>' +
      '<div class="form-actions"><button class="btn btn--primary" data-act="prod-modal-submit">' + icon('check', 15) + '<span>Record intake</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button></div>' +
      '</form>',
    wide: true
  });
  modalProdPreview();
}
function modalProdPreview() {
  var pid = (document.getElementById('mprod-product') || {}).value;
  var packs = Number((document.getElementById('mprod-packs') || {}).value || 0);
  var host = document.getElementById('mprod-preview');
  if (!host) return;
  if (!pid || !packs) { host.innerHTML = '<div class="empty empty--inline">' + icon('flask', 18) + '<span>Enter a quantity to preview deductions.</span></div>'; return; }
  var rows = bomFor(pid).map(function (b) {
    var req = b.qty * packs, have = Number(b.material.current_stock), short = req > have + 1e-9;
    return '<tr' + (short ? ' class="row-short"' : '') + '><td>' + esc(b.material.name) + ' <span class="cell-sub">' + esc(b.material.unit) + '</span></td>' +
      '<td class="right num">' + num(req, 3) + '</td><td class="right num">' + num(have, 3) + '</td>' +
      '<td class="right">' + (short ? pill('Short', 'red') : pill('OK', 'green')) + '</td></tr>';
  }).join('');
  host.innerHTML = '<div class="tbl-wrap"><table class="tbl tbl--compact"><thead><tr><th>Material</th><th class="right">Required</th><th class="right">Available</th><th class="right">Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function transferModal() {
  modal({
    title: 'Transfer to partner store',
    sub: 'Deducts from Central Kitchen and increments the selected partner store.',
    body: '<form class="form-grid">' +
      '<div class="form-row form-row--2">' +
      field('From', '<input class="input" value="Central Kitchen" disabled>') +
      field('To store', select('to', stores().map(function (s) { return { value: s.id, label: s.name + ' — ' + s.suburb }; }), stores()[0].id)) +
      '</div>' +
      '<div class="form-row form-row--3">' +
      field('Product', select('product', db.products.map(function (p) { return { value: p.id, label: p.name + ' (' + p.sku + ')' }; }), 'p-siu')) +
      field('Packs', '<input class="input" name="packs" type="number" min="1" step="1" value="6">') +
      field('Dispatch date', '<input class="input" name="date" type="date" value="' + todayISO() + '">') +
      '</div>' +
      field('Note (optional)', '<input class="input" name="note" placeholder="Consignment drop reference">') +
      '<div class="form-actions"><button class="btn btn--primary" data-act="transfer-submit">' + icon('transfer', 15) + '<span>Transfer stock</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button></div></form>'
  });
}

function adjustModal(locId, prodId) {
  var locs = db.locations.map(function (l) { return { value: l.id, label: l.name }; });
  modal({
    title: 'Manual stock adjustment',
    sub: 'Use for shrinkage, damaged packs or stock count corrections.',
    body: '<form class="form-grid">' +
      '<div class="form-row form-row--2">' +
      field('Location', select('loc', locs, locId || ui.loc)) +
      field('Product', select('product', db.products.map(function (p) { return { value: p.id, label: p.name + ' (' + p.sku + ')' }; }), prodId || 'p-siu')) +
      '</div>' +
      '<div class="form-row form-row--2">' +
      field('Adjustment type', select('direction', [{ value: 'dec', label: 'Decrease (write-off)' }, { value: 'inc', label: 'Increase (count correction)' }], 'dec')) +
      field('Packs', '<input class="input" name="packs" type="number" min="1" step="1" value="1">') +
      '</div>' +
      field('Reason', '<input class="input" name="reason" placeholder="Damaged in transit / stock count">') +
      '<div class="form-actions"><button class="btn btn--primary" data-act="adjust-submit">' + icon('scale', 15) + '<span>Apply adjustment</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button></div></form>'
  });
}

function procureModal() {
  modal({
    title: 'Record procurement',
    sub: 'Increases material stock and recalculates weighted average unit cost.',
    body: '<form class="form-grid">' +
      '<div class="form-row form-row--2">' +
      field('Purchase date', '<input class="input" name="date" type="date" value="' + todayISO() + '">') +
      field('Supplier', '<input class="input" name="supplier" placeholder="Flemington Wholesale">') +
      '</div>' +
      '<div class="form-row form-row--3">' +
      field('Material', select('material', db.materials.map(function (m) { return { value: m.id, label: m.name + ' (' + m.unit + ')' }; }), 'm-chicken')) +
      field('Quantity', '<input class="input" name="quantity" type="number" min="0.01" step="0.01" value="10">') +
      field('Unit cost (AUD)', '<input class="input" name="unit_cost" type="number" min="0" step="0.01" value="11.90">') +
      '</div>' +
      '<div class="form-actions"><button class="btn btn--primary" data-act="procure-submit">' + icon('plus', 15) + '<span>Add stock</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button></div></form>'
  });
}

function expenseModal() {
  modal({
    title: 'Add operating expense',
    body: '<form class="form-grid">' +
      '<div class="form-row form-row--2">' +
      field('Date', '<input class="input" name="date" type="date" value="' + todayISO() + '">') +
      field('Category', select('category', ['Delivery fuel', 'Gas', 'Kitchen consumables', 'Packaging', 'Equipment', 'Other'].map(function (c) { return { value: c, label: c }; }), 'Delivery fuel')) +
      '</div>' +
      field('Description', '<input class="input" name="description" placeholder="Van refuel — delivery run">') +
      field('Amount (AUD)', '<input class="input" name="amount" type="number" min="0.01" step="0.01" value="50.00">') +
      '<div class="form-actions"><button class="btn btn--primary" data-act="expense-submit">' + icon('check', 15) + '<span>Save expense</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button></div></form>'
  });
}

/* ---------- direct order ---------- */
function orderModal() {
  draft = { items: [] };
  renderOrderModal();
}
function captureOrderForm() {
  var g = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
  draft.name = g('ord-name') || draft.name || '';
  draft.phone = g('ord-phone') || draft.phone || '';
  draft.location = g('ord-location') || draft.location || CENTRAL;
  draft.suburb = g('ord-suburb') || draft.suburb || '';
  draft.date = g('ord-date') || draft.date || todayISO();
  draft.method = g('ord-method') || draft.method || 'payid';
  draft.pay = g('ord-pay') || draft.pay || 'unpaid';
}
function orderDraftTotal() {
  return draft.items.reduce(function (s, i) {
    var p = product(i.product_id);
    return s + (p ? p.retail_price * i.qty : 0);
  }, 0);
}
function renderOrderModal() {
  var itemRows = draft.items.map(function (i, idx) {
    var p = product(i.product_id);
    return '<tr><td><span class="cell-strong">' + esc(p.name) + '</span><div class="cell-sub mono">' + esc(p.sku) + '</div></td>' +
      '<td class="right num">' + i.qty + '</td>' +
      '<td class="right num">' + money(p.retail_price * i.qty) + '</td>' +
      '<td class="right"><button class="link-btn link-btn--danger" data-act="ord-remove" data-idx="' + idx + '">Remove</button></td></tr>';
  }).join('');

  var body = '<div class="form-row form-row--2">' +
    field('Customer name', '<input class="input" id="ord-name" value="' + esc(draft.name || '') + '" placeholder="Mei Lin Tan">') +
    field('Contact number', '<input class="input" id="ord-phone" value="' + esc(draft.phone || '') + '" placeholder="0412 345 678">') +
    '</div>' +
    '<div class="form-row form-row--3">' +
    field('Delivery / pickup location', select('loc', db.locations.map(function (l) { return { value: l.id, label: l.name + (l.type === 'central' ? ' (pickup)' : '') }; }), draft.location).replace('class="input"', 'class="input" id="ord-location"')) +
    field('Suburb', '<input class="input" id="ord-suburb" value="' + esc(draft.suburb || '') + '" placeholder="Campsie">') +
    field('Delivery date', '<input class="input" id="ord-date" type="date" value="' + (draft.date || todayISO()) + '">') +
    '</div>' +
    '<div class="form-row form-row--2">' +
    field('Payment method', select('method', [{ value: 'payid', label: 'PayID' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'cash', label: 'Cash on delivery' }], draft.method).replace('class="input"', 'class="input" id="ord-method"')) +
    field('Payment status', select('pay', [{ value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }], draft.pay).replace('class="input"', 'class="input" id="ord-pay"')) +
    '</div>' +
    '<div class="panel-inner"><div class="panel-inner-head"><span>Items</span></div>' +
    '<div class="add-item-row">' + select('prod', db.products.map(function (p) { return { value: p.id, label: p.name + ' — ' + money(p.retail_price) }; }), 'p-siu').replace('class="input"', 'class="input" id="ord-prod"') +
    '<input class="input input--qty" id="ord-qty" type="number" min="1" step="1" value="1">' +
    '<button class="btn btn--secondary btn--sm" data-act="ord-add">' + icon('plus', 14) + '<span>Add item</span></button></div>' +
    '<div class="tbl-wrap"><table class="tbl tbl--compact"><thead><tr><th>Product</th><th class="right">Packs</th><th class="right">Amount</th><th></th></tr></thead><tbody>' +
    (itemRows || '<tr><td colspan="4"><div class="empty empty--inline">' + icon('receipt', 16) + '<span>No items added</span></div></td></tr>') +
    '</tbody><tfoot><tr><td>Order total</td><td class="right num">' + draft.items.reduce(function (s, i) { return s + i.qty; }, 0) + '</td>' +
    '<td class="right num cell-strong">' + money(orderDraftTotal()) + '</td><td></td></tr></tfoot></table></div></div>';

  modal({
    title: 'New direct order',
    sub: 'B2C order from Facebook or online chat',
    wide: true,
    body: body,
    footer: '<button class="btn btn--primary" data-act="order-submit">' + icon('check', 15) + '<span>Create order</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button>'
  });
}

/* ---------- consignment drop ---------- */
function dropModal(preselect) {
  var st = preselect || stores()[0].id;
  var rows = db.products.map(function (p) {
    return '<tr><td class="mono">' + esc(p.sku) + '</td><td><span class="cell-strong">' + esc(p.name) + '</span><div class="cell-sub">Central stock: ' + stockAt(CENTRAL, p.id) + ' packs</div></td>' +
      '<td class="right num">' + money(p.wholesale_price) + '</td>' +
      '<td class="right"><input class="input input--qty" type="number" min="0" step="1" value="0" data-drop="' + p.id + '"></td></tr>';
  }).join('');
  modal({
    title: 'Generate consignment drop',
    sub: 'Moves stock from Central Kitchen to a partner store and invoices at wholesale price.',
    wide: true,
    body: '<form class="form-grid">' +
      '<div class="form-row form-row--2">' +
      field('Partner store', select('loc', stores().map(function (s) { return { value: s.id, label: s.name + ' — ' + s.suburb }; }), st).replace('class="input"', 'class="input" id="drop-loc"')) +
      field('Delivery date', '<input class="input" id="drop-date" type="date" value="' + todayISO() + '">') +
      '</div>' +
      '<div class="tbl-wrap"><table class="tbl tbl--compact"><thead><tr><th>SKU</th><th>Product</th><th class="right">Wholesale</th><th class="right">Packs</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="form-actions"><button class="btn btn--primary" data-act="drop-submit">' + icon('transfer', 15) + '<span>Create drop &amp; transfer stock</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button></div></form>'
  });
}

/* ---------- settlement ---------- */
function settleModal(preselect) {
  var st = preselect || stores()[0].id;
  renderSettleModal(st, '');
}
function renderSettleModal(storeId, dateValue) {
  var st = locById(storeId);
  var rows = db.products.map(function (p) {
    var onHand = stockAt(storeId, p.id);
    return '<tr data-prod="' + p.id + '">' +
      '<td class="mono">' + esc(p.sku) + '</td>' +
      '<td><span class="cell-strong">' + esc(p.name) + '</span><div class="cell-sub">On hand: <span data-onhand="' + p.id + '">' + onHand + '</span> packs</div></td>' +
      '<td class="right num">' + money(p.wholesale_price) + '</td>' +
      '<td class="right"><input class="input input--qty" type="number" min="0" step="1" value="0" data-sold="' + p.id + '" data-price="' + p.wholesale_price + '"></td>' +
      '<td class="right"><input class="input input--qty" type="number" min="0" step="1" value="0" data-ret="' + p.id + '"></td>' +
      '</tr>';
  }).join('');
  modal({
    title: 'Settlement / reconciliation',
    sub: 'Report sold units and returns from the partner store. Returns are written off and not restocked.',
    wide: true,
    body: '<form class="form-grid">' +
      '<div class="form-row form-row--3">' +
      field('Partner store', select('loc', stores().map(function (s) { return { value: s.id, label: s.name }; }), storeId).replace('class="input"', 'class="input" id="set-loc"')) +
      field('Settlement date', '<input class="input" id="set-date" type="date" value="' + (dateValue || todayISO()) + '">') +
      field('Commission rate', '<input class="input" value="' + Math.round(st.commission_rate * 100) + '%" disabled>') +
      '</div>' +
      '<div class="tbl-wrap"><table class="tbl tbl--compact"><thead><tr><th>SKU</th><th>Product</th><th class="right">Wholesale</th><th class="right">Sold</th><th class="right">Returns</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="settle-summary" id="settle-summary"></div>' +
      '<div class="form-actions"><button class="btn btn--primary" data-act="settle-submit">' + icon('check', 15) + '<span>Record settlement</span></button>' +
      '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button></div></form>'
  });
  updateSettleSummary();
}
function settlementCalc() {
  var sold = 0, returns = 0, gross = 0, lines = [];
  db.products.forEach(function (p) {
    var s = Number((document.querySelector('[data-sold="' + p.id + '"]') || {}).value || 0);
    var r = Number((document.querySelector('[data-ret="' + p.id + '"]') || {}).value || 0);
    if (s || r) lines.push({ product_id: p.id, sold_qty: s, returned_qty: r, unit_price: p.wholesale_price });
    sold += s; returns += r; gross += s * p.wholesale_price;
  });
  var storeId = (document.getElementById('set-loc') || {}).value;
  var rate = locById(storeId) ? locById(storeId).commission_rate : 0.2;
  return { lines: lines, sold: sold, returns: returns, gross: gross, commission: +(gross * rate).toFixed(2), net: +(gross - gross * rate).toFixed(2), rate: rate };
}
function updateSettleSummary() {
  var host = document.getElementById('settle-summary');
  if (!host) return;
  var c = settlementCalc();
  host.innerHTML = '<div class="settle-grid">' +
    '<div><span>Units sold</span><b class="num">' + c.sold + '</b></div>' +
    '<div><span>Returns</span><b class="num">' + c.returns + '</b></div>' +
    '<div><span>Wholesale revenue</span><b class="num">' + money(c.gross) + '</b></div>' +
    '<div><span>Commission (' + Math.round(c.rate * 100) + '%)</span><b class="num">-' + money(c.commission) + '</b></div>' +
    '<div class="settle-net"><span>Net payable</span><b class="num">' + money(c.net) + '</b></div>' +
    '</div>';
}

/* ---------------------------------------------------------
   Exports
--------------------------------------------------------- */
function exportData(kind) {
  var rows = [], name = 'makuru-' + kind + '-' + todayISO() + '.csv';
  if (kind === 'orders') {
    rows.push(['Ref', 'Channel', 'Customer', 'Phone', 'Suburb', 'Delivery date', 'Items', 'Packs', 'Payment', 'Order status', 'Fulfilment', 'Total AUD']);
    db.orders.forEach(function (o) {
      rows.push([o.order_ref, o.channel, o.customer_name, o.customer_phone, o.delivery_suburb, o.delivery_date,
        o.items.map(function (i) { return i.quantity + 'x ' + (product(i.product_id) || {}).sku; }).join(' | '),
        packsOf(o), o.payment_status, o.order_status, o.fulfillment_status, o.total_amount.toFixed(2)]);
    });
  } else if (kind === 'dispatch') {
    rows.push(['Ref', 'Delivery date', 'Suburb', 'Customer', 'Items', 'Packs', 'Payment', 'Stage']);
    dispatchRows().forEach(function (o) {
      rows.push([o.order_ref, o.delivery_date, o.delivery_suburb, o.customer_name, itemsSummary(o), packsOf(o), o.payment_status, o.fulfillment_status]);
    });
  } else if (kind === 'inventory') {
    rows.push(['Location', 'SKU', 'Product', 'Pack size', 'On hand packs', 'Units', 'Retail', 'Stock value']);
    var loc = locById(ui.loc);
    db.products.forEach(function (p) {
      var q = stockAt(loc.id, p.id);
      rows.push([loc.name, p.sku, p.name, p.units_per_pack, q, q * p.units_per_pack, p.retail_price, (q * p.retail_price).toFixed(2)]);
    });
  } else if (kind === 'materials') {
    rows.push(['Material', 'Unit', 'Cost per unit', 'On hand', 'Minimum', 'Value']);
    db.materials.forEach(function (m) {
      rows.push([m.name, m.unit, m.cost_per_unit, m.current_stock, m.min_stock_alert, (m.current_stock * m.cost_per_unit).toFixed(2)]);
    });
  } else if (kind === 'procurement') {
    rows.push(['Date', 'Supplier', 'Material', 'Quantity', 'Unit', 'Unit cost', 'Total']);
    db.procurement.forEach(function (r) {
      var m = material(r.material_id) || {};
      rows.push([r.purchase_date, r.supplier, m.name || '', r.quantity, m.unit || '', r.unit_cost, (r.quantity * r.unit_cost).toFixed(2)]);
    });
  } else if (kind === 'ledger') {
    rows.push(['Date', 'Type', 'Reference', 'Description', 'Amount']);
    directOrders().forEach(function (o) {
      if (o.payment_status === 'paid' && o.order_status !== 'cancelled') rows.push([o.delivery_date, 'Revenue', o.order_ref, 'Direct order — ' + o.customer_name, o.total_amount.toFixed(2)]);
    });
    db.settlements.forEach(function (s) {
      rows.push([s.settlement_date, 'Revenue', 'SET-' + s.id.slice(-4), 'Consignment gross — ' + locById(s.location_id).name, s.gross_sales.toFixed(2)]);
      rows.push([s.settlement_date, 'Cost', 'SET-' + s.id.slice(-4), 'Store commission', (-s.commission_amount).toFixed(2)]);
    });
    db.expenses.forEach(function (e) {
      rows.push([e.expense_date, 'Expense', 'EXP-' + e.id.slice(-4), e.category, (-e.amount).toFixed(2)]);
    });
  } else if (kind === 'manifest') {
    rows.push(['SKU', 'Product', 'Packs', 'Units']);
    var mf = {};
    dispatchRows().forEach(function (o) {
      o.items.forEach(function (i) {
        if (!mf[i.product_id]) mf[i.product_id] = { packs: 0, units: 0 };
        mf[i.product_id].packs += i.quantity;
        mf[i.product_id].units += i.quantity * product(i.product_id).units_per_pack;
      });
    });
    Object.keys(mf).forEach(function (pid) {
      var p = product(pid);
      rows.push([p.sku, p.name, mf[pid].packs, mf[pid].units]);
    });
  }
  downloadCSV(name, rows);
  toast('Export created — ' + name);
}

/* ---------------------------------------------------------
   Click actions
--------------------------------------------------------- */
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (!el) return;
  var act = el.getAttribute('data-act');
  var id = el.getAttribute('data-id');

  switch (act) {
    case 'enter':
      location.hash = '#/dashboard';
      return;

    case 'go':
      location.hash = '#/' + el.getAttribute('data-route');
      return;

    case 'tab':
      ui.tab = el.getAttribute('data-tab');
      render();
      return;

    case 'loc':
      ui.loc = el.getAttribute('data-loc');
      render();
      return;

    case 'modal-close':
      closeModal();
      return;

    case 'reset-confirm':
      modal({
        title: 'Reset all data',
        sub: 'Restores the seeded demo dataset. This cannot be undone.',
        body: '<p class="muted">All orders, stock movements, settlements and expenses created in this browser will be replaced by the original sample records.</p>',
        footer: '<button class="btn btn--primary" data-act="reset-do">' + icon('refresh', 15) + '<span>Reset data</span></button>' +
          '<button class="btn btn--ghost" data-act="modal-close"><span>Cancel</span></button>'
      });
      return;

    case 'reset-do':
      db = seedDB();
      saveDB();
      closeModal();
      render();
      toast('Data reset to sample dataset');
      return;

    /* ---------- production ---------- */
    case 'prod-modal':
      productionModal();
      return;

    case 'prod-submit': {
      var pid = document.getElementById('prod-product').value;
      var packs = Number(document.getElementById('prod-packs').value || 0);
      var res = doProduction(pid, packs, packs + ' packs produced');
      if (!res.ok) { toast(res.error, 'error'); return; }
      render();
      toast('Production recorded — ' + packs + ' packs of ' + product(pid).name);
      return;
    }

    case 'prod-modal-submit': {
      var mpid = document.getElementById('mprod-product').value;
      var mpacks = Number(document.getElementById('mprod-packs').value || 0);
      var mres = doProduction(mpid, mpacks, mpacks + ' packs produced');
      if (!mres.ok) { toast(mres.error, 'error'); return; }
      closeModal();
      render();
      toast('Production recorded — ' + mpacks + ' packs of ' + product(mpid).name);
      return;
    }

    /* ---------- transfer ---------- */
    case 'transfer-modal':
      transferModal();
      return;

    case 'transfer-submit': {
      var f = el.closest('.dialog').querySelector('form');
      var to = f.elements.to.value, tp = f.elements.product.value, tq = Number(f.elements.packs.value || 0);
      var tres = doTransfer(tp, to, tq, f.elements.note.value);
      if (!tres.ok) { toast(tres.error, 'error'); return; }
      closeModal();
      render();
      toast('Transferred ' + tq + ' packs to ' + locById(to).name);
      return;
    }

    /* ---------- adjustment ---------- */
    case 'adjust-modal':
      adjustModal(el.getAttribute('data-loc'), el.getAttribute('data-prod'));
      return;

    case 'adjust-submit': {
      var af = el.closest('.dialog').querySelector('form');
      var aloc = af.elements.loc.value, aprod = af.elements.product.value;
      var dir = af.elements.direction.value;
      var aq = Number(af.elements.packs.value || 0) * (dir === 'dec' ? -1 : 1);
      var ares = doAdjust(aloc, aprod, aq, af.elements.reason.value);
      if (!ares.ok) { toast(ares.error, 'error'); return; }
      closeModal();
      render();
      toast('Stock adjusted (' + (aq > 0 ? '+' : '') + aq + ' packs)');
      return;
    }

    /* ---------- procurement ---------- */
    case 'procure-modal':
      procureModal();
      return;

    case 'procure-submit': {
      var pf = el.closest('.dialog').querySelector('form');
      var pres = doProcurement({
        purchase_date: pf.elements.date.value,
        supplier: pf.elements.supplier.value || 'Unspecified supplier',
        material_id: pf.elements.material.value,
        quantity: Number(pf.elements.quantity.value || 0),
        unit_cost: Number(pf.elements.unit_cost.value || 0)
      });
      if (!pres.ok) { toast(pres.error, 'error'); return; }
      closeModal();
      render();
      toast('Procurement recorded');
      return;
    }

    /* ---------- direct orders ---------- */
    case 'order-modal':
      orderModal();
      return;

    case 'ord-add': {
      var prodId = document.getElementById('ord-prod').value;
      var q = Number(document.getElementById('ord-qty').value || 0);
      if (q <= 0) { toast('Quantity must be greater than zero', 'error'); return; }
      captureOrderForm();
      var existing = draft.items.filter(function (i) { return i.product_id === prodId; })[0];
      if (existing) existing.qty += q; else draft.items.push({ product_id: prodId, qty: q });
      renderOrderModal();
      return;
    }

    case 'ord-remove': {
      captureOrderForm();
      draft.items.splice(Number(el.getAttribute('data-idx')), 1);
      renderOrderModal();
      return;
    }

    case 'order-submit': {
      captureOrderForm();
      if (!draft.name.trim()) { toast('Customer name is required', 'error'); return; }
      if (!draft.items.length) { toast('Add at least one item', 'error'); return; }
      var phone = normalisePhone(draft.phone);
      if (!phone) { toast('Contact number is required', 'error'); return; }
      var locId = draft.location || CENTRAL;
      var shortages = [];
      draft.items.forEach(function (i) {
        if (i.qty > stockAt(locId, i.product_id)) {
          shortages.push(product(i.product_id).name + ': ' + stockAt(locId, i.product_id) + ' packs available');
        }
      });
      if (shortages.length) { toast('Insufficient stock — ' + shortages.join('; '), 'error'); return; }
      var seq = 1052;
      directOrders().forEach(function (o) {
        var m = /^D-(\d+)$/.exec(o.order_ref);
        if (m) seq = Math.max(seq, Number(m[1]));
      });
      var items = draft.items.map(function (i) {
        return { id: uid('oi'), product_id: i.product_id, quantity: i.qty, unit_price: product(i.product_id).retail_price };
      });
      var total = items.reduce(function (s, i) { return s + i.quantity * i.unit_price; }, 0);
      items.forEach(function (i) { addStock(locId, i.product_id, -i.quantity); logMove('sale', locId, i.product_id, -i.quantity, 'Direct order D-' + (seq + 1)); });
      db.orders.push({
        id: uid('ord'), order_ref: 'D-' + (seq + 1), channel: 'direct_facebook', destination_location_id: locId,
        customer_name: draft.name.trim(), customer_phone: phone, delivery_suburb: draft.suburb.trim() || locById(locId).suburb.split(' NSW')[0],
        delivery_date: draft.date || todayISO(), fulfillment_status: 'pending',
        order_status: draft.pay === 'paid' ? 'confirmed' : 'pending',
        payment_status: draft.pay, payment_method: draft.method,
        total_amount: total, items: items, created_at: new Date().toISOString()
      });
      saveDB();
      closeModal();
      render();
      toast('Order D-' + (seq + 1) + ' created — ' + money(total));
      return;
    }

    case 'order-open':
      orderDetail(id);
      return;

    case 'order-paid': {
      var o1 = orderById(id);
      if (!o1) return;
      o1.payment_status = 'paid';
      saveDB(); render(); orderDetail(id);
      toast(o1.order_ref + ' marked paid');
      return;
    }

    case 'order-advance':
    case 'advance': {
      var o2 = orderById(id);
      if (!o2) return;
      if (o2.order_status === 'pending') o2.order_status = 'confirmed';
      if (o2.fulfillment_status === 'pending') o2.fulfillment_status = 'packed';
      else if (o2.fulfillment_status === 'packed') o2.fulfillment_status = 'in_transit';
      else if (o2.fulfillment_status === 'in_transit') { o2.fulfillment_status = 'delivered'; o2.order_status = 'completed'; }
      saveDB();
      render();
      if (act === 'order-advance') orderDetail(id);
      toast(o2.order_ref + ' → ' + labelize(o2.fulfillment_status));
      return;
    }

    case 'order-cancel': {
      var o3 = orderById(id);
      if (!o3) return;
      o3.order_status = 'cancelled';
      returnOrderStock(o3);
      saveDB(); closeModal(); render();
      toast(o3.order_ref + ' cancelled — stock returned');
      return;
    }

    /* ---------- consignment ---------- */
    case 'drop-modal':
      dropModal(el.getAttribute('data-loc'));
      return;

    case 'drop-submit': {
      var storeId = document.getElementById('drop-loc').value;
      var dropDate = document.getElementById('drop-date').value || todayISO();
      var picked = [];
      Array.prototype.forEach.call(document.querySelectorAll('[data-drop]'), function (inp) {
        var q2 = Number(inp.value || 0);
        if (q2 > 0) picked.push({ product_id: inp.getAttribute('data-drop'), qty: q2 });
      });
      if (!picked.length) { toast('Enter a pack quantity for at least one product', 'error'); return; }
      var shortD = picked.filter(function (i) { return i.qty > stockAt(CENTRAL, i.product_id); });
      if (shortD.length) { toast('Central stock too low for ' + shortD.map(function (i) { return product(i.product_id).name; }).join(', '), 'error'); return; }
      var seqC = 2072;
      consignmentDrops().forEach(function (o) {
        var m = /^C-(\d+)$/.exec(o.order_ref);
        if (m) seqC = Math.max(seqC, Number(m[1]));
      });
      var dItems = picked.map(function (i) {
        return { id: uid('oi'), product_id: i.product_id, quantity: i.qty, unit_price: product(i.product_id).wholesale_price };
      });
      picked.forEach(function (i) {
        addStock(CENTRAL, i.product_id, -i.qty);
        addStock(storeId, i.product_id, i.qty);
        logMove('transfer', CENTRAL, i.product_id, i.qty, 'Consignment drop C-' + (seqC + 1), storeId);
      });
      var dTotal = dItems.reduce(function (s, i) { return s + i.quantity * i.unit_price; }, 0);
      db.orders.push({
        id: uid('ord'), order_ref: 'C-' + (seqC + 1), channel: 'consignment_drop', destination_location_id: storeId,
        customer_name: locById(storeId).name, customer_phone: locById(storeId).phone,
        delivery_suburb: locById(storeId).suburb.split(' NSW')[0], delivery_date: dropDate,
        fulfillment_status: 'pending', order_status: 'confirmed', payment_status: 'unpaid', payment_method: 'invoice',
        total_amount: dTotal, items: dItems, created_at: new Date().toISOString()
      });
      saveDB(); closeModal(); render();
      toast('Drop C-' + (seqC + 1) + ' created — ' + money(dTotal) + ' invoiced to ' + locById(storeId).name);
      return;
    }

    case 'settle-modal':
      settleModal(el.getAttribute('data-loc'));
      return;

    case 'settle-submit': {
      var c = settlementCalc();
      if (!c.sold && !c.returns) { toast('Enter sold or returned units', 'error'); return; }
      var over = c.lines.filter(function (l) { return (l.sold_qty + l.returned_qty) > stockAt(document.getElementById('set-loc').value, l.product_id); });
      if (over.length) { toast('Sold + returns exceed stock on hand for ' + over.map(function (l) { return product(l.product_id).name; }).join(', '), 'error'); return; }
      var sStore = document.getElementById('set-loc').value;
      var sDate = document.getElementById('set-date').value || todayISO();
      c.lines.forEach(function (l) {
        addStock(sStore, l.product_id, -(l.sold_qty + l.returned_qty));
        logMove('settlement', sStore, l.product_id, -(l.sold_qty + l.returned_qty), 'Settlement ' + sDate + ' — sold ' + l.sold_qty + ', returned ' + l.returned_qty);
      });
      db.settlements.unshift({
        id: uid('set'), location_id: sStore, settlement_date: sDate, commission_rate: c.rate,
        items: c.lines, gross_sales: c.gross, commission_amount: c.commission, net_payable: c.net, is_settled: false
      });
      saveDB(); closeModal(); render();
      toast('Settlement recorded — net payable ' + money(c.net));
      return;
    }

    case 'settle-mark': {
      var st = db.settlements.filter(function (s) { return s.id === id; })[0];
      if (!st) return;
      st.is_settled = true;
      saveDB(); render();
      toast('Settlement marked as settled');
      return;
    }

    case 'invoice-paid': {
      var inv = orderById(id);
      if (!inv) return;
      inv.payment_status = 'paid';
      saveDB(); render();
      toast(inv.order_ref + ' marked paid');
      return;
    }

    /* ---------- expenses ---------- */
    case 'expense-modal':
      expenseModal();
      return;

    case 'expense-submit': {
      var ef = el.closest('.dialog').querySelector('form');
      var amt = Number(ef.elements.amount.value || 0);
      if (!(amt > 0)) { toast('Enter an amount greater than zero', 'error'); return; }
      db.expenses.unshift({
        id: uid('exp'), expense_date: ef.elements.date.value || todayISO(),
        category: ef.elements.category.value, description: ef.elements.description.value || ef.elements.category.value,
        amount: amt
      });
      saveDB(); closeModal(); render();
      toast('Expense recorded — ' + money(amt));
      return;
    }

    case 'expense-del': {
      db.expenses = db.expenses.filter(function (x) { return x.id !== id; });
      saveDB(); render();
      toast('Expense removed');
      return;
    }

    /* ---------- export / print ---------- */
    case 'export':
      exportData(el.getAttribute('data-kind'));
      return;

    case 'print-manifest':
      document.body.classList.add('print-mode');
      var after = function () {
        document.body.classList.remove('print-mode');
        window.removeEventListener('afterprint', after);
      };
      window.addEventListener('afterprint', after);
      setTimeout(function () { window.print(); }, 80);
      return;
  }
});

/* input listeners */
document.addEventListener('input', function (e) {
  var t = e.target;
  if (!t) return;
  if (t.hasAttribute && (t.hasAttribute('data-sold') || t.hasAttribute('data-ret'))) { updateSettleSummary(); return; }
  if (!t.id) return;
  if (t.id === 'inv-search') {
    ui.invQuery = t.value;
    var pos = t.selectionStart;
    render();
    var again = document.getElementById('inv-search');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
    return;
  }
  if (t.id === 'order-search') {
    ui.orderQuery = t.value;
    var p2 = t.selectionStart;
    render();
    var again2 = document.getElementById('order-search');
    if (again2) { again2.focus(); try { again2.setSelectionRange(p2, p2); } catch (err) {} }
    return;
  }
  if (t.id === 'prod-product' || t.id === 'prod-packs') { productionPreview(); return; }
  if (t.id === 'mprod-product' || t.id === 'mprod-packs') { modalProdPreview(); return; }
});

document.addEventListener('change', function (e) {
  var t = e.target;
  if (!t || !t.id) return;
  if (t.id === 'order-status') { ui.orderStatus = t.value; render(); return; }
  if (t.id === 'disp-date') { ui.dispatchDate = t.value; render(); return; }
  if (t.id === 'disp-suburb') { ui.dispatchSuburb = t.value; render(); return; }
  if (t.id === 'disp-status') { ui.dispatchStatus = t.value; render(); return; }
  if (t.id === 'set-loc') { updateSettleSummary(); return; }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

window.addEventListener('hashchange', function () {
  closeModal();
  render();
  window.scrollTo(0, 0);
});

render();
