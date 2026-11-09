/* =========================================================
   makuru. OPS — core: tokens, icons, data model, helpers, UI primitives
   Utilitarian. English only. No emojis, no images.
   ========================================================= */
'use strict';

var STORE_KEY = 'makuru_ops_v1';
var LOW_STOCK_PACKS = 6;
var CENTRAL = 'loc-central';

/* ---------------------------------------------------------
   Icons (Lucide-style, 24x24, stroke 1.75)
--------------------------------------------------------- */
var ICON = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/>',
  package: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  flask: '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 13 4 4L19 7"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUpRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  store: '<path d="M3 9 5 3h14l2 6"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/><path d="M3 9h18"/>',
  chef: '<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54Z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  transfer: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>'
};
function icon(name, size) {
  var s = size || 18;
  return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || '') + '</svg>';
}

/* ---------------------------------------------------------
   Formatting / date helpers
--------------------------------------------------------- */
function money(n) {
  var v = Number(n || 0);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function money0(n) {
  var v = Number(n || 0);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-AU', { maximumFractionDigits: 0 });
}
function num(n, d) {
  return Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d });
}
function qtyFmt(n) {
  var v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
}
function pct(n) { return (n * 100).toFixed(1) + '%'; }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function iso(d) {
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function todayISO() { return iso(new Date()); }
function addDays(baseISO, n) {
  var d = baseISO ? new Date(baseISO + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
function dateLabel(v, opt) {
  if (!v) return '—';
  var d = new Date(String(v).length > 10 ? v : v + 'T00:00:00');
  if (isNaN(d)) return '—';
  var o = { day: 'numeric', month: 'short' };
  if (opt !== 'short') o.year = 'numeric';
  if (opt === 'weekday') o.weekday = 'short';
  return d.toLocaleDateString('en-AU', o);
}
function longDate(v) {
  var d = v ? new Date(String(v).length > 10 ? v : v + 'T00:00:00') : new Date();
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function uid(p) { return (p || 'id') + '-' + Math.random().toString(36).slice(2, 9); }

/* ---------------------------------------------------------
   Seed data (mirrors the PostgreSQL schema in the brief)
--------------------------------------------------------- */
function seedDB() {
  var T = todayISO();
  var locs = [
    { id: CENTRAL, name: 'Central Kitchen', type: 'central', suburb: 'Alexandria NSW 2015', phone: '+61 412 555 018', is_active: true, commission_rate: 0 },
    { id: 'loc-campsie', name: 'Campsie Store', type: 'consignment', suburb: 'Campsie NSW 2194', phone: '+61 411 204 882', is_active: true, commission_rate: 0.20 },
    { id: 'loc-eastwood', name: 'Eastwood Store', type: 'consignment', suburb: 'Eastwood NSW 2122', phone: '+61 403 771 290', is_active: true, commission_rate: 0.22 },
    { id: 'loc-hurstville', name: 'Hurstville Store', type: 'consignment', suburb: 'Hurstville NSW 2220', phone: '+61 412 909 664', is_active: true, commission_rate: 0.18 }
  ];

  var prods = [
    { id: 'p-siu', sku: 'MK-SIU-06', name: 'Siomay Chicken & Prawn', units_per_pack: 6, retail_price: 12.50, wholesale_price: 9.00 },
    { id: 'p-hgw', sku: 'MK-HGW-06', name: 'Har Gow Prawn', units_per_pack: 6, retail_price: 14.00, wholesale_price: 10.00 },
    { id: 'p-bao', sku: 'MK-BAO-03', name: 'Char Siu Bao', units_per_pack: 3, retail_price: 11.00, wholesale_price: 8.00 },
    { id: 'p-gyo', sku: 'MK-GYO-08', name: 'Gyoza Chicken', units_per_pack: 8, retail_price: 13.50, wholesale_price: 9.50 },
    { id: 'p-wnt', sku: 'MK-WNT-10', name: 'Chili Oil Wonton', units_per_pack: 10, retail_price: 15.50, wholesale_price: 11.00 },
    { id: 'p-frz', sku: 'MK-FRZ-30', name: 'Frozen Mix Pack', units_per_pack: 30, retail_price: 32.00, wholesale_price: 24.00 },
    { id: 'p-cho', sku: 'MK-CHO-22', name: 'Chili Oil Jar', units_per_pack: 1, retail_price: 14.00, wholesale_price: 10.00 }
  ];

  var mats = [
    { id: 'm-chicken', name: 'Chicken thigh', unit: 'kg', current_stock: 38.5, min_stock_alert: 20, cost_per_unit: 11.90 },
    { id: 'm-prawn', name: 'Prawn, peeled', unit: 'kg', current_stock: 14.2, min_stock_alert: 15, cost_per_unit: 32.00 },
    { id: 'm-wrapper', name: 'Dumpling wrapper sheets', unit: 'pack', current_stock: 34, min_stock_alert: 20, cost_per_unit: 6.50 },
    { id: 'm-flour', name: 'Plain flour', unit: 'kg', current_stock: 22, min_stock_alert: 10, cost_per_unit: 2.20 },
    { id: 'm-season', name: 'Seasoning mix', unit: 'kg', current_stock: 5.8, min_stock_alert: 4, cost_per_unit: 14.50 },
    { id: 'm-chili', name: 'Chili oil (house batch)', unit: 'kg', current_stock: 7.4, min_stock_alert: 6, cost_per_unit: 8.00 },
    { id: 'm-carrot', name: 'Carrot', unit: 'kg', current_stock: 4.2, min_stock_alert: 3, cost_per_unit: 3.40 },
    { id: 'm-cabbage', name: 'Cabbage', unit: 'kg', current_stock: 6.1, min_stock_alert: 3, cost_per_unit: 2.80 },
    { id: 'm-soy', name: 'Soy sauce', unit: 'kg', current_stock: 8.5, min_stock_alert: 4, cost_per_unit: 5.20 },
    { id: 'm-bag', name: 'Vacuum bags', unit: 'pcs', current_stock: 520, min_stock_alert: 300, cost_per_unit: 0.18 },
    { id: 'm-label', name: 'Labeling stickers', unit: 'pcs', current_stock: 640, min_stock_alert: 400, cost_per_unit: 0.06 },
    { id: 'm-carton', name: 'Delivery cartons', unit: 'pcs', current_stock: 96, min_stock_alert: 50, cost_per_unit: 0.85 }
  ];

  var bom = [
    ['p-siu', 'm-chicken', 0.150], ['p-siu', 'm-prawn', 0.090], ['p-siu', 'm-wrapper', 0.100], ['p-siu', 'm-carrot', 0.030], ['p-siu', 'm-season', 0.008], ['p-siu', 'm-bag', 1], ['p-siu', 'm-label', 1],
    ['p-hgw', 'm-prawn', 0.150], ['p-hgw', 'm-wrapper', 0.100], ['p-hgw', 'm-season', 0.008], ['p-hgw', 'm-bag', 1], ['p-hgw', 'm-label', 1],
    ['p-bao', 'm-flour', 0.120], ['p-bao', 'm-chicken', 0.050], ['p-bao', 'm-season', 0.010], ['p-bao', 'm-bag', 1], ['p-bao', 'm-label', 1],
    ['p-gyo', 'm-chicken', 0.160], ['p-gyo', 'm-wrapper', 0.100], ['p-gyo', 'm-cabbage', 0.040], ['p-gyo', 'm-season', 0.010], ['p-gyo', 'm-soy', 0.010], ['p-gyo', 'm-bag', 1], ['p-gyo', 'm-label', 1],
    ['p-wnt', 'm-chicken', 0.140], ['p-wnt', 'm-wrapper', 0.120], ['p-wnt', 'm-chili', 0.050], ['p-wnt', 'm-season', 0.008], ['p-wnt', 'm-soy', 0.020], ['p-wnt', 'm-bag', 1], ['p-wnt', 'm-label', 1],
    ['p-frz', 'm-chicken', 0.250], ['p-frz', 'm-prawn', 0.120], ['p-frz', 'm-wrapper', 0.200], ['p-frz', 'm-cabbage', 0.050], ['p-frz', 'm-season', 0.020], ['p-frz', 'm-bag', 1], ['p-frz', 'm-label', 1], ['p-frz', 'm-carton', 1],
    ['p-cho', 'm-chili', 1], ['p-cho', 'm-label', 1], ['p-cho', 'm-carton', 0.25]
  ].map(function (r) { return { id: uid('bom'), product_id: r[0], raw_material_id: r[1], qty_required: r[2] }; });

  var inv = [];
  function put(loc, prod, q) { inv.push({ id: uid('inv'), location_id: loc, product_id: prod, qty_on_hand: q }); }
  put(CENTRAL, 'p-siu', 46); put(CENTRAL, 'p-hgw', 28); put(CENTRAL, 'p-bao', 34); put(CENTRAL, 'p-gyo', 22);
  put(CENTRAL, 'p-wnt', 18); put(CENTRAL, 'p-frz', 12); put(CENTRAL, 'p-cho', 15);
  put('loc-campsie', 'p-siu', 14); put('loc-campsie', 'p-hgw', 8); put('loc-campsie', 'p-bao', 6); put('loc-campsie', 'p-gyo', 10); put('loc-campsie', 'p-frz', 4); put('loc-campsie', 'p-cho', 3);
  put('loc-eastwood', 'p-siu', 9); put('loc-eastwood', 'p-hgw', 12); put('loc-eastwood', 'p-bao', 0); put('loc-eastwood', 'p-gyo', 6); put('loc-eastwood', 'p-wnt', 5); put('loc-eastwood', 'p-cho', 2);
  put('loc-hurstville', 'p-siu', 6); put('loc-hurstville', 'p-hgw', 4); put('loc-hurstville', 'p-bao', 8); put('loc-hurstville', 'p-gyo', 3); put('loc-hurstville', 'p-wnt', 2); put('loc-hurstville', 'p-frz', 2); put('loc-hurstville', 'p-cho', 1);

  var orders = [];
  function order(o) {
    o.items = o.items.map(function (it) {
      var p = prods.filter(function (x) { return x.id === it[0]; })[0];
      return { id: uid('oi'), product_id: it[0], quantity: it[1], unit_price: it[2] === 'w' ? p.wholesale_price : p.retail_price };
    });
    o.total_amount = o.items.reduce(function (s, i) { return s + i.quantity * i.unit_price; }, 0);
    o.created_at = o.created_at || new Date().toISOString();
    orders.push(o);
  }

  var direct = [
    ['D-1041', 'Mei Lin Tan', '0412 884 201', 'Campsie', 'loc-campsie', 0, 'delivered', 'paid', 'payid', [['p-siu', 2], ['p-hgw', 1], ['p-cho', 1]]],
    ['D-1042', 'Andrew Vu', '0433 771 908', 'Strathfield', CENTRAL, -1, 'delivered', 'paid', 'bank_transfer', [['p-bao', 2], ['p-gyo', 2]]],
    ['D-1043', 'Priya Raman', '0455 209 114', 'Ashfield', CENTRAL, 0, 'in_transit', 'paid', 'payid', [['p-siu', 3], ['p-wnt', 1]]],
    ['D-1044', 'Daniel Okafor', '0421 660 377', 'Eastwood', 'loc-eastwood', 0, 'packed', 'unpaid', 'cash', [['p-hgw', 2], ['p-frz', 1]]],
    ['D-1045', 'Kelly Nguyen', '0402 118 763', 'Hurstville', 'loc-hurstville', 1, 'pending', 'unpaid', 'bank_transfer', [['p-siu', 2], ['p-bao', 1]]],
    ['D-1046', 'Marco Bianchi', '0466 903 512', 'Burwood', CENTRAL, 1, 'pending', 'paid', 'payid', [['p-gyo', 3], ['p-wnt', 1], ['p-cho', 2]]],
    ['D-1047', 'Sarah Whitmore', '0417 335 220', 'Chatswood', CENTRAL, 2, 'pending', 'unpaid', 'bank_transfer', [['p-siu', 4]]],
    ['D-1048', 'Hana Sato', '0438 552 907', 'Marrickville', CENTRAL, 2, 'pending', 'paid', 'payid', [['p-frz', 2], ['p-hgw', 1]]],
    ['D-1049', 'Tom Beckett', '0409 774 118', 'Campsie', 'loc-campsie', -2, 'delivered', 'paid', 'cash', [['p-bao', 3], ['p-siu', 1]]],
    ['D-1050', 'Ivy Chen', '0452 660 843', 'Eastwood', 'loc-eastwood', -1, 'delivered', 'paid', 'payid', [['p-wnt', 2], ['p-gyo', 2]]],
    ['D-1051', 'Ravi Menon', '0413 220 776', 'Lidcombe', CENTRAL, 3, 'pending', 'unpaid', 'cash', [['p-siu', 2], ['p-gyo', 1], ['p-cho', 1]]],
    ['D-1052', 'Grace Lim', '0422 907 331', 'Hurstville', 'loc-hurstville', 3, 'pending', 'unpaid', 'bank_transfer', [['p-bao', 2], ['p-hgw', 2]]]
  ];
  direct.forEach(function (d) {
    order({
      id: uid('ord'), order_ref: d[0], channel: 'direct_facebook', destination_location_id: d[4],
      customer_name: d[1], customer_phone: d[2], delivery_suburb: d[3], delivery_date: addDays(T, d[5]),
      fulfillment_status: d[6], order_status: d[6] === 'delivered' ? 'completed' : d[6] === 'pending' ? 'pending' : 'confirmed',
      payment_status: d[7], payment_method: d[8],
      items: d[9], created_at: new Date(Date.now() - (Math.abs(d[5]) + 1) * 86400000).toISOString()
    });
  });

  var drops = [
    ['C-2071', 'loc-campsie', 0, 'in_transit', 'unpaid', [['p-siu', 12, 'w'], ['p-gyo', 8, 'w'], ['p-cho', 4, 'w']]],
    ['C-2072', 'loc-eastwood', 1, 'pending', 'unpaid', [['p-hgw', 10, 'w'], ['p-wnt', 6, 'w'], ['p-bao', 8, 'w']]],
    ['C-2070', 'loc-hurstville', -3, 'delivered', 'paid', [['p-siu', 10, 'w'], ['p-bao', 6, 'w'], ['p-frz', 3, 'w']]]
  ];
  drops.forEach(function (d) {
    order({
      id: uid('ord'), order_ref: d[0], channel: 'consignment_drop', destination_location_id: d[1],
      customer_name: locs.filter(function (l) { return l.id === d[1]; })[0].name, customer_phone: '',
      delivery_suburb: locs.filter(function (l) { return l.id === d[1]; })[0].suburb.split(' NSW')[0],
      delivery_date: addDays(T, d[2]), fulfillment_status: d[3],
      order_status: d[3] === 'delivered' ? 'completed' : 'confirmed',
      payment_status: d[4], payment_method: 'invoice', items: d[5],
      created_at: new Date(Date.now() - (Math.abs(d[2]) + 2) * 86400000).toISOString()
    });
  });

  var settlements = [
    { id: uid('set'), location_id: 'loc-campsie', settlement_date: addDays(T, -7), commission_rate: 0.20,
      items: [{ product_id: 'p-siu', sold_qty: 18, returned_qty: 2, unit_price: 9.00 }, { product_id: 'p-gyo', sold_qty: 11, returned_qty: 1, unit_price: 9.50 }, { product_id: 'p-cho', sold_qty: 5, returned_qty: 0, unit_price: 10.00 }], is_settled: false },
    { id: uid('set'), location_id: 'loc-eastwood', settlement_date: addDays(T, -9), commission_rate: 0.22,
      items: [{ product_id: 'p-hgw', sold_qty: 14, returned_qty: 1, unit_price: 10.00 }, { product_id: 'p-wnt', sold_qty: 9, returned_qty: 1, unit_price: 11.00 }], is_settled: true },
    { id: uid('set'), location_id: 'loc-hurstville', settlement_date: addDays(T, -12), commission_rate: 0.18,
      items: [{ product_id: 'p-siu', sold_qty: 12, returned_qty: 0, unit_price: 9.00 }, { product_id: 'p-bao', sold_qty: 7, returned_qty: 1, unit_price: 8.00 }], is_settled: true }
  ].map(function (s) {
    s.gross_sales = s.items.reduce(function (a, i) { return a + i.sold_qty * i.unit_price; }, 0);
    s.commission_amount = +(s.gross_sales * s.commission_rate).toFixed(2);
    s.net_payable = +(s.gross_sales - s.commission_amount).toFixed(2);
    return s;
  });

  var expenses = [
    { id: uid('exp'), expense_date: addDays(T, -1), category: 'Delivery fuel', description: 'Van refuel — delivery run Campsie / Eastwood', amount: 68.40 },
    { id: uid('exp'), expense_date: addDays(T, -2), category: 'Gas', description: 'LPG cylinder exchange for steamer', amount: 42.00 },
    { id: uid('exp'), expense_date: addDays(T, -4), category: 'Kitchen consumables', description: 'Gloves, towels, sanitiser', amount: 96.30 },
    { id: uid('exp'), expense_date: addDays(T, -6), category: 'Packaging', description: 'Extra label sticker roll', amount: 38.50 }
  ];

  var procurement = [
    { id: uid('proc'), purchase_date: addDays(T, -2), supplier: 'Flemington Wholesale', material_id: 'm-chicken', quantity: 20, unit_cost: 11.90 },
    { id: uid('proc'), purchase_date: addDays(T, -2), supplier: 'Sydney Seafood Co', material_id: 'm-prawn', quantity: 10, unit_cost: 32.00 },
    { id: uid('proc'), purchase_date: addDays(T, -5), supplier: 'AusPack Supplies', material_id: 'm-bag', quantity: 500, unit_cost: 0.18 },
    { id: uid('proc'), purchase_date: addDays(T, -5), supplier: 'AusPack Supplies', material_id: 'm-label', quantity: 500, unit_cost: 0.06 },
    { id: uid('proc'), purchase_date: addDays(T, -8), supplier: 'Flemington Wholesale', material_id: 'm-wrapper', quantity: 20, unit_cost: 6.50 }
  ];

  var movements = [
    { id: uid('mv'), at: new Date(Date.now() - 2 * 3600000).toISOString(), type: 'production', location_id: CENTRAL, product_id: 'p-siu', qty: 24, note: 'Batch MK-1106-A' },
    { id: uid('mv'), at: new Date(Date.now() - 3 * 3600000).toISOString(), type: 'transfer', location_id: CENTRAL, to_location_id: 'loc-campsie', product_id: 'p-siu', qty: -12, note: 'Consignment drop C-2071' },
    { id: uid('mv'), at: new Date(Date.now() - 5 * 3600000).toISOString(), type: 'transfer', location_id: CENTRAL, to_location_id: 'loc-campsie', product_id: 'p-siu', qty: 12, note: 'Consignment drop C-2071' },
    { id: uid('mv'), at: new Date(Date.now() - 26 * 3600000).toISOString(), type: 'adjustment', location_id: CENTRAL, product_id: 'p-hgw', qty: -2, note: 'Damaged during packing' },
    { id: uid('mv'), at: new Date(Date.now() - 30 * 3600000).toISOString(), type: 'production', location_id: CENTRAL, product_id: 'p-hgw', qty: 18, note: 'Batch MK-1105-B' }
  ];

  return {
    locations: locs, products: prods, materials: mats, bom: bom, inventory: inv,
    orders: orders, settlements: settlements, expenses: expenses, procurement: procurement, movements: movements,
    settings: { venue: 'Alexandria, NSW', timezone: 'Australia/Sydney' }
  };
}

/* ---------------------------------------------------------
   Storage
--------------------------------------------------------- */
function loadDB() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.products || !parsed.orders) return null;
    return parsed;
  } catch (e) { return null; }
}
var db = loadDB() || seedDB();
function saveDB() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* in-memory only */ }
}

