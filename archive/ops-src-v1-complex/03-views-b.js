/* =========================================================
   Views B — Orders · Dispatch · Finance
   ========================================================= */

function itemsSummary(o) {
  return o.items.map(function (i) {
    var p = product(i.product_id);
    return i.quantity + ' × ' + (p ? p.sku : '—');
  }).join(', ');
}

/* ---------------------------------------------------------
   Orders
--------------------------------------------------------- */
function viewOrders() {
  return pageHead('Orders', 'Direct sales log and consignment reconciliation',
    btn('New direct order', 'order-modal', { variant: 'primary', icon: 'plus' }) +
    btn('Generate consignment drop', 'drop-modal', { icon: 'transfer' })) +
    tabs([{ id: 'direct', label: 'Direct orders' }, { id: 'consignment', label: 'Consignment' }], ui.tab) +
    (ui.tab === 'direct' ? directPanel() : consignmentPanel());
}

function directPanel() {
  var list = directOrders().slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  var q = ui.orderQuery.toLowerCase();
  var filtered = list.filter(function (o) {
    if (ui.orderStatus !== 'all' && o.order_status !== ui.orderStatus) return false;
    if (!q) return true;
    return (o.order_ref + ' ' + o.customer_name + ' ' + o.customer_phone + ' ' + o.delivery_suburb).toLowerCase().indexOf(q) >= 0;
  });
  var open = list.filter(function (o) { return o.order_status === 'pending' || o.order_status === 'confirmed'; });
  var unpaid = list.filter(function (o) { return o.payment_status === 'unpaid' && o.order_status !== 'cancelled'; });
  var revenue = list.filter(function (o) { return o.payment_status === 'paid' && o.order_status !== 'cancelled'; })
    .reduce(function (s, o) { return s + o.total_amount; }, 0);

  var rows = filtered.map(function (o) {
    return '<tr class="row-click" data-act="order-open" data-id="' + o.id + '">' +
      '<td class="mono cell-strong">' + esc(o.order_ref) + '</td>' +
      '<td><span class="cell-strong">' + esc(o.customer_name) + '</span><div class="cell-sub">' + esc(o.customer_phone) + '</div></td>' +
      '<td>' + esc(o.delivery_suburb) + '<div class="cell-sub">' + dateLabel(o.delivery_date, 'short') + '</div></td>' +
      '<td>' + esc(locById(o.destination_location_id).name) + '</td>' +
      '<td class="right num">' + packsOf(o) + '</td>' +
      '<td class="right">' + pill(labelize(o.payment_status), statusTone('payment', o.payment_status)) + '</td>' +
      '<td class="right">' + pill(labelize(o.order_status), statusTone('order', o.order_status)) + '</td>' +
      '<td class="right num cell-strong">' + money(o.total_amount) + '</td>' +
      '</tr>';
  });

  var stats = '<div class="stat-grid stat-grid--3">' +
    statCard({ label: 'Open orders', value: String(open.length), icon: 'receipt', meta: open.filter(function (o) { return o.order_status === 'pending'; }).length + ' pending confirmation' }) +
    statCard({ label: 'Unpaid balance', value: money0(unpaid.reduce(function (s, o) { return s + o.total_amount; }, 0)), icon: 'card', meta: unpaid.length + ' orders awaiting payment', tone: unpaid.length ? 'warn' : '' }) +
    statCard({ label: 'Collected revenue', value: money0(revenue), icon: 'wallet', meta: 'Paid direct orders' }) +
    '</div>';

  var toolbar = '<div class="toolbar">' +
    '<div class="search"><span class="search-ic">' + icon('search', 15) + '</span>' +
    '<input id="order-search" class="input input--search" placeholder="Search ref, customer, suburb" value="' + esc(ui.orderQuery) + '"></div>' +
    '<div class="toolbar-right">' +
    '<select class="input input--select" id="order-status">' +
    ['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(function (s) {
      return '<option value="' + s + '"' + (ui.orderStatus === s ? ' selected' : '') + '>' + (s === 'all' ? 'All statuses' : labelize(s)) + '</option>';
    }).join('') + '</select>' +
    '<button class="btn btn--ghost btn--sm" data-act="export" data-kind="orders">' + icon('download', 15) + '<span>Export</span></button>' +
    '</div></div>';

  return stats + panel({
    title: 'Direct orders (B2C)', sub: 'Facebook and online chat orders', flush: true,
    body: toolbar + table([
      { label: 'Ref', w: '96px' }, { label: 'Customer' }, { label: 'Delivery' }, { label: 'Pickup / source' },
      { label: 'Packs', align: 'right' }, { label: 'Payment', align: 'right' }, { label: 'Status', align: 'right' }, { label: 'Total', align: 'right' }
    ], rows, { empty: 'No orders match this filter' })
  });
}

