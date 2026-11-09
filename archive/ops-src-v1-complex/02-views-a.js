/* =========================================================
   Views A — Dashboard · Inventory · Raw Materials
   ========================================================= */

var ROUTES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'inventory', label: 'Inventory', icon: 'package' },
  { id: 'raw-materials', label: 'Raw Materials', icon: 'flask' },
  { id: 'orders', label: 'Orders', icon: 'receipt' },
  { id: 'dispatch', label: 'Dispatch', icon: 'truck' },
  { id: 'finance', label: 'Finance', icon: 'wallet' }
];

var ui = {
  loc: CENTRAL,
  tab: 'direct',
  orderQuery: '',
  orderStatus: 'all',
  invQuery: '',
  dispatchDate: 'all',
  dispatchSuburb: 'all',
  dispatchStatus: 'all'
};

function pageHead(title, sub, actions) {
  return '<div class="page-head"><div class="page-head-main">' +
    '<h1 class="page-title">' + esc(title) + '</h1>' +
    (sub ? '<p class="page-sub">' + esc(sub) + '</p>' : '') +
    '</div>' + (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
}

function btn(label, act, opts) {
  opts = opts || {};
  return '<button class="btn btn--' + (opts.variant || 'secondary') + (opts.small ? ' btn--sm' : '') + '"' +
    (act ? ' data-act="' + act + '"' : '') +
    (opts.data ? Object.keys(opts.data).map(function (k) { return ' data-' + k + '="' + esc(opts.data[k]) + '"'; }).join('') : '') +
    (opts.disabled ? ' disabled' : '') + '>' +
    (opts.icon ? icon(opts.icon, 15) : '') + '<span>' + esc(label) + '</span></button>';
}

function tabs(items, active) {
  return '<div class="seg">' + items.map(function (t) {
    return '<button class="seg-btn' + (t.id === active ? ' is-active' : '') + '" data-act="tab" data-tab="' + t.id + '">' + esc(t.label) + '</button>';
  }).join('') + '</div>';
}

function barsChart(series) {
  var max = Math.max.apply(null, series.map(function (s) { return s.total; }).concat([1]));
  var W = 720, H = 132, gap = series.length > 20 ? 3 : 6;
  var bw = (W - gap * (series.length - 1)) / series.length;
  var bars = series.map(function (s, i) {
    var h = Math.max(2, (s.total / max) * (H - 26));
    var x = i * (bw + gap), y = H - 20 - h;
    return '<rect class="bar' + (s.total ? '' : ' bar--zero') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2">' +
      '<title>' + dateLabel(s.date, 'short') + ' — ' + money(s.total) + '</title></rect>';
  }).join('');
  var labels = series.map(function (s, i) {
    if (series.length > 10 && i % 2) return '';
    return '<text class="chart-label" x="' + (i * (bw + gap) + bw / 2).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">' + dateLabel(s.date, 'short').replace(' ', '\u00a0') + '</text>';
  }).join('');
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Sales by day">' +
    '<line class="chart-axis" x1="0" y1="' + (H - 20) + '" x2="' + W + '" y2="' + (H - 20) + '"/>' + bars + labels + '</svg>';
}

function splitBar(label, amount, total, tone) {
  var w = total > 0 ? Math.max(1, Math.round(amount / total * 100)) : 0;
  return '<div class="split">' +
    '<div class="split-top"><span>' + esc(label) + '</span><span class="num">' + money(amount) + '</span></div>' +
    '<div class="split-track"><i class="split-fill split-fill--' + tone + '" style="width:' + w + '%"></i></div>' +
    '<div class="split-meta">' + w + '% of gross revenue</div>' +
    '</div>';
}

/* ---------------------------------------------------------
   Dashboard
--------------------------------------------------------- */
function viewDashboard() {
  var s = salesSummary();
  var cogs = cogsSummary();
  var receiv = receivables();
  var low = lowStockList();
  var pending = pendingDispatches();
  var today = todayCounts();
  var series = monthRevenueSeries(14);
  var lowOut = low.filter(function (l) { return l.state === 'out'; }).length;

  var kpis = '<div class="stat-grid">' +
    statCard({
      label: 'Gross sales (AUD)', value: money0(s.total), icon: 'wallet',
      meta: 'Direct ' + money0(s.directRevenue) + ' · Consignment ' + money0(s.consignGross)
    }) +
    statCard({
      label: 'Pending dispatches', value: String(pending.length), icon: 'truck',
      meta: today.total + ' scheduled today · ' + today.pending + ' waiting to pack',
      tone: pending.length ? 'accent' : ''
    }) +
    statCard({
      label: 'Low stock alerts', value: String(low.length), icon: 'alert',
      meta: lowOut + ' out of stock · ' + db.materials.filter(function (m) { return materialState(m) !== 'ok'; }).length + ' raw materials below minimum',
      tone: low.length ? 'warn' : ''
    }) +
    statCard({
      label: 'Receivables', value: money0(receivablesTotal()), icon: 'receipt',
      meta: receiv.filter(function (r) { return r.kind === 'settlement'; }).length + ' unsettled settlements · ' + receiv.filter(function (r) { return r.kind === 'invoice'; }).length + ' unpaid invoices'
    }) +
    '</div>';

  var quick = '<div class="quick-row">' +
    btn('Record production', 'prod-modal', { variant: 'primary', icon: 'chef' }) +
    btn('New direct order', 'order-modal', { icon: 'plus' }) +
    btn('Generate consignment drop', 'drop-modal', { icon: 'transfer' }) +
    btn('Add expense', 'expense-modal', { icon: 'card' }) +
    '</div>';

  var revenuePanel = panel({
    title: 'Revenue by channel',
    sub: 'Gross revenue recognised to date',
    body:
      '<div class="split-stack">' +
      splitBar('Direct orders (paid)', s.directRevenue, s.total, 'red') +
      splitBar('Consignment settlements', s.consignGross, s.total, 'ink') +
      '</div>' +
      '<div class="kv-list">' +
      '<div class="kv"><span>Gross revenue</span><b class="num">' + money(s.total) + '</b></div>' +
      '<div class="kv"><span>Store commission</span><b class="num">-' + money(s.commission) + '</b></div>' +
      '<div class="kv kv--total"><span>Net revenue after commission</span><b class="num">' + money(s.total - s.commission) + '</b></div>' +
      '</div>'
  });

  var todayPanel = panel({
    title: 'Dispatch today',
    sub: dateLabel(todayISO()),
    actions: '<button class="link-btn" data-act="go" data-route="dispatch">Open dispatch ' + icon('chevronRight', 13) + '</button>',
    body:
      '<div class="count-list">' +
      ['pending', 'packed', 'in_transit', 'delivered'].map(function (k) {
        return '<div class="count-row"><span class="count-dot count-dot--' + k + '"></span><span>' + labelize(k) + '</span><b class="num">' + (today[k] || 0) + '</b></div>';
      }).join('') +
      '<div class="count-row count-row--total"><span>Total scheduled</span><b class="num">' + today.total + '</b></div>' +
      '</div>'
  });

  var chartPanel = panel({
    title: 'Direct order value · last 14 days',
    sub: 'By scheduled delivery date',
    body: barsChart(series) + '<div class="chart-foot"><span>Peak day</span><b class="num">' + money(Math.max.apply(null, series.map(function (x) { return x.total; }).concat([0]))) + '</b></div>'
  });

  var lowRows = low.slice(0, 6).map(function (l) {
    return '<tr><td><span class="cell-strong">' + esc(l.ref) + '</span><div class="cell-sub">' + esc(l.kind) + '</div></td>' +
      '<td>' + esc(l.where) + '</td>' +
      '<td class="right num">' + esc(l.onHand) + '</td>' +
      '<td class="right">' + pill(l.state === 'out' ? 'Out' : 'Low', l.state === 'out' ? 'red' : 'amber') + '</td></tr>';
  });
  var lowPanel = panel({
    title: 'Stock alerts',
    sub: 'Finished goods and raw materials below threshold',
    actions: '<button class="link-btn" data-act="go" data-route="inventory">Inventory ' + icon('chevronRight', 13) + '</button>',
    flush: true,
    body: table([{ label: 'Item' }, { label: 'Location' }, { label: 'On hand', align: 'right' }, { label: 'Status', align: 'right' }], lowRows, { empty: 'No stock alerts' })
  });

  var recentOrders = activeOrders().slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); }).slice(0, 6);
  var recentRows = recentOrders.map(function (o) {
    return '<tr class="row-click" data-act="order-open" data-id="' + o.id + '">' +
      '<td><span class="cell-ref">' + esc(o.order_ref) + '</span><div class="cell-sub">' + (o.channel === 'direct_facebook' ? 'Direct' : 'Consignment') + '</div></td>' +
      '<td>' + esc(o.customer_name) + '<div class="cell-sub">' + esc(o.delivery_suburb) + '</div></td>' +
      '<td>' + dateLabel(o.delivery_date, 'short') + '</td>' +
      '<td class="right">' + pill(labelize(o.payment_status), statusTone('payment', o.payment_status)) + '</td>' +
      '<td class="right num">' + money(o.total_amount) + '</td></tr>';
  });
  var recentPanel = panel({
    title: 'Recent orders',
    sub: 'Direct and consignment',
    actions: '<button class="link-btn" data-act="go" data-route="orders">Orders ' + icon('chevronRight', 13) + '</button>',
    flush: true,
    body: table([{ label: 'Ref' }, { label: 'Customer' }, { label: 'Delivery' }, { label: 'Payment', align: 'right' }, { label: 'Total', align: 'right' }], recentRows, { empty: 'No orders yet' })
  });

  return pageHead('Dashboard', longDate()) +
    kpis + quick +
    '<div class="grid-2">' + revenuePanel + todayPanel + '</div>' +
    chartPanel +
    '<div class="grid-2">' + lowPanel + recentPanel + '</div>';
}