/* ---------------------------------------------------------
   Entity helpers
--------------------------------------------------------- */
function product(id) { return db.products.filter(function (p) { return p.id === id; })[0] || null; }
function material(id) { return db.materials.filter(function (m) { return m.id === id; })[0] || null; }
function locById(id) { return db.locations.filter(function (l) { return l.id === id; })[0] || null; }
function orderById(id) { return db.orders.filter(function (o) { return o.id === id; })[0] || null; }
function stores() { return db.locations.filter(function (l) { return l.type === 'consignment'; }); }
function invRow(locId, prodId) {
  return db.inventory.filter(function (i) { return i.location_id === locId && i.product_id === prodId; })[0] || null;
}
function stockAt(locId, prodId) { var r = invRow(locId, prodId); return r ? Number(r.qty_on_hand) : 0; }
function addStock(locId, prodId, delta) {
  var r = invRow(locId, prodId);
  if (!r) {
    r = { id: uid('inv'), location_id: locId, product_id: prodId, qty_on_hand: 0 };
    db.inventory.push(r);
  }
  r.qty_on_hand = Math.round((Number(r.qty_on_hand) + Number(delta)) * 1000) / 1000;
  return r.qty_on_hand;
}
function bomFor(prodId) {
  return db.bom.filter(function (b) { return b.product_id === prodId; })
    .map(function (b) { return { material: material(b.raw_material_id), qty: Number(b.qty_required) }; })
    .filter(function (x) { return x.material; });
}
function costPerPack(prodId) {
  return bomFor(prodId).reduce(function (s, x) { return s + x.qty * Number(x.material.cost_per_unit); }, 0);
}
function packsOf(o) { return (o.items || []).reduce(function (s, i) { return s + Number(i.quantity); }, 0); }
function unitsOf(o) {
  return (o.items || []).reduce(function (s, i) {
    var p = product(i.product_id);
    return s + Number(i.quantity) * (p ? p.units_per_pack : 1);
  }, 0);
}
function orderTotal(o) {
  return (o.items || []).reduce(function (s, i) { return s + Number(i.quantity) * Number(i.unit_price); }, 0);
}
function stockState(q) {
  if (Number(q) <= 0) return 'out';
  if (Number(q) <= LOW_STOCK_PACKS) return 'low';
  return 'ok';
}
function materialState(m) {
  if (Number(m.current_stock) <= 0) return 'out';
  if (Number(m.current_stock) <= Number(m.min_stock_alert)) return 'low';
  return 'ok';
}
function logMove(type, locId, prodId, qty, note, toLoc) {
  db.movements.unshift({
    id: uid('mv'), at: new Date().toISOString(), type: type, location_id: locId, product_id: prodId,
    qty: qty, note: note || '', to_location_id: toLoc || null
  });
  db.movements = db.movements.slice(0, 120);
}