function consignmentPanel() {
  var drops = consignmentDrops().slice().sort(function (a, b) { return new Date(b.delivery_date) - new Date(a.delivery_date); });
  var unreceivable = receivables();
  var cards = stores().map(function (st) {
    var packs = db.products.reduce(function (s, p) { return s + stockAt(st.id, p.id); }, 0);
    var invoiceOpen = drops.filter(function (o) { return o.destination_location_id === st.id && o.payment_status === 'unpaid' && o.order_status !== 'cancelled'; })
      .reduce(function (s, o) { return s + o.total_amount; }, 0);
    var unsettled = db.settlements.filter(function (s) { return s.location_id === st.id && !s.is_settled; })
      .reduce(function (s, x) { return s + x.net_payable; }, 0);
    return '<article class="store-card">' +
      '<header class="store-card-head"><div><h3>' + esc(st.name) + '</h3><p>' + esc(st.suburb) + ' · ' + esc(st.phone) + '</p></div>' +
      pill('Commission ' + Math.round(st.commission_rate * 100) + '%', 'neutral') + '</header>' +
      '<div class="store-stats">' +
      '<div><span>On hand</span><b class="num">' + packs + ' packs</b></div>' +
      '<div><span>Open invoice</span><b class="num">' + money(invoiceOpen) + '</b></div>' +
      '<div><span>Unsettled</span><b class="num">' + money(unsettled) + '</b></div>' +
      '</div>' +
      '<footer class="store-card-foot">' +
      '<button class="btn btn--ghost btn--sm" data-act="drop-modal" data-loc="' + st.id + '">' + icon('transfer', 14) + '<span>Drop</span></button>' +
      '<button class="btn btn--secondary btn--sm" data-act="settle-modal" data-loc="' + st.id + '">' + icon('scale', 14) + '<span>Settle</span></button>' +
      '</footer></article>';
  }).join('');

  var dropRows = drops.map(function (o) {
    return '<tr class="row-click" data-act="order-open" data-id="' + o.id + '">' +
      '<td class="mono cell-strong">' + esc(o.order_ref) + '</td>' +
      '<td>' + esc(locById(o.destination_location_id).name) + '</td>' +
      '<td>' + dateLabel(o.delivery_date, 'short') + '</td>' +
      '<td class="right num">' + packsOf(o) + '</td>' +
      '<td class="right">' + pill(labelize(o.fulfillment_status), statusTone('fulfil', o.fulfillment_status)) + '</td>' +
      '<td class="right">' + pill(labelize(o.payment_status), statusTone('payment', o.payment_status)) + '</td>' +
      '<td class="right num cell-strong">' + money(o.total_amount) + '</td>' +
      '</tr>';
  });

  var setRows = db.settlements.slice().sort(function (a, b) { return new Date(b.settlement_date) - new Date(a.settlement_date); }).map(function (s) {
    var units = (s.items || []).reduce(function (a, i) { return a + i.sold_qty; }, 0);
    return '<tr>' +
      '<td>' + dateLabel(s.settlement_date, 'short') + '</td>' +
      '<td>' + esc(locById(s.location_id).name) + '</td>' +
      '<td class="right num">' + units + '</td>' +
      '<td class="right num">' + money(s.gross_sales) + '</td>' +
      '<td class="right num">-' + money(s.commission_amount) + '</td>' +
      '<td class="right num cell-strong">' + money(s.net_payable) + '</td>' +
      '<td class="right">' + pill(s.is_settled ? 'Settled' : 'Unsettled', s.is_settled ? 'green' : 'amber') + '</td>' +
      '<td class="right">' + (s.is_settled ? '<span class="cell-sub">Received</span>' : '<button class="link-btn" data-act="settle-mark" data-id="' + s.id + '">Mark settled</button>') + '</td>' +
      '</tr>';
  });

  var stats = '<div class="stat-grid stat-grid--3">' +
    statCard({ label: 'Partner stores', value: String(stores().length), icon: 'store', meta: stores().map(function (s) { return s.name.replace(' Store', ''); }).join(' · ') }) +
    statCard({ label: 'Consignment stock on hand', value: String(stores().reduce(function (s, st) { return s + db.products.reduce(function (a, p) { return a + stockAt(st.id, p.id); }, 0); }, 0)) + ' packs', icon: 'package', meta: 'Across all partner locations' }) +
    statCard({ label: 'Outstanding from stores', value: money0(unreceivable.reduce(function (s, r) { return s + r.amount; }, 0)), icon: 'receipt', meta: unreceivable.length + ' open items', tone: unreceivable.length ? 'warn' : '' }) +
    '</div>';

  return stats +
    '<div class="store-grid">' + cards + '</div>' +
    panel({
      title: 'Consignment drops', sub: 'Stock transferred to partner stores at wholesale value', flush: true,
      body: table([{ label: 'Ref' }, { label: 'Store' }, { label: 'Delivery' }, { label: 'Packs', align: 'right' }, { label: 'Fulfilment', align: 'right' }, { label: 'Invoice', align: 'right' }, { label: 'Value', align: 'right' }], dropRows, { empty: 'No drops recorded' })
    }) +
    panel({
      title: 'Settlement history', sub: 'Reconciliation of reported sales, commission and net payable', flush: true,
      body: table([{ label: 'Date' }, { label: 'Store' }, { label: 'Units sold', align: 'right' }, { label: 'Gross sales', align: 'right' }, { label: 'Commission', align: 'right' }, { label: 'Net payable', align: 'right' }, { label: 'Status', align: 'right' }, { label: '', align: 'right' }], setRows, { empty: 'No settlements recorded' })
    });
}