/* ---------------------------------------------------------
   Inventory
--------------------------------------------------------- */
function viewInventory() {
  var loc = locById(ui.loc) || locById(CENTRAL);
  var q = ui.invQuery.toLowerCase();
  var rowsData = db.products.map(function (p) {
    var onHand = stockAt(loc.id, p.id);
    return { p: p, onHand: onHand };
  }).filter(function (r) {
    return !q || (r.p.sku + ' ' + r.p.name).toLowerCase().indexOf(q) >= 0;
  });
  var totalPacks = rowsData.reduce(function (s, r) { return s + r.onHand; }, 0);
  var totalUnits = rowsData.reduce(function (s, r) { return s + r.onHand * r.p.units_per_pack; }, 0);
  var stockValue = rowsData.reduce(function (s, r) { return s + r.onHand * r.p.retail_price; }, 0);
  var lowCount = rowsData.filter(function (r) { return stockState(r.onHand) !== 'ok'; }).length;

  var switches = '<div class="seg seg--wrap">' + db.locations.map(function (l) {
    var packs = db.products.reduce(function (s, p) { return s + stockAt(l.id, p.id); }, 0);
    return '<button class="seg-btn' + (l.id === loc.id ? ' is-active' : '') + '" data-act="loc" data-loc="' + l.id + '">' +
      (l.type === 'central' ? icon('building', 14) : icon('store', 14)) + '<span>' + esc(l.name) + '</span><em class="seg-count">' + packs + '</em></button>';
  }).join('') + '</div>';

  var rows = rowsData.map(function (r) {
    var st = stockState(r.onHand);
    return '<tr>' +
      '<td class="mono">' + esc(r.p.sku) + '</td>' +
      '<td><span class="cell-strong">' + esc(r.p.name) + '</span><div class="cell-sub">' + (loc.type === 'central' ? 'Central' : 'Consignment') + '</div></td>' +
      '<td class="num">' + r.p.units_per_pack + ' pcs</td>' +
      '<td class="right num cell-strong">' + r.onHand + '</td>' +
      '<td class="right num">' + num(r.onHand * r.p.units_per_pack) + '</td>' +
      '<td class="right num">' + money(r.p.retail_price) + '</td>' +
      '<td class="right num">' + money(r.onHand * r.p.retail_price) + '</td>' +
      '<td class="right">' + pill(st === 'ok' ? 'In stock' : st === 'low' ? 'Low' : 'Out', st === 'ok' ? 'green' : st === 'low' ? 'amber' : 'red') + '</td>' +
      '<td class="right"><button class="link-btn" data-act="adjust-modal" data-loc="' + loc.id + '" data-prod="' + r.p.id + '">Adjust</button></td>' +
      '</tr>';
  });

  var tablePanel = panel({
    title: loc.name + ' — finished goods',
    sub: loc.suburb + ' · ' + loc.type,
    actions: '<div class="search"><span class="search-ic">' + icon('search', 15) + '</span><input id="inv-search" class="input input--search" placeholder="Search SKU or product" value="' + esc(ui.invQuery) + '"></div>',
    flush: true,
    body: table([
      { label: 'SKU', w: '110px' }, { label: 'Product' }, { label: 'Pack size', align: 'right' },
      { label: 'On hand', align: 'right' }, { label: 'Units', align: 'right' },
      { label: 'Retail', align: 'right' }, { label: 'Stock value', align: 'right' },
      { label: 'Status', align: 'right' }, { label: '', align: 'right', w: '86px' }
    ], rows, { empty: 'No products match this search' }),
    foot: '<span>' + rowsData.length + ' SKUs</span><span class="num">' + totalPacks + ' packs · ' + num(totalUnits) + ' pcs · ' + money(stockValue) + '</span>'
  });

  var moves = db.movements.slice(0, 8).map(function (m) {
    var p = product(m.product_id), l = locById(m.location_id);
    var tone = m.type === 'production' ? 'green' : m.type === 'transfer' ? 'blue' : 'amber';
    return '<tr><td class="cell-sub">' + new Date(m.at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</td>' +
      '<td>' + pill(labelize(m.type), tone) + '</td>' +
      '<td><span class="cell-strong">' + esc(p ? p.name : '—') + '</span></td>' +
      '<td>' + esc(l ? l.name : '—') + (m.to_location_id ? ' → ' + esc(locById(m.to_location_id).name) : '') + '</td>' +
      '<td class="right num">' + (m.qty > 0 ? '+' : '') + m.qty + '</td>' +
      '<td class="cell-sub">' + esc(m.note) + '</td></tr>';
  });
  var movesPanel = panel({
    title: 'Recent stock movements', sub: 'Production, transfers and adjustments', flush: true,
    body: table([{ label: 'Time' }, { label: 'Type' }, { label: 'Product' }, { label: 'Location' }, { label: 'Qty', align: 'right' }, { label: 'Note' }], moves, { empty: 'No movements recorded' })
  });

  return pageHead('Inventory', 'Finished goods across central kitchen and consignment partner stores',
    btn('Record production intake', 'prod-modal', { variant: 'primary', icon: 'chef' }) +
    btn('Transfer to partner store', 'transfer-modal', { icon: 'transfer' }) +
    btn('Manual adjustment', 'adjust-modal', { icon: 'scale' })) +
    switches +
    '<div class="stat-grid stat-grid--3">' +
    statCard({ label: 'Packs on hand', value: String(totalPacks), icon: 'package', meta: num(totalUnits) + ' units across ' + rowsData.length + ' SKUs' }) +
    statCard({ label: 'Stock value (retail)', value: money0(stockValue), icon: 'wallet', meta: 'At ' + loc.name }) +
    statCard({ label: 'Below threshold', value: String(lowCount), icon: 'alert', meta: 'Alert at ' + LOW_STOCK_PACKS + ' packs or fewer', tone: lowCount ? 'warn' : '' }) +
    '</div>' +
    tablePanel + movesPanel;
}

/* ---------------------------------------------------------
   Raw materials
--------------------------------------------------------- */
function productionPreview() {
  var pid = (document.getElementById('prod-product') || {}).value;
  var packs = Number((document.getElementById('prod-packs') || {}).value || 0);
  var host = document.getElementById('bom-preview');
  if (!host) return;
  if (!pid || !packs) {
    host.innerHTML = '<div class="empty empty--inline">' + icon('flask', 18) + '<span>Select a product and enter pack quantity to preview deductions.</span></div>';
    return;
  }
  var rows = bomFor(pid).map(function (b) {
    var req = b.qty * packs;
    var have = Number(b.material.current_stock);
    var short = req > have + 1e-9;
    return '<tr' + (short ? ' class="row-short"' : '') + '>' +
      '<td><span class="cell-strong">' + esc(b.material.name) + '</span><div class="cell-sub">' + esc(b.material.unit) + '</div></td>' +
      '<td class="right num">' + num(req, 3) + '</td>' +
      '<td class="right num">' + num(have, 3) + '</td>' +
      '<td class="right num">' + num(have - req, 3) + '</td>' +
      '<td class="right">' + (short ? pill('Short', 'red') : pill('OK', 'green')) + '</td></tr>';
  }).join('');
  var cost = costPerPack(pid) * packs;
  host.innerHTML = '<div class="tbl-wrap"><table class="tbl tbl--compact"><thead><tr>' +
    '<th>Material</th><th class="right">Required</th><th class="right">Available</th><th class="right">After</th><th class="right">Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="preview-foot"><span>Estimated material cost</span><b class="num">' + money(cost) + '</b></div>';
}

function viewRawMaterials() {
  var value = db.materials.reduce(function (s, m) { return s + m.current_stock * m.cost_per_unit; }, 0);
  var low = db.materials.filter(function (m) { return materialState(m) !== 'ok'; });
  var prodToday = db.movements.filter(function (m) {
    return m.type === 'production' && iso(new Date(m.at)) === todayISO();
  }).reduce(function (s, m) { return s + Number(m.qty); }, 0);
  var avgCost = db.products.reduce(function (s, p) { return s + costPerPack(p.id); }, 0) / db.products.length;

  var prodForm = '<form id="prod-form" class="form-grid">' +
    '<div class="form-row form-row--3">' +
    field('Product', select('product_id', db.products.map(function (p) { return { value: p.id, label: p.name + ' (' + p.sku + ')' }; }), 'p-siu').replace('class="input"', 'class="input" id="prod-product"')) +
    field('Packs produced', '<input class="input" id="prod-packs" name="packs" type="number" min="1" step="1" value="12">') +
    field('Production date', '<input class="input" id="prod-date" name="production_date" type="date" value="' + todayISO() + '">') +
    '</div>' +
    '<div class="panel-inner"><div class="panel-inner-head"><span>Bill of materials deduction</span><span class="muted">Per-pack requirement × pack quantity</span></div>' +
    '<div id="bom-preview"></div></div>' +
    '<div class="form-actions">' +
    btn('Record production intake', 'prod-submit', { variant: 'primary', icon: 'check' }) +
    '<span class="muted form-note">Adds finished goods to Central Kitchen and deducts raw materials.</span>' +
    '</div></form>';

  var matRows = db.materials.map(function (m) {
    var st = materialState(m);
    return '<tr>' +
      '<td><span class="cell-strong">' + esc(m.name) + '</span></td>' +
      '<td class="num">' + esc(m.unit) + '</td>' +
      '<td class="right num">' + money(m.cost_per_unit) + '</td>' +
      '<td class="right num cell-strong">' + num(m.current_stock, 2) + '</td>' +
      '<td class="right num">' + num(m.min_stock_alert, 2) + '</td>' +
      '<td class="right num">' + money(m.current_stock * m.cost_per_unit) + '</td>' +
      '<td class="right">' + pill(st === 'ok' ? 'OK' : st === 'low' ? 'Below min' : 'Out', st === 'ok' ? 'green' : st === 'low' ? 'amber' : 'red') + '</td>' +
      '</tr>';
  });

  var procRows = db.procurement.slice().sort(function (a, b) { return new Date(b.purchase_date) - new Date(a.purchase_date); }).slice(0, 8).map(function (r) {
    var m = material(r.material_id);
    return '<tr><td>' + dateLabel(r.purchase_date, 'short') + '</td>' +
      '<td>' + esc(r.supplier) + '</td>' +
      '<td>' + esc(m ? m.name : '—') + '</td>' +
      '<td class="right num">' + num(r.quantity, 2) + ' ' + esc(m ? m.unit : '') + '</td>' +
      '<td class="right num">' + money(r.unit_cost) + '</td>' +
      '<td class="right num cell-strong">' + money(r.quantity * r.unit_cost) + '</td></tr>';
  });

  return pageHead('Raw Materials', 'Ingredient and packaging stock, bill of materials and procurement',
    btn('Record procurement', 'procure-modal', { variant: 'primary', icon: 'plus' }) +
    btn('Export stock', 'export', { icon: 'download', data: { kind: 'materials' } })) +
    '<div class="stat-grid">' +
    statCard({ label: 'Material stock value', value: money0(value), icon: 'layers', meta: db.materials.length + ' tracked materials and packaging lines' }) +
    statCard({ label: 'Below minimum', value: String(low.length), icon: 'alert', meta: low.length ? low.map(function (m) { return m.name; }).slice(0, 2).join(', ') : 'All above minimum', tone: low.length ? 'warn' : '' }) +
    statCard({ label: 'Packs produced today', value: String(prodToday), icon: 'chef', meta: 'Recorded production intake' }) +
    statCard({ label: 'Average material cost / pack', value: money(avgCost), icon: 'scale', meta: 'Weighted from bill of materials' }) +
    '</div>' +
    panel({ title: 'Batch production entry', sub: 'Finished packs produced deduct raw materials and packaging automatically', body: prodForm }) +
    panel({
      title: 'Material balances', sub: 'Current stock, minimum alert and cost', flush: true,
      body: table([{ label: 'Material' }, { label: 'Unit' }, { label: 'Cost / unit', align: 'right' }, { label: 'On hand', align: 'right' }, { label: 'Minimum', align: 'right' }, { label: 'Value', align: 'right' }, { label: 'Status', align: 'right' }], matRows, { empty: 'No materials' })
    }) +
    panel({
      title: 'Procurement log', sub: 'Recent material purchases', flush: true,
      actions: '<button class="link-btn" data-act="export" data-kind="procurement">Export CSV ' + icon('download', 13) + '</button>',
      body: table([{ label: 'Date' }, { label: 'Supplier' }, { label: 'Material' }, { label: 'Qty', align: 'right' }, { label: 'Unit cost', align: 'right' }, { label: 'Total', align: 'right' }], procRows, { empty: 'No procurement records' })
    });
}