/* ---------------------------------------------------------
   Business calculations
--------------------------------------------------------- */
function directOrders() { return db.orders.filter(function (o) { return o.channel === 'direct_facebook'; }); }
function consignmentDrops() { return db.orders.filter(function (o) { return o.channel === 'consignment_drop'; }); }
function activeOrders() {
  return db.orders.filter(function (o) { return o.order_status !== 'cancelled'; });
}
function salesSummary() {
  var directPaid = directOrders().filter(function (o) { return o.payment_status === 'paid' && o.order_status !== 'cancelled'; });
  var directRevenue = directPaid.reduce(function (s, o) { return s + o.total_amount; }, 0);
  var consignGross = db.settlements.reduce(function (s, x) { return s + x.gross_sales; }, 0);
  var commission = db.settlements.reduce(function (s, x) { return s + x.commission_amount; }, 0);
  return {
    directRevenue: directRevenue, directCount: directPaid.length,
    consignGross: consignGross, commission: commission,
    total: directRevenue + consignGross
  };
}
function receivables() {
  var out = [];
  consignmentDrops().forEach(function (o) {
    if (o.payment_status === 'unpaid' && o.order_status !== 'cancelled') {
      out.push({ kind: 'invoice', ref: o.order_ref, party: locById(o.destination_location_id).name, date: o.delivery_date, amount: o.total_amount, id: o.id });
    }
  });
  db.settlements.forEach(function (s) {
    if (!s.is_settled) {
      out.push({ kind: 'settlement', ref: 'SET-' + s.id.slice(-4).toUpperCase(), party: locById(s.location_id).name, date: s.settlement_date, amount: s.net_payable, id: s.id });
    }
  });
  return out.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
}
function receivablesTotal() { return receivables().reduce(function (s, r) { return s + r.amount; }, 0); }
function cogsSummary() {
  var rows = {};
  function add(prodId, qty) {
    var cost = costPerPack(prodId);
    if (!rows[prodId]) rows[prodId] = { product: product(prodId), packs: 0, cost: 0 };
    rows[prodId].packs += qty;
    rows[prodId].cost += qty * cost;
  }
  directOrders().forEach(function (o) {
    if (o.payment_status === 'paid' && o.order_status !== 'cancelled') o.items.forEach(function (i) { add(i.product_id, i.quantity); });
  });
  db.settlements.forEach(function (s) {
    (s.items || []).forEach(function (i) { add(i.product_id, i.sold_qty); });
  });
  var list = Object.keys(rows).map(function (k) { return rows[k]; }).sort(function (a, b) { return b.cost - a.cost; });
  return { rows: list, total: list.reduce(function (s, r) { return s + r.cost; }, 0), packs: list.reduce(function (s, r) { return s + r.packs; }, 0) };
}
function opexTotal() { return db.expenses.reduce(function (s, e) { return s + Number(e.amount); }, 0); }
function lowStockList() {
  var alerts = [];
  db.materials.forEach(function (m) {
    var st = materialState(m);
    if (st !== 'ok') {
      alerts.push({ kind: 'Raw material', ref: m.name, where: 'Central Kitchen', onHand: qtyFmt(m.current_stock) + ' ' + m.unit, min: qtyFmt(m.min_stock_alert) + ' ' + m.unit, state: st });
    }
  });
  db.locations.forEach(function (l) {
    db.products.forEach(function (p) {
      var q = stockAt(l.id, p.id);
      var st = stockState(q);
      if (st !== 'ok') {
        alerts.push({ kind: 'Finished goods', ref: p.name, where: l.name, onHand: q + ' packs', min: '≤ ' + LOW_STOCK_PACKS + ' packs', state: st });
      }
    });
  });
  return alerts.sort(function (a, b) { return a.state === b.state ? 0 : a.state === 'out' ? -1 : 1; });
}
function pendingDispatches() {
  return db.orders.filter(function (o) {
    return o.order_status !== 'cancelled' && o.fulfillment_status !== 'delivered';
  });
}
function monthRevenueSeries(days) {
  var out = [];
  for (var i = days - 1; i >= 0; i--) {
    var d = addDays(todayISO(), -i);
    var total = 0;
    activeOrders().forEach(function (o) {
      if (o.channel === 'direct_facebook' && o.delivery_date === d && o.order_status !== 'cancelled') total += o.total_amount;
    });
    out.push({ date: d, total: total });
  }
  return out;
}