function orderDetail(id) {
  var o = orderById(id);
  if (!o) return;
  var isDrop = o.channel === 'consignment_drop';
  var loc = locById(o.destination_location_id);
  var itemRows = o.items.map(function (i) {
    var p = product(i.product_id);
    return '<tr><td><span class="cell-strong">' + esc(p ? p.name : '—') + '</span><div class="cell-sub mono">' + esc(p ? p.sku : '') + '</div></td>' +
      '<td class="right num">' + i.quantity + '</td>' +
      '<td class="right num">' + money(i.unit_price) + '</td>' +
      '<td class="right num cell-strong">' + money(i.quantity * i.unit_price) + '</td></tr>';
  }).join('');

  var body = '<div class="detail-grid">' +
    '<div class="detail-block"><h4>Order</h4>' +
    '<div class="kv"><span>Reference</span><b class="mono">' + esc(o.order_ref) + '</b></div>' +
    '<div class="kv"><span>Channel</span><b>' + (isDrop ? 'Consignment drop' : 'Direct (B2C)') + '</b></div>' +
    '<div class="kv"><span>Created</span><b>' + new Date(o.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</b></div>' +
    '<div class="kv"><span>Delivery date</span><b>' + dateLabel(o.delivery_date) + '</b></div>' +
    '</div>' +
    '<div class="detail-block"><h4>' + (isDrop ? 'Store' : 'Customer') + '</h4>' +
    '<div class="kv"><span>' + (isDrop ? 'Store' : 'Name') + '</span><b>' + esc(o.customer_name) + '</b></div>' +
    (o.customer_phone ? '<div class="kv"><span>Phone</span><b>' + esc(o.customer_phone) + '</b></div>' : '') +
    '<div class="kv"><span>Suburb</span><b>' + esc(o.delivery_suburb) + '</b></div>' +
    '<div class="kv"><span>' + (isDrop ? 'Invoice' : 'Pickup / source') + '</span><b>' + esc(loc.name) + '</b></div>' +
    '</div>' +
    '<div class="detail-block"><h4>Fulfilment</h4>' +
    '<div class="kv"><span>Dispatch</span><b>' + pill(labelize(o.fulfillment_status), statusTone('fulfil', o.fulfillment_status)) + '</b></div>' +
    '<div class="kv"><span>Payment</span><b>' + pill(labelize(o.payment_status), statusTone('payment', o.payment_status)) + '</b></div>' +
    '<div class="kv"><span>Method</span><b>' + labelize(o.payment_method) + '</b></div>' +
    '<div class="kv"><span>Order status</span><b>' + pill(labelize(o.order_status), statusTone('order', o.order_status)) + '</b></div>' +
    '</div></div>' +
    '<div class="tbl-wrap"><table class="tbl tbl--compact"><thead><tr><th>Item</th><th class="right">Packs</th><th class="right">Unit price</th><th class="right">Amount</th></tr></thead>' +
    '<tbody>' + itemRows + '</tbody><tfoot><tr><td>Total</td><td class="right num">' + packsOf(o) + '</td><td></td><td class="right num cell-strong">' + money(o.total_amount) + '</td></tr></tfoot></table></div>';

  var footer = '';
  if (o.order_status !== 'cancelled' && o.order_status !== 'completed') {
    footer += '<button class="btn btn--primary" data-act="order-advance" data-id="' + o.id + '">' + icon('chevronRight', 15) + '<span>' + nextActionLabel(o) + '</span></button>';
  }
  if (o.payment_status === 'unpaid' && o.order_status !== 'cancelled') {
    footer += '<button class="btn btn--secondary" data-act="order-paid" data-id="' + o.id + '">' + icon('check', 15) + '<span>Mark paid</span></button>';
  }
  if (o.order_status !== 'cancelled' && o.order_status !== 'completed') {
    footer += '<button class="btn btn--ghost" data-act="order-cancel" data-id="' + o.id + '">' + icon('x', 15) + '<span>Cancel</span></button>';
  }
  footer += '<button class="btn btn--ghost" data-act="modal-close"><span>Close</span></button>';

  modal({
    title: o.order_ref,
    sub: labelize(o.channel) + ' · ' + dateLabel(o.delivery_date) + ' · ' + money(o.total_amount),
    body: body,
    footer: footer,
    wide: true
  });
}

function nextActionLabel(o) {
  if (o.payment_status === 'unpaid' && o.order_status === 'pending') return 'Confirm order';
  if (o.order_status === 'pending') return 'Confirm order';
  if (o.fulfillment_status === 'pending') return 'Mark packed';
  if (o.fulfillment_status === 'packed') return 'Dispatch — in transit';
  if (o.fulfillment_status === 'in_transit') return 'Mark delivered';
  return 'Complete order';
}

/* ---------------------------------------------------------
   Dispatch
--------------------------------------------------------- */
function dispatchRows() {
  var list = db.orders.filter(function (o) { return o.order_status !== 'cancelled'; });
  if (ui.dispatchDate !== 'all') list = list.filter(function (o) { return o.delivery_date === ui.dispatchDate; });
  if (ui.dispatchSuburb !== 'all') list = list.filter(function (o) { return o.delivery_suburb === ui.dispatchSuburb; });
  if (ui.dispatchStatus !== 'all') list = list.filter(function (o) { return o.fulfillment_status === ui.dispatchStatus; });
  return list.sort(function (a, b) {
    if (a.delivery_date !== b.delivery_date) return a.delivery_date < b.delivery_date ? -1 : 1;
    if (a.delivery_suburb !== b.delivery_suburb) return a.delivery_suburb < b.delivery_suburb ? -1 : 1;
    return a.order_ref < b.order_ref ? -1 : 1;
  });
}

function viewDispatch() {
  var all = db.orders.filter(function (o) { return o.order_status !== 'cancelled'; });
  var dates = all.map(function (o) { return o.delivery_date; })
    .filter(function (v, i, a) { return v && a.indexOf(v) === i; })
    .sort();
  var suburbs = all.map(function (o) { return o.delivery_suburb; })
    .filter(function (v, i, a) { return v && a.indexOf(v) === i; })
    .sort();

  var list = dispatchRows();
  var counts = { pending: 0, packed: 0, in_transit: 0, delivered: 0 };
  list.forEach(function (o) { counts[o.fulfillment_status] = (counts[o.fulfillment_status] || 0) + 1; });

  var filters = '<div class="toolbar toolbar--filters">' +
    '<div class="filter-group">' + icon('calendar', 15) +
    '<select class="input input--select" id="disp-date"><option value="all">All dates</option>' +
    dates.map(function (d) { return '<option value="' + d + '"' + (ui.dispatchDate === d ? ' selected' : '') + '>' + dateLabel(d) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="filter-group">' + icon('pin', 15) +
    '<select class="input input--select" id="disp-suburb"><option value="all">All suburbs</option>' +
    suburbs.map(function (s) { return '<option value="' + esc(s) + '"' + (ui.dispatchSuburb === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="filter-group">' + icon('filter', 15) +
    '<select class="input input--select" id="disp-status"><option value="all">All stages</option>' +
    ['pending', 'packed', 'in_transit', 'delivered'].map(function (s) {
      return '<option value="' + s + '"' + (ui.dispatchStatus === s ? ' selected' : '') + '>' + labelize(s) + '</option>';
    }).join('') + '</select></div>' +
    '<div class="toolbar-right">' +
    '<button class="btn btn--ghost btn--sm" data-act="export" data-kind="dispatch">' + icon('download', 15) + '<span>Export</span></button>' +
    '<button class="btn btn--secondary btn--sm" data-act="print-manifest">' + icon('printer', 15) + '<span>Print manifest</span></button>' +
    '</div></div>';

  var groups = {};
  list.forEach(function (o) {
    var key = o.delivery_date + '|' + o.delivery_suburb;
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  });
  var keys = Object.keys(groups).sort();

  var groupsHtml = keys.map(function (k) {
    var parts = k.split('|');
    var orders = groups[k];
    var packs = orders.reduce(function (s, o) { return s + packsOf(o); }, 0);
    var rows = orders.map(function (o) {
      var action = '';
      var next = o.fulfillment_status === 'pending' ? 'Mark packed' : o.fulfillment_status === 'packed' ? 'In transit' : o.fulfillment_status === 'in_transit' ? 'Delivered' : '';
      if (next) action = '<button class="btn btn--secondary btn--xs" data-act="advance" data-id="' + o.id + '">' + esc(next) + '</button>';
      else action = '<span class="cell-sub">Completed</span>';
      return '<tr>' +
        '<td class="mono cell-strong">' + esc(o.order_ref) + '</td>' +
        '<td>' + esc(o.customer_name) + '<div class="cell-sub">' + (o.channel === 'direct_facebook' ? 'Direct' : 'Consignment drop') + '</div></td>' +
        '<td class="cell-sub">' + esc(itemsSummary(o)) + '</td>' +
        '<td class="right num">' + packsOf(o) + '</td>' +
        '<td class="right">' + pill(labelize(o.payment_status), statusTone('payment', o.payment_status)) + '</td>' +
        '<td class="right">' + pill(labelize(o.fulfillment_status), statusTone('fulfil', o.fulfillment_status)) + '</td>' +
        '<td class="right">' + action + '</td></tr>';
    }).join('');
    return '<div class="dispatch-group">' +
      '<div class="dispatch-group-head"><div><span class="dgh-date">' + dateLabel(parts[0], 'weekday') + '</span>' +
      '<span class="dgh-sep">/</span><span class="dgh-suburb">' + icon('pin', 14) + esc(parts[1]) + '</span></div>' +
      '<div class="dgh-meta"><span>' + orders.length + ' orders</span><span>' + packs + ' packs</span></div></div>' +
      table([{ label: 'Ref', w: '96px' }, { label: 'Customer' }, { label: 'Items' }, { label: 'Packs', align: 'right' }, { label: 'Payment', align: 'right' }, { label: 'Stage', align: 'right' }, { label: '', align: 'right', w: '104px' }], [rows]) +
      '</div>';
  }).join('');

  var manifest = {};
  list.forEach(function (o) {
    o.items.forEach(function (i) {
      if (!manifest[i.product_id]) manifest[i.product_id] = { packs: 0, units: 0 };
      manifest[i.product_id].packs += i.quantity;
      manifest[i.product_id].units += i.quantity * product(i.product_id).units_per_pack;
    });
  });
  var manifestRows = Object.keys(manifest).sort().map(function (pid) {
    var p = product(pid);
    return '<tr><td class="mono">' + esc(p.sku) + '</td><td><span class="cell-strong">' + esc(p.name) + '</span></td>' +
      '<td class="right num cell-strong">' + manifest[pid].packs + '</td>' +
      '<td class="right num">' + num(manifest[pid].units) + '</td></tr>';
  });
  var totalPacks = list.reduce(function (s, o) { return s + packsOf(o); }, 0);
  var totalUnits = list.reduce(function (s, o) { return s + unitsOf(o); }, 0);

  var manifestPanel = panel({
    cls: 'manifest',
    title: 'Driver manifest', sub: (ui.dispatchDate === 'all' ? 'All scheduled dates' : dateLabel(ui.dispatchDate)) + ' · ' + (ui.dispatchSuburb === 'all' ? 'All suburbs' : ui.dispatchSuburb),
    flush: true,
    body: table([{ label: 'SKU' }, { label: 'Product' }, { label: 'Packs', align: 'right' }, { label: 'Units', align: 'right' }], manifestRows, { empty: 'Nothing to load for this filter' }),
    foot: '<span>' + list.length + ' orders · ' + keys.length + ' delivery groups</span><span class="num">' + totalPacks + ' packs · ' + num(totalUnits) + ' pcs</span>'
  });

  return pageHead('Dispatch', 'Delivery queue grouped by scheduled date and suburb',
    btn('Export dispatch list', 'export', { icon: 'download', data: { kind: 'dispatch' } })) +
    filters +
    '<div class="stat-grid stat-grid--4">' +
    statCard({ label: 'To pack', value: String(counts.pending), icon: 'package', meta: 'Pending pack' }) +
    statCard({ label: 'Packed', value: String(counts.packed), icon: 'layers', meta: 'Ready for driver' }) +
    statCard({ label: 'In transit', value: String(counts.in_transit), icon: 'truck', meta: 'On the road' }) +
    statCard({ label: 'Delivered', value: String(counts.delivered), icon: 'check', meta: 'Completed in this filter' }) +
    '</div>' +
    '<div class="grid-2 grid-2--wide">' +
    panel({ title: 'Dispatch list', sub: list.length + ' orders in current filter', flush: true, body: groupsHtml || '<div class="empty">' + icon('inbox', 22) + '<span>No orders for this filter</span></div>' }) +
    manifestPanel + '</div>';
}

/* ---------------------------------------------------------
   Finance
--------------------------------------------------------- */
function viewFinance() {
  var s = salesSummary();
  var cogs = cogsSummary();
  var opex = opexTotal();
  var receiv = receivables();
  var grossMargin = s.total - s.commission - cogs.total;
  var net = grossMargin - opex;

  var revenueRows = [
    { label: 'Direct orders (' + s.directCount + ' paid)', amount: s.directRevenue, sub: 'Facebook and online chat' },
    { label: 'Consignment gross sales', amount: s.consignGross, sub: db.settlements.length + ' settlement records' },
    { label: 'Store commission', amount: -s.commission, sub: 'Deducted by partner stores' }
  ].map(function (r) {
    return '<tr><td><span class="cell-strong">' + esc(r.label) + '</span><div class="cell-sub">' + esc(r.sub) + '</div></td>' +
      '<td class="right num ' + (r.amount < 0 ? 'is-negative' : '') + '">' + money(r.amount) + '</td></tr>';
  }).join('');

  var cogsRows = cogs.rows.map(function (r) {
    var price = r.product.retail_price;
    var c = costPerPack(r.product.id);
    var margin = price > 0 ? (price - c) / price : 0;
    return '<tr><td><span class="cell-strong">' + esc(r.product.name) + '</span><div class="cell-sub mono">' + esc(r.product.sku) + '</div></td>' +
      '<td class="right num">' + r.packs + '</td>' +
      '<td class="right num">' + money(c) + '</td>' +
      '<td class="right num">' + money(price) + '</td>' +
      '<td class="right num">' + pct(margin) + '</td>' +
      '<td class="right num cell-strong">' + money(r.cost) + '</td></tr>';
  });

  var recRows = receiv.map(function (r) {
    return '<tr><td>' + dateLabel(r.date, 'short') + '</td>' +
      '<td>' + esc(r.party) + '</td>' +
      '<td>' + pill(r.kind === 'invoice' ? 'Invoice' : 'Settlement', r.kind === 'invoice' ? 'blue' : 'neutral') + '</td>' +
      '<td class="mono">' + esc(r.ref) + '</td>' +
      '<td class="right num cell-strong">' + money(r.amount) + '</td>' +
      '<td class="right">' + (r.kind === 'settlement'
        ? '<button class="link-btn" data-act="settle-mark" data-id="' + r.id + '">Mark settled</button>'
        : '<button class="link-btn" data-act="invoice-paid" data-id="' + r.id + '">Mark paid</button>') + '</td></tr>';
  });

  var expRows = db.expenses.slice().sort(function (a, b) { return new Date(b.expense_date) - new Date(a.expense_date); }).map(function (e) {
    return '<tr><td>' + dateLabel(e.expense_date, 'short') + '</td>' +
      '<td><span class="cell-strong">' + esc(e.category) + '</span><div class="cell-sub">' + esc(e.description) + '</div></td>' +
      '<td class="right num cell-strong">' + money(e.amount) + '</td>' +
      '<td class="right"><button class="link-btn link-btn--danger" data-act="expense-del" data-id="' + e.id + '">Remove</button></td></tr>';
  });

  var ledger = [];
  directOrders().forEach(function (o) {
    if (o.payment_status === 'paid' && o.order_status !== 'cancelled') {
      ledger.push({ date: o.delivery_date, type: 'Revenue', ref: o.order_ref, desc: 'Direct order — ' + o.customer_name, amount: o.total_amount });
    }
  });
  db.settlements.forEach(function (st) {
    ledger.push({ date: st.settlement_date, type: 'Revenue', ref: 'SET-' + st.id.slice(-4).toUpperCase(), desc: 'Consignment gross — ' + locById(st.location_id).name, amount: st.gross_sales });
    ledger.push({ date: st.settlement_date, type: 'Cost', ref: 'SET-' + st.id.slice(-4).toUpperCase(), desc: 'Store commission', amount: -st.commission_amount });
  });
  db.expenses.forEach(function (e) {
    ledger.push({ date: e.expense_date, type: 'Expense', ref: 'EXP-' + e.id.slice(-4).toUpperCase(), desc: e.category + ' — ' + e.description, amount: -e.amount });
  });
  ledger.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  var ledgerRows = ledger.slice(0, 12).map(function (l) {
    var tone = l.type === 'Revenue' ? 'green' : l.type === 'Cost' ? 'amber' : 'red';
    return '<tr><td>' + dateLabel(l.date, 'short') + '</td>' +
      '<td>' + pill(l.type, tone) + '</td>' +
      '<td class="mono">' + esc(l.ref) + '</td>' +
      '<td class="cell-sub">' + esc(l.desc) + '</td>' +
      '<td class="right num ' + (l.amount < 0 ? 'is-negative' : '') + '">' + money(l.amount) + '</td></tr>';
  });

  return pageHead('Finance', 'Revenue, cost of goods, operating expenses and receivables',
    btn('Add operating expense', 'expense-modal', { variant: 'primary', icon: 'plus' }) +
    btn('Export ledger', 'export', { icon: 'download', data: { kind: 'ledger' } })) +
    '<div class="stat-grid stat-grid--3">' +
    statCard({ label: 'Gross revenue', value: money0(s.total), icon: 'wallet', meta: 'Direct + consignment' }) +
    statCard({ label: 'Cost of goods sold', value: money0(cogs.total), icon: 'scale', meta: cogs.packs + ' packs at BOM cost' }) +
    statCard({ label: 'Gross margin', value: money0(grossMargin), icon: 'arrowUpRight', meta: s.total ? pct(grossMargin / s.total) + ' of gross revenue' : '—', tone: 'good' }) +
    statCard({ label: 'Operating expenses', value: money0(opex), icon: 'card', meta: db.expenses.length + ' expense entries' }) +
    statCard({ label: 'Net profit', value: money0(net), icon: 'check', meta: 'After commission, COGS and expenses', tone: net >= 0 ? 'good' : 'warn' }) +
    statCard({ label: 'Outstanding receivables', value: money0(receivablesTotal()), icon: 'receipt', meta: receiv.length + ' open items', tone: receiv.length ? 'warn' : '' }) +
    '</div>' +
    '<div class="grid-2">' +
    panel({ title: 'Revenue overview', sub: 'Recognised to date', body: '<div class="tbl-wrap"><table class="tbl tbl--compact"><tbody>' + revenueRows + '</tbody><tfoot><tr><td>Net revenue after commission</td><td class="right num cell-strong">' + money(s.total - s.commission) + '</td></tr></tfoot></table></div>' }) +
    panel({ title: 'Cost allocation', sub: 'Cost of goods sold by product', flush: true, body: table([{ label: 'Product' }, { label: 'Packs sold', align: 'right' }, { label: 'Cost / pack', align: 'right' }, { label: 'Retail', align: 'right' }, { label: 'Margin', align: 'right' }, { label: 'COGS', align: 'right' }], cogsRows, { empty: 'No sales recognised yet' }) }) +
    '</div>' +
    panel({
      title: 'Receivables log', sub: 'Unsettled partner balances and unpaid invoices', flush: true,
      body: table([{ label: 'Date' }, { label: 'Party' }, { label: 'Type' }, { label: 'Reference' }, { label: 'Amount', align: 'right' }, { label: '', align: 'right' }], recRows, { empty: 'Nothing outstanding' })
    }) +
    '<div class="grid-2">' +
    panel({ title: 'Operating expenses', sub: 'Delivery, gas and kitchen consumables', flush: true, body: table([{ label: 'Date' }, { label: 'Category' }, { label: 'Amount', align: 'right' }, { label: '', align: 'right' }], expRows, { empty: 'No expenses recorded' }) }) +
    panel({ title: 'Ledger', sub: 'Most recent entries across all accounts', flush: true, body: table([{ label: 'Date' }, { label: 'Type' }, { label: 'Ref' }, { label: 'Description' }, { label: 'Amount', align: 'right' }], ledgerRows, { empty: 'No ledger entries' }) }) +
    '</div>';
}