/* ---------------------------------------------------------
   UI primitives
--------------------------------------------------------- */
function pill(text, tone) {
  return '<span class="pill pill--' + (tone || 'neutral') + '">' + esc(text) + '</span>';
}
function statusTone(kind, value) {
  if (kind === 'payment') return value === 'paid' ? 'green' : 'amber';
  if (kind === 'fulfil') {
    return value === 'delivered' ? 'green' : value === 'in_transit' ? 'blue' : value === 'packed' ? 'amber' : 'neutral';
  }
  if (kind === 'order') {
    return value === 'completed' ? 'green' : value === 'confirmed' ? 'blue' : value === 'cancelled' ? 'red' : 'amber';
  }
  if (kind === 'stock') return value === 'ok' ? 'green' : value === 'low' ? 'amber' : 'red';
  return 'neutral';
}
function labelize(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}
function statCard(o) {
  return '<div class="stat' + (o.tone ? ' stat--' + o.tone : '') + '">' +
    '<div class="stat-head"><span class="stat-label">' + esc(o.label) + '</span>' +
    (o.icon ? '<span class="stat-ic">' + icon(o.icon, 15) + '</span>' : '') + '</div>' +
    '<div class="stat-value">' + o.value + '</div>' +
    (o.meta ? '<div class="stat-meta">' + o.meta + '</div>' : '') +
    '</div>';
}
function panel(o) {
  return '<section class="panel' + (o.cls ? ' ' + o.cls : '') + '">' +
    (o.title ? '<header class="panel-head"><div><h2 class="panel-title">' + esc(o.title) + '</h2>' +
      (o.sub ? '<p class="panel-sub">' + o.sub + '</p>' : '') + '</div>' + (o.actions || '') + '</header>' : '') +
    '<div class="' + (o.flush ? 'panel-body panel-body--flush' : 'panel-body') + '">' + o.body + '</div>' +
    (o.foot ? '<footer class="panel-foot">' + o.foot + '</footer>' : '') + '</section>';
}
function table(cols, rows, opts) {
  opts = opts || {};
  var head = '<tr>' + cols.map(function (c) {
    return '<th class="' + (c.align === 'right' ? 'right' : '') + (c.w ? '" style="width:' + c.w : '') + '">' + esc(c.label) + '</th>';
  }).join('') + '</tr>';
  var body = rows.length ? rows.join('') :
    '<tr><td colspan="' + cols.length + '"><div class="empty">' + icon('inbox', 22) + '<span>' + esc(opts.empty || 'No records') + '</span></div></td></tr>';
  return '<div class="tbl-wrap"><table class="tbl">' + '<thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
}
function toast(msg, tone) {
  var host = document.getElementById('toast-root');
  var el = document.createElement('div');
  el.className = 'toast' + (tone ? ' toast--' + tone : '');
  el.innerHTML = icon(tone === 'error' ? 'alert' : 'check', 15) + '<span>' + esc(msg) + '</span>';
  host.appendChild(el);
  setTimeout(function () { el.classList.add('is-out'); setTimeout(function () { el.remove(); }, 250); }, 2800);
}
function modal(o) {
  var root = document.getElementById('modal-root');
  root.innerHTML = '<div class="scrim" data-act="modal-close"></div>' +
    '<div class="dialog' + (o.wide ? ' dialog--wide' : '') + '" role="dialog" aria-modal="true">' +
      '<header class="dialog-head"><div><h3>' + esc(o.title) + '</h3>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div>' +
      '<button class="icon-btn" data-act="modal-close" aria-label="Close">' + icon('x', 16) + '</button></header>' +
      '<div class="dialog-body">' + o.body + '</div>' +
      (o.footer ? '<footer class="dialog-foot">' + o.footer + '</footer>' : '') +
    '</div>';
  document.body.classList.add('modal-open');
  var first = root.querySelector('input,select,textarea');
  if (first) setTimeout(function () { first.focus(); }, 60);
}
function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  document.body.classList.remove('modal-open');
}
function field(label, inner, hint) {
  return '<label class="field"><span class="field-label">' + esc(label) + '</span>' + inner +
    (hint ? '<span class="field-hint">' + esc(hint) + '</span>' : '') + '</label>';
}
function input(name, o) {
  o = o || {};
  return '<input class="input" name="' + name + '" type="' + (o.type || 'text') + '"' +
    (o.value !== undefined ? ' value="' + esc(o.value) + '"' : '') +
    (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
    (o.step ? ' step="' + o.step + '"' : '') + (o.min !== undefined ? ' min="' + o.min + '"' : '') +
    (o.required ? ' required' : '') + '>';
}
function select(name, options, value) {
  return '<select class="input" name="' + name + '">' + options.map(function (o) {
    return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(value) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
  }).join('') + '</select>';
}
function downloadCSV(filename, rows) {
  var csv = rows.map(function (r) {
    return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\r\n');
  var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
}
function normalisePhone(v) {
  var digits = String(v || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.indexOf('61') === 0) digits = '0' + digits.slice(2);
  if (digits.length === 10 && digits[0] === '0') {
    return digits.slice(0, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7);
  }
  return String(v).trim();
}
function todayCounts() {
  var t = todayISO();
  var list = db.orders.filter(function (o) { return o.delivery_date === t && o.order_status !== 'cancelled'; });
  var out = { pending: 0, packed: 0, in_transit: 0, delivered: 0, total: list.length };
  list.forEach(function (o) { out[o.fulfillment_status] = (out[o.fulfillment_status] || 0) + 1; });
  return out;
}
