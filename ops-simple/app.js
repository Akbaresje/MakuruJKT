(function () {
  'use strict';

  /* ---------- storage ---------- */
  var KEY = 'makuru_simple_v1';
  var KITCHEN = { name: 'Base Kitchen', suburb: 'Belmore NSW 2192' };

  function emptyDB() {
    return { products: [], materials: [], shops: [], orders: [], sales: [], seq: { order: 1 }, settings: emptySettings() };
  }
  /* the only numbers the owner has to type before the money page can say
     anything true about a month */
  function emptySettings() {
    return { rent: 0 };
  }
  function loadDB() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyDB();
      var d = JSON.parse(raw);
      var base = emptyDB();
      Object.keys(base).forEach(function (k) { if (d[k] === undefined) d[k] = base[k]; });
      return d;
    } catch (e) { return emptyDB(); }
  }
  var db = loadDB();
  function persistLocal() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
  function save() { persistLocal(); cloud.dirty = true; pushState(); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- cloud sync ----------
     Works with server/server.mjs. If this file is opened directly, or hosted on a
     plain static host, nothing here runs and the app stays local-only. */
  var TOKEN_KEY = 'makuru_token_v1';
  var cloud = {
    mode: 'local', token: '', status: 'local', err: '', busy: false,
    online: true, baseVersion: 0, baseData: null, dirty: false, saving: false,
    pullTimer: 0, pushTimer: 0, retries: 0,
    pinDraft: '', shake: false, unlocking: false,
    booted: false, splashAt: 0
  };

  function apiBase() {
    var p = location.pathname;
    if (!/\/$/.test(p)) p = p.replace(/[^/]*$/, '');
    return p + 'api/';
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (cloud.token) headers.Authorization = 'Bearer ' + cloud.token;
    return fetch(apiBase() + path, {
      method: opts.method || 'GET',
      headers: headers,
      cache: 'no-store',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error(j.error || ('HTTP ' + r.status));
          e.status = r.status; e.body = j;
          throw e;
        }
        return j;
      });
    });
  }

  function syncLabel() {
    return {
      local: 'This device only', syncing: 'Loading...', synced: 'Synced',
      saving: 'Saving...', offline: 'Offline', merged: 'Merged changes', signedout: 'Signed out'
    }[cloud.status] || cloud.status;
  }
  function setStatus(s) {
    cloud.status = s;
    var el = document.querySelector('[data-sync]');
    if (!el) return;
    el.className = 'sync sync--' + s;
    var span = el.querySelector('span');
    if (span) span.textContent = syncLabel();
  }

  /* three way merge: what changed here wins, what changed elsewhere is kept */
  function sameJSON(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function mergeList(base, remote, local) {
    function index(list) { var m = {}; (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; }); return m; }
    var B = index(base), R = index(remote), L = index(local), seen = {}, out = [];
    function take(id) {
      if (seen[id]) return; seen[id] = 1;
      var b = B[id], r = R[id], l = L[id];
      var changedHere = l && !sameJSON(l, b);
      var changedThere = r && !sameJSON(r, b);
      if (!l && b && !changedThere) return;            // deleted on this device
      if (!r && b && !changedHere) return;             // deleted on the other device
      if (l && r) return out.push(changedHere ? l : (changedThere ? r : l));
      out.push(l || r);
    }
    (local || []).forEach(function (x) { if (x && x.id) take(x.id); });
    (remote || []).forEach(function (x) { if (x && x.id) take(x.id); });
    (base || []).forEach(function (x) { if (x && x.id) take(x.id); });
    return out;
  }
  function mergeDB(base, remote, local) {
    var out = emptyDB();
    ['products', 'materials', 'shops', 'orders', 'sales'].forEach(function (k) {
      out[k] = mergeList(base[k], remote[k], local[k]);
    });
    out.seq = { order: Math.max((base.seq || {}).order || 1, (remote.seq || {}).order || 1, (local.seq || {}).order || 1) };
    return out;
  }

  function adopt(s) {
    db = s.data && typeof s.data === 'object' ? s.data : emptyDB();
    var base = emptyDB();
    Object.keys(base).forEach(function (k) { if (db[k] === undefined) db[k] = base[k]; });
    cloud.baseVersion = Number(s.version) || 0;
    cloud.baseData = clone(db);
    cloud.dirty = false;
    persistLocal();
    setStatus('synced');
    render();
  }

  function pushState(now) {
    if (cloud.mode !== 'cloud' || !cloud.token) return Promise.resolve();
    clearTimeout(cloud.pushTimer);
    var run = function () {
      cloud.saving = true; setStatus('saving');
      var snapshot = clone(db);
      return api('state', { method: 'PUT', body: { data: snapshot, baseVersion: cloud.baseVersion } })
        .then(function (r) {
          cloud.saving = false;
          cloud.baseVersion = Number(r.version) || cloud.baseVersion + 1;
          cloud.baseData = snapshot;
          cloud.dirty = false; cloud.online = true; cloud.retries = 0;
          setStatus('synced');
        })
        .catch(function (e) {
          cloud.saving = false;
          if (e.status === 401) { signOut(); return; }
          if (e.status === 409 && cloud.retries < 3) {
            cloud.retries++;
            var merged = mergeDB(cloud.baseData || emptyDB(), e.body.data, db);
            db = merged;
            cloud.baseVersion = Number(e.body.version) || cloud.baseVersion;
            cloud.baseData = clone(e.body.data);
            persistLocal(); setStatus('merged'); render();
            return pushState(true);
          }
          cloud.online = false; setStatus('offline');
        });
    };
    if (now) return run();
    cloud.pushTimer = setTimeout(run, 240);
    return Promise.resolve();
  }

  function pullState(first) {
    return api('state').then(function (s) {
      cloud.online = true;
      if (first && Number(s.version) === 0) {
        /* brand new server: push whatever this device already has, if anything */
        var local = loadDB();
        var hasData = ['products', 'materials', 'shops', 'orders', 'sales'].some(function (k) { return (local[k] || []).length; });
        db = local;
        cloud.baseVersion = 0;
        cloud.baseData = emptyDB();
        if (hasData) { cloud.dirty = true; return pushState(true); }
        setStatus('synced');
        return;
      }
      if (first) { adopt(s); return; }
      if (Number(s.version) === cloud.baseVersion) { setStatus('synced'); return; }
      if (!cloud.dirty) { adopt(s); return; }
      var merged = mergeDB(cloud.baseData || emptyDB(), s.data, db);
      db = merged;
      cloud.baseVersion = Number(s.version);
      cloud.baseData = clone(s.data);
      persistLocal(); setStatus('merged'); render();
      return pushState(true);
    }).catch(function (e) {
      if (e.status === 401) { signOut(); return; }
      cloud.online = false; setStatus('offline');
    });
  }

  function startPolling() {
    clearInterval(cloud.pullTimer);
    cloud.pullTimer = setInterval(function () {
      if (!document.hidden && cloud.mode === 'cloud' && cloud.token && !cloud.saving) pullState(false);
    }, 12000);
  }

  function signOut() {
    cloud.token = '';
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { }
    cloud.baseVersion = 0; cloud.baseData = null; cloud.dirty = false; cloud.err = '';
    clearInterval(cloud.pullTimer);
    setStatus('signedout');
    render();
  }

  function doLogin(pin) {
    cloud.busy = true; cloud.err = '';
    return api('login', { method: 'POST', body: { pin: pin } })
      .then(function (r) {
        cloud.token = r.token;
        try { localStorage.setItem(TOKEN_KEY, r.token); } catch (e) { }
        cloud.busy = false;
        setStatus('syncing');
        return unlockThenEnter();
      })
      .catch(function (e) {
        cloud.busy = false;
        cloud.err = e.status === 401 ? 'Wrong PIN. Try again.' : (e.status === 429 ? 'Too many tries. Wait 10 minutes.' : 'Cannot reach the server.');
        if (e.status === 401) { cloud.shake = true; cloud.pinDraft = ''; }
        render();
      });
  }

  function bootCloud() {
    if (typeof fetch !== 'function' || !/^https?:$/.test(location.protocol)) {
      cloud.booted = true;
      render();                 /* leave the splash for the plain landing */
      return;
    }
    /* Let the wordmark finish before anything replaces it — a swap at 200ms is
       what made the old splash -> login hand-off feel broken. */
    var LANDING_MS = 620;
    function settle(fn) {
      var left = Math.max(0, LANDING_MS - (Date.now() - (cloud.splashAt || Date.now())));
      setTimeout(fn, left);
    }
    api('health').then(function (h) {
      if (!h || h.mode !== 'cloud') { cloud.mode = 'local'; cloud.booted = true; settle(render); return; }
      cloud.mode = 'cloud';
      cloud.booted = true;
      cloud.token = localStorage.getItem(TOKEN_KEY) || '';
      if (!cloud.token) {
        setStatus('signedout');
        settle(function () {
          if (!morphSplashToLogin()) enterLogin(true);
          document.title = 'Sign in - makuru.';
          var pin = document.querySelector('#f-login input[name=pin]');
          if (pin) { pin.focus({ preventScroll: true }); try { pin.setSelectionRange(pin.value.length, pin.value.length); } catch (e) {} }
        });
        return;
      }
      setStatus('syncing');
      return pullState(true).then(function () { startPolling(); settle(render); });
    }).catch(function () { cloud.mode = 'local'; cloud.booted = true; settle(render); });
  }

  window.addEventListener('online', function () { if (cloud.mode === 'cloud' && cloud.token && cloud.dirty) pushState(true); });
  window.addEventListener('offline', function () { if (cloud.mode === 'cloud') setStatus('offline'); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && cloud.mode === 'cloud' && cloud.token) pullState(false);
  });
  function uid() { return Math.random().toString(36).slice(2, 9); }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    var v = Number(n) || 0, sign = v < 0 ? '-' : '';
    return sign + '$' + Math.abs(v).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function num(n) { var v = Number(n) || 0; return v % 1 === 0 ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /* "14:30" -> "2:30 pm"; anything else is shown as typed */
  function fmtTime(t) {
    if (!t) return '';
    var p = String(t).split(':'); if (p.length < 2) return t;
    var h = Number(p[0]), m = Number(p[1]); if (isNaN(h) || isNaN(m)) return t;
    var ap = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }
  /* date cell: the date, with the pickup time underneath when there is one */
  function whenCell(o) {
    var t = fmtTime(o.time);
    return fmtDate(o.date) + (t ? '<div class="td-sub">' + t + '</div>' : '');
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    var p = iso.split('-'); if (p.length < 3) return iso;
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(p[2]) + ' ' + m[Number(p[1]) - 1] + ' ' + p[0];
  }
  function phoneFmt(s) {
    var d = String(s || '').replace(/\D/g, '');
    if (d.indexOf('61') === 0 && d.length === 11) d = '0' + d.slice(2);
    if (d.length === 10) return d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7);
    return s || '';
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function product(id) { return byId(db.products, id); }
  function shop(id) { return byId(db.shops, id); }
  function shopPacks(p, shopId) { return (p.shops && p.shops[shopId]) || 0; }
  function packsInShops(p) { var t = 0; Object.keys(p.shops || {}).forEach(function (k) { if (shop(k)) t += p.shops[k]; }); return t; }
  function totalKitchen() { return db.products.reduce(function (a, p) { return a + p.kitchen; }, 0); }
  function totalShops() { return db.products.reduce(function (a, p) { return a + packsInShops(p); }, 0); }

  /* ---------- money ----------
     Everything here reads the same two lists (paid orders and shop sales) so the
     Home recap, the Finance page and the CSV can never disagree. */
  function ym(dateStr, ymStr) {
    if (ymStr) return ymStr;
    return String(dateStr || today()).slice(0, 7);
  }
  function monthLabel(ymStr) {
    var p = String(ymStr || '').split('-'); if (p.length < 2) return ymStr || '';
    var m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return (m[Number(p[1]) - 1] || p[1]) + ' ' + p[0];
  }
  function addMonth(ymStr, n) {
    var p = String(ymStr).split('-'), d = new Date(Number(p[0]), Number(p[1]) - 1 + n, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function daysInMonth(ymStr) {
    var p = String(ymStr).split('-');
    return new Date(Number(p[0]), Number(p[1]), 0).getDate();
  }
  function monthShort(ymStr) { return monthLabel(ymStr).slice(0, 3) + ' ' + String(ymStr).slice(0, 4); }

  function saleMonths() {
    var seen = {}, out = [];
    function add(k) { if (k && !seen[k]) { seen[k] = 1; out.push(k); } }
    db.orders.forEach(function (o) { if (o.paid) add(ym(o.date, o.paid_month)); });
    db.sales.forEach(function (x) { add(ym(x.date, x.sale_month)); });
    add(today().slice(0, 7));
    return out.sort().reverse();
  }

  /* one month, one set of numbers, used by every screen */
  function monthCalc(ymStr) {
    var y = ym(ymStr);
    var inMonth = function (d, forced) { return ym(d, forced) === y; };
    var ords = db.orders.filter(function (o) { return o.paid && inMonth(o.date, o.paid_month); });
    var sales = db.sales.filter(function (x) { return inMonth(x.date, x.sale_month); });

    /* commissions: the rate that was active on the sale date */
    var commission = sales.reduce(function (a, x) {
      var s = shop(x.shop_id); if (!s || !x.shop_id) return a;
      return a + x.amount * (Number(s.commission) || 0) / 100;
    }, 0);

    /* food cost: add a "cost per pack" to a product to switch this on */
    var cogs = 0, cogsPacks = 0;
    function addCost(packs, price, pr) {
      var c = Number(pr && pr.cost) || 0; if (!c) return;
      cogs += c * packs; cogsPacks += packs;
    }
    var priced = 0, totalProducts = db.products.length;
    ords.forEach(function (o) {
      (o.items || []).forEach(function (i) { addCost(Number(i.qty) || 0, i.price, product(i.product_id)); });
    });
    sales.forEach(function (x) { addCost(Number(x.qty) || 0, 0, product(x.product_id)); });
    priced = cogsPacks > 0;

    var gross = ords.reduce(function (a, o) { return a + (Number(o.total) || 0); }, 0) + sales.reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0);
    var rent = Number((db.settings || {}).rent) || 0;
    var net = gross - commission - rent - cogs;

    var unpaidOrd = db.orders.filter(function (o) { return !o.paid; });
    var unpaid = unpaidOrd.reduce(function (a, o) { return a + (Number(o.total) || 0); }, 0);

    var packs = ords.reduce(function (a, o) { return a + (Number(o.packs) || 0); }, 0) + sales.reduce(function (a, x) { return a + (Number(x.qty) || 0); }, 0);

    return {
      ym: y, label: monthLabel(y),
      orderCount: ords.length, saleCount: sales.length,
      orderRevenue: ords.reduce(function (a, o) { return a + (Number(o.total) || 0); }, 0),
      shopRevenue: sales.reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0),
      gross: gross, commission: commission, rent: rent, cogs: cogs,
      net: net, packs: packs, unpaid: unpaid, unpaidCount: unpaidOrd.length,
      hasFoodCost: priced, pricedProducts: totalProducts ? null : 0
    };
  }

  /* daily revenue of one month, for the bars */
  function dailySeries(ymStr, key) {
    var n = daysInMonth(ymStr), out = [];
    for (var i = 1; i <= n; i++) out.push(0);
    function add(dateStr, forced, v) {
      if (ym(dateStr, forced) !== ymStr) return;
      var d = Number(String(dateStr).slice(8, 10)) || 1;
      out[Math.min(n, Math.max(1, d)) - 1] += v;
    }
    db.orders.forEach(function (o) { if (!o.paid) return; if (key === 'orders') add(o.date, o.paid_month, Number(o.total) || 0); });
    db.sales.forEach(function (x) { if (key === 'orders') return; add(x.date, x.sale_month, Number(x.amount) || 0); });
    return out;
  }

  function byKey(list, keyFn, valFn) {
    var map = {}, order = [];
    list.forEach(function (x) {
      var k = keyFn(x); if (k === null || k === undefined || k === '') return;
      if (!(k in map)) { map[k] = 0; order.push(k); }
      map[k] += valFn(x);
    });
    return order.map(function (k) { return { key: k, value: map[k] }; }).sort(function (a, b) { return b.value - a.value; });
  }
  function monthSales(ymStr) {
    return db.sales.filter(function (x) { return ym(x.date, x.sale_month) === String(ymStr); });
  }
  function monthPaidOrders(ymStr) {
    return db.orders.filter(function (o) { return o.paid && ym(o.date, o.paid_month) === String(ymStr); });
  }
  /* a plain-English line you could paste to someone who asks "how was the month" */
  function monthStory(m) {
    if (!m.orderCount && !m.saleCount) return 'No sales recorded for ' + m.label + ' yet.';
    var parts = [];
    if (m.orderCount) parts.push(m.orderCount + ' paid order' + (m.orderCount === 1 ? '' : 's'));
    if (m.saleCount) parts.push(m.saleCount + ' shop sale' + (m.saleCount === 1 ? '' : 's'));
    var head = 'In ' + m.label + ' you took ' + money(m.gross) + ' from ' + parts.join(' and ');
    var tail = m.packs ? ', at ' + money(m.gross / m.packs) + ' a pack' : '';
    var costs = [];
    if (m.commission > 0) costs.push(money(m.commission) + ' to shop commission');
    if (m.cogs > 0) costs.push(money(m.cogs) + ' on ingredients');
    if (m.rent > 0) costs.push(money(m.rent) + ' in fixed costs');
    var after = costs.length
      ? '. After ' + costs.join(', ') + ' you kept ' + money(m.net) + '.'
      : '. Nothing is taken out yet, so the whole ' + money(m.net) + ' is yours.';
    var owe = m.unpaid > 0 ? ' ' + money(m.unpaid) + ' is still unpaid and not counted here.' : '';
    return head + tail + after + owe;
  }

  var ICON = {
    home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v11H3z"/><path d="M9 20v-6h6v6"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    send: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="8" y="12" width="3.2" height="5"/><rect x="13" y="8" width="3.2" height="9"/><rect x="18" y="4.5" width="3.2" height="12.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6.5 19Z"/>'
  };
  /* small drawn art, no images: three bars under an arrow, in brand ink on cream */
  function artMoney(w, h) {
    return '<svg class="art-money" viewBox="0 0 120 120" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">' +
      '<rect x="0" y="0" width="120" height="120" rx="26" fill="#F3EBDD"/>' +
      '<path d="M24 82h72" stroke="#241E1E" stroke-opacity=".14" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="30" y="62" width="13" height="20" rx="4" fill="#9E2A2B" fill-opacity=".22"/>' +
      '<rect x="53" y="48" width="13" height="34" rx="4" fill="#9E2A2B" fill-opacity=".45"/>' +
      '<rect x="76" y="34" width="13" height="48" rx="4" fill="#9E2A2B"/>' +
      '<path d="M32 40c10-8 22-9 33-4 8 4 15 3 22-1" stroke="#9E2A2B" stroke-width="3" stroke-linecap="round" fill="none" stroke-opacity=".55"/>' +
      '<path d="M79 30l9 3-3 9" stroke="#9E2A2B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-opacity=".55"/>' +
      '</svg>';
  }
  function icon(n, s) { s = s || 16; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>'; }

  /* ---------- ui primitives ---------- */
  function toast(msg, err) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2400);
    if (mk) { mk.el.classList.add('is-lifted'); clearTimeout(mkLift); mkLift = setTimeout(function () { mk.el.classList.remove('is-lifted'); }, 2600); }
  }

  /* ---------- mascot ---------- */
  var mk = null, mkLift = 0, mkGreeted = false;
  function bootMascot() {
    if (mk || !window.MakuruMascot) return;
    mk = window.MakuruMascot.create(document.body, {
      size: 120, fixed: true, follow: true, blink: true, steam: true, bob: true, react: true,
      label: 'makuru mascot'
    });
    mkSync();
  }
  function mkSync() { if (mk) mk.show(!document.getElementById('modal')); }
  function mkHop(text) { if (!mk) return; mk.hop(); if (text) mk.say(text, 2000); }
  function mkWiggle() { if (mk) mk.wiggle(); }
  function modal(title, sub, bodyHTML, wide) {
    closeModal();
    var s = document.createElement('div'); s.className = 'scrim'; s.id = 'modal'; s.setAttribute('data-act', 'close');
    s.innerHTML = '<div class="dialog' + (wide ? ' dialog--wide' : '') + '" role="dialog"><div class="dialog-head"><div><h3>' + esc(title) + '</h3>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div><button class="close" data-act="close" aria-label="Close">' + icon('x', 18) + '</button></div><div class="dialog-body">' + bodyHTML + '</div></div>';
    document.body.appendChild(s);
    mkSync();
    var f = s.querySelector('input,select'); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function closeModal() { var m = document.getElementById('modal'); if (m) m.remove(); mkSync(); }
  function field(label, html) { return '<div class="field"><label>' + esc(label) + '</label>' + html + '</div>'; }
  function input(name, opts) {
    opts = opts || {};
    return '<input class="input" name="' + name + '" type="' + (opts.type || 'text') + '"' + (opts.value !== undefined ? ' value="' + esc(opts.value) + '"' : '') + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + (opts.min !== undefined ? ' min="' + opts.min + '"' : '') + (opts.step ? ' step="' + opts.step + '"' : '') + (opts.req ? ' required' : '') + '>';
  }
  function select(name, options, value) {
    return '<select class="input" name="' + name + '">' + options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function foot(label, act, extra) { return '<div class="form-foot">' + (extra || '') + '<button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn btn--primary" data-act="' + act + '">' + esc(label) + '</button></div>'; }
  function form(id, body) { return '<form class="form" id="' + id + '" data-form="' + id + '">' + body + '</form>'; }
  function confirmDelete(what, act, id, note) {
    modal('Delete ' + what + '?', note || 'This cannot be undone.', '<div class="form-foot" style="justify-content:flex-start"><button class="btn btn--primary" data-act="' + act + '" data-id="' + esc(id) + '">Yes, delete</button><button class="btn" data-act="close">Cancel</button></div>');
  }
  function emptyBox(title, text, btnLabel, btnAct) {
    return '<div class="empty"><b>' + esc(title) + '</b>' + esc(text) + (btnLabel ? '<br><button class="btn btn--primary" data-act="' + btnAct + '">' + icon('plus') + esc(btnLabel) + '</button>' : '') + '</div>';
  }
  function panel(title, sub, body, right) {
    return '<section class="panel"><div class="panel-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' + (right || '') + '</div>' + body + '</section>';
  }
  function stat(label, value, sub, warn, cnt) {
    var attrs = cnt ? ' data-count="' + cnt.n + '" data-kind="' + (cnt.k || 'int') + '" data-key="' + esc(label) + '"' : '';
    return '<div class="stat' + (warn ? ' warn' : '') + '"><div class="label">' + esc(label) + '</div><div class="value"' + attrs + '>' + value + '</div><div class="sub">' + esc(sub || '') + '</div></div>';
  }

  /* ---------- routing ---------- */
  var ROUTES = [
    { id: 'dashboard', label: 'Home', icon: 'home' },
    { id: 'stock', label: 'Dimsum Stock', icon: 'box' },
    { id: 'materials', label: 'Raw Materials', icon: 'leaf' },
    { id: 'shops', label: 'Shops', icon: 'store' },
    { id: 'orders', label: 'Orders', icon: 'cart' },
    { id: 'finance', label: 'Finance', icon: 'chart' }
  ];
  var ui = { orderFilter: 'open', finMonth: '' };
  function route() { var h = location.hash.replace(/^#\/?/, ''); return h || ''; }
  function go(r) { location.hash = '#/' + r; }

  function render(nav) {
    if (cloud.unlocking) return;                  /* the unlock owns the DOM */
    var r = route();
    var root = document.getElementById('root');
    if (cloud.mode === 'cloud' && !cloud.token) { enterLogin(false); return; }
    var booting = !cloud.booted && /^https?:$/.test(location.protocol);
    var fromLogin = enteringFromLogin;
    enteringFromLogin = false;
    var from = root.querySelector('.gateway') ? 'gateway' : (root.querySelector('.app') ? 'app' : '');
    if (nav && from && !fromLogin) snapshot(root, (from === 'app' && r) ? 'main' : 'all');
    if (!r && booting) {
      root.innerHTML = splash();
      if (!cloud.splashAt) cloud.splashAt = Date.now();
      document.title = 'makuru.';
      return;
    }
    if (!r) {
      root.innerHTML = gateway();
      document.title = 'makuru.';
      var g = root.querySelector('.gateway');
      if (g && nav && from === 'app') g.classList.add('is-returning');
      lastNums = {};
      return;
    }
    if (!byId(ROUTES, r)) { go('dashboard'); return; }
    var views = { dashboard: viewDashboard, stock: viewStock, materials: viewMaterials, shops: viewShops, orders: viewOrders, finance: viewFinance };
    root.innerHTML = shell(r, views[r]());
    var appEl = root.querySelector('.app');
    if (appEl && fromLogin) { appEl.classList.add('is-unlock-in'); cloud.unlocking = false; }
    else if (nav && appEl && from === 'gateway') appEl.classList.add('is-entering');
    else if (nav && appEl && from === 'app') appEl.classList.add('page-enter');
    document.title = byId(ROUTES, r).label + ' - makuru.';
    countUp(root, from !== 'app');
  }

  /* ---------- sign in -> main page ---------- */
  var enteringFromLogin = false;

  /* The card dissolves upward while a bloom of light covers the swap, then the
     app rises out of it — one motion, not two page changes. */
  function playUnlock(root) {
    var card = root.querySelector('.login-card');
    var veil = document.createElement('div');
    veil.className = 'unlock-veil';
    document.body.appendChild(veil);
    if (card) card.classList.add('is-unlocking');
    var logo = root.querySelector('.gateway-logo');
    if (logo) logo.classList.add('is-unlocking');
    setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); }, 1900);
    return new Promise(function (done) { setTimeout(done, 520); });
  }

  function unlockThenEnter() {
    var root = document.getElementById('root');
    var canPlay = CAN_ANIM && !!root.querySelector('.login-card');
    cloud.unlocking = true;                       /* render() stands down */

    var anim = canPlay ? playUnlock(root) : Promise.resolve();
    var pull = pullState(true).catch(function () { /* keep local data, still enter */ });

    return Promise.all([pull, anim]).then(function () {
      startPolling();
      cloud.unlocking = false;
      enteringFromLogin = true;
      if (route() === 'dashboard') { render(true); window.scrollTo(0, 0); }
      else location.hash = '#/dashboard';
    });
  }

  /* ---------- motion ---------- */
  var UJ = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  var CAN_ANIM = !/jsdom/i.test(UJ) && typeof window.requestAnimationFrame === 'function' && typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastNums = {};
  function fmtNum(v, k) {
    if (k === 'money') return money(v);
    if (k === 'qty') return num(Math.round(v));
    return String(Math.round(v));
  }
  /* Freeze a copy of what is leaving and let it play the "pinch to bottom". */
  function snapshot(root, part) {
    if (!CAN_ANIM) return;
    var wrap = document.createElement('div');
    wrap.className = 'snap';
    wrap.setAttribute('aria-hidden', 'true');
    var copy, y = window.pageYOffset || window.scrollY || 0;
    if (part === 'main') {
      /* in-app page change: only the main column pinches, the sidebar stays */
      var main = root.querySelector('.main');
      if (!main) return;
      var r = main.getBoundingClientRect();
      wrap.className = 'snap snap--main';
      wrap.style.left = r.left + 'px';
      wrap.style.top = r.top + 'px';
      wrap.style.width = r.width + 'px';
      wrap.style.height = r.height + 'px';
      wrap.style.right = 'auto';
      wrap.style.bottom = 'auto';
      copy = main.cloneNode(true);
      copy.style.position = 'absolute';
      copy.style.left = '0';
      copy.style.right = '0';
      copy.style.height = 'auto';
      copy.style.top = (-(main.scrollTop || 0)) + 'px';
    } else {
      var el = root.firstElementChild;
      if (!el) return;
      copy = el.cloneNode(true);
      copy.style.position = 'absolute';
      copy.style.top = (-y) + 'px';
      copy.style.left = '0';
      copy.style.right = '0';
    }
    Array.prototype.forEach.call(copy.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    Array.prototype.forEach.call(copy.querySelectorAll('button,input,select,textarea,a'), function (n) { n.setAttribute('tabindex', '-1'); });
    wrap.appendChild(copy);
    document.body.appendChild(wrap);
    setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 520);
  }
  function countUp(root, fromZero) {
    var nodes = root.querySelectorAll('[data-count]');
    if (!nodes.length) { lastNums = {}; return; }
    var next = {};
    Array.prototype.forEach.call(nodes, function (el) {
      var key = el.getAttribute('data-key') || '';
      var to = Number(el.getAttribute('data-count')) || 0;
      var kind = el.getAttribute('data-kind') || 'int';
      var from = (fromZero || !(key in lastNums)) ? 0 : lastNums[key];
      next[key] = to;
      if (!CAN_ANIM || from === to) { el.textContent = fmtNum(to, kind); return; }
      el.textContent = fmtNum(from, kind);
      var dur = 760, start = 0;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmtNum(from + (to - from) * e, kind);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmtNum(to, kind);
      }
      requestAnimationFrame(step);
      setTimeout(function () { el.textContent = fmtNum(to, kind); }, dur + 260);
    });
    lastNums = next;
  }
  function logoHTML() {
    var letters = 'makuru.'.split('').map(function (ch, i) {
      var dot = ch === '.' ? ' gl--dot' : '';
      return '<span class="gl' + dot + '" style="--i:' + i + '">' + ch + '</span>';
    }).join('');
    return letters + '<span class="gl-rule" aria-hidden="true"></span>';
  }
  function gateway() {
    return '<div class="gateway"><div class="gateway-logo">' + logoHTML() + '</div>' +
      '<button class="btn btn--primary btn--lg" data-act="enter">Enter ' + icon('send', 18) + '</button></div>';
  }
  /* While the health check runs we show the wordmark alone — no Enter button
     to remove later, no half-played animation to cut. */
  function splash() {
    return '<div class="gateway gateway--loading"><div class="gateway-logo">' + logoHTML() + '</div></div>';
  }

  /* Turn the splash into the login screen *in place* when we can: the wordmark
     node survives, so no letter animation restarts and nothing is re-rastered.
     The logo still travels (FLIP) because the layout below it changed. */
  function morphSplashToLogin() {
    var root = document.getElementById('root');
    var wrap = root.querySelector('.gateway--loading');
    var logo = wrap && wrap.querySelector('.gateway-logo');
    var card = null;
    if (!wrap || !logo) return false;

    var before = logo.getBoundingClientRect();

    wrap.classList.remove('gateway--loading');
    wrap.classList.add('gateway--login');
    card = document.createElement('div');
    card.innerHTML = loginCardHTML();
    card = card.firstChild;
    wrap.appendChild(card);

    var after = logo.getBoundingClientRect();
    var dx = before.left - after.left;
    var dy = before.top - after.top;
    if (CAN_ANIM && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
      logo.style.transition = 'none';
      logo.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
      card.classList.add('is-unfold');
      requestAnimationFrame(function () {
        logo.style.transition = 'transform .68s cubic-bezier(.16,.84,.3,1)';
        logo.style.transform = 'translate3d(0,0,0)';
        setTimeout(function () { logo.style.transition = ''; logo.style.transform = ''; }, 780);
      });
    } else if (card) {
      card.classList.add('is-unfold');
    }
    return true;
  }

  /* Full re-render path (wrong PIN, sign-out, later visits). */
  function enterLogin(animate) {
    var root = document.getElementById('root');
    var prevLogo = root.querySelector('.gateway-logo');
    var before = prevLogo ? prevLogo.getBoundingClientRect() : null;

    root.innerHTML = loginScreen();
    document.title = 'Sign in - makuru.';

    var logo = root.querySelector('.gateway-logo');
    var card = root.querySelector('.login-card');

    if (animate && CAN_ANIM && before && logo) {
      var after = logo.getBoundingClientRect();
      var dx = before.left - after.left;
      var dy = before.top - after.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        logo.style.transition = 'none';
        logo.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
        if (card) card.classList.add('is-unfold');
        requestAnimationFrame(function () {
          logo.style.transition = 'transform .68s cubic-bezier(.16,.84,.3,1)';
          logo.style.transform = 'translate3d(0,0,0)';
          setTimeout(function () { logo.style.transition = ''; logo.style.transform = ''; }, 760);
        });
      } else if (card) {
        card.classList.add('is-unfold');
      }
    }

    var pinInput = root.querySelector('input[name=pin]');
    if (pinInput) {
      pinInput.focus({ preventScroll: true });
      var n = pinInput.value.length;
      try { pinInput.setSelectionRange(n, n); } catch (e) {}
    }
  }

  function loginCardHTML() {
    var shake = cloud.shake ? ' is-shake' : '';
    cloud.shake = false;
    return '<form class="login-card' + shake + '" id="f-login" autocomplete="on">' +
      '<div class="login-icon">' + icon('lock', 18) + '</div>' +
      '<h1 class="login-title">Sign in</h1>' +
      '<p class="login-sub">Type the shop PIN. The same PIN works on every device.</p>' +
      '<input class="input login-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" ' +
      'placeholder="PIN" aria-label="PIN" value="' + esc(cloud.pinDraft || '') + '">' +
      '<div class="login-msg' + (cloud.err ? ' is-on' : '') + '" role="status" aria-live="polite">' +
      (cloud.err ? esc(cloud.err) : '') + '</div>' +
      '<button class="btn btn--primary login-btn" type="submit" data-act="login"' + (cloud.busy ? ' disabled' : '') + '>' +
      (cloud.busy ? 'Checking...' : 'Sign in') + '</button>' +
      '</form>';
  }

  function loginScreen() {
    return '<div class="gateway gateway--login"><div class="gateway-logo">' + logoHTML() + '</div>' +
      loginCardHTML() + '</div>';
  }
  function shell(r, content) {
    return '<div class="app"><aside class="sidebar"><div class="brand">makuru.</div>' +
      ROUTES.map(function (x, i) { return '<button class="nav' + (x.id === r ? ' active' : '') + '" style="--i:' + i + '" data-act="go" data-to="' + x.id + '">' + icon(x.icon, 18) + '<span>' + x.label + '</span></button>'; }).join('') +
      '<div class="side-foot">' +
      (cloud.mode === 'cloud' ? '<div class="sync sync--' + cloud.status + '" data-sync><i></i><span>' + syncLabel() + '</span></div>' : '') +
      '<div class="side-note"><b>' + KITCHEN.name + '</b>' + KITCHEN.suburb + '</div>' +
      '<button class="nav small" data-act="go" data-to="">' + icon('out', 16) + '<span>Exit</span></button>' +
      (cloud.mode === 'cloud' ? '<button class="nav small" data-act="signout">' + icon('lock', 16) + '<span>Sign out</span></button>' : '') +
      '<button class="nav small" data-act="clear-ask">' + icon('trash', 16) + '<span>Clear all data</span></button></div></aside>' +
      '<main class="main">' + content + '</main></div>';
  }
  function head(title, sub, actions) {
    return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div><div class="actions">' + (actions || '') + '</div></div>';
  }

  /* ---------- views ---------- */
  function viewDashboard() {
    var openOrders = db.orders.filter(function (o) { return o.status !== 'delivered'; });
    var lowMat = db.materials.filter(function (m) { return m.qty <= m.min; });
    var unpaid = db.orders.filter(function (o) { return !o.paid; }).reduce(function (a, o) { return a + o.total; }, 0);
    monthQuiet();
    var m = monthCalc(ui.finMonth);
    var html = head('Home', 'Quick look at stock and money',
      '<button class="btn" data-act="go" data-to="finance">' + icon('chart', 16) + 'Finance</button>');
    /* the month, stated once and big, right at the top */
    html += '<section class="hero-month">' +
      '<div class="hm-left"><div class="hm-label">Sales this month - ' + esc(m.label) + '</div>' +
      '<div class="hm-value" data-count="' + m.gross + '" data-kind="money" data-key="home-month">' + money(m.gross) + '</div>' +
      '<div class="hm-sub">' + (m.orderCount + m.saleCount ? m.orderCount + ' paid order' + (m.orderCount === 1 ? '' : 's') + ' + ' + m.saleCount + ' shop sale' + (m.saleCount === 1 ? '' : 's') : 'Nothing paid yet this month') + '</div></div>' +
      '<div class="hm-right">' +
        '<div class="hm-chip"><span>Net after costs</span><b class="' + (m.net < 0 ? 'neg' : '') + '">' + money(m.net) + '</b></div>' +
        (m.unpaid > 0 ? '<div class="hm-chip warn"><span>Still to collect</span><b>' + money(m.unpaid) + '</b></div>' : '') +
      '</div></section>';
    html += '<div class="stats">' +
      stat('Packs in kitchen', num(totalKitchen()), db.products.length + ' product' + (db.products.length === 1 ? '' : 's'), false, { n: totalKitchen(), k: 'qty' }) +
      stat('Packs in shops', num(totalShops()), db.shops.length + ' shop' + (db.shops.length === 1 ? '' : 's'), false, { n: totalShops(), k: 'qty' }) +
      stat('Open orders', openOrders.length, unpaid > 0 ? money(unpaid) + ' not paid yet' : 'All paid', false, { n: openOrders.length, k: 'int' }) +
      stat('Low raw materials', lowMat.length, lowMat.length ? lowMat.map(function (m) { return m.name; }).slice(0, 3).join(', ') : 'All good', lowMat.length > 0, { n: lowMat.length, k: 'int' }) +
      '</div>';
    if (!db.products.length && !db.materials.length && !db.shops.length) {
      html += panel('Get started', 'Nothing here yet. Add your first items.', '<div class="panel-body actions">' +
        '<button class="btn btn--primary" data-act="product-modal">' + icon('plus') + 'Add dimsum product</button>' +
        '<button class="btn" data-act="material-modal">' + icon('plus') + 'Add raw material</button>' +
        '<button class="btn" data-act="shop-modal">' + icon('plus') + 'Add shop</button></div>');
      return html;
    }
    html += '<div class="grid-2">';
    html += panel('Stock summary', 'Packs per product', db.products.length ? '<div class="tbl-wrap"><table><thead><tr><th>Product</th><th class="num">Kitchen</th><th class="num">Shops</th><th class="num">Total</th></tr></thead><tbody>' +
      db.products.map(function (p) { var s = packsInShops(p); return '<tr><td class="td-main">' + esc(p.name) + '</td><td class="num">' + num(p.kitchen) + '</td><td class="num">' + num(s) + '</td><td class="num"><b>' + num(p.kitchen + s) + '</b></td></tr>'; }).join('') +
      '</tbody></table></div>' : emptyBox('No products', 'Add a dimsum product to start tracking stock.', 'Add product', 'product-modal'),
      '<button class="btn btn--sm" data-act="go" data-to="stock">Open</button>');
    html += panel('Open orders', 'Not delivered yet', openOrders.length ? '<div class="tbl-wrap"><table><thead><tr><th>Ref</th><th>Customer</th><th>Delivery</th><th class="num">Total</th></tr></thead><tbody>' +
      openOrders.slice(0, 8).map(function (o) { return '<tr><td class="td-main">' + esc(o.ref) + '</td><td>' + esc(o.customer) + '<div class="td-sub">' + esc(o.suburb) + '</div></td><td>' + whenCell(o) + '</td><td class="num">' + money(o.total) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : emptyBox('No open orders', 'New orders will show here.', 'New order', 'order-modal'),
      '<button class="btn btn--sm" data-act="go" data-to="orders">Open</button>');
    html += '</div>';
    html += shopStockBlock();
    return html;
  }

  /* two blocks the owner asked for by name: what is sitting where, and what the
     month has actually paid */
  function shopStockBlock() {
    var rows = [];
    db.shops.forEach(function (s) {
      var per = db.products.map(function (p) { return { p: p, q: shopPacks(p, s.id) }; }).filter(function (x) { return x.q > 0; });
      var packs = per.reduce(function (a, x) { return a + x.q; }, 0);
      var value = per.reduce(function (a, x) { return a + x.q * (Number(x.p.price) || 0); }, 0);
      rows.push({ s: s, per: per, packs: packs, value: value });
    });
    /* shops that hold nothing still get a line, at the bottom: an empty shop is
       often the thing you want to spot */
    rows.sort(function (a, b) { return b.packs - a.packs || (a.s.name < b.s.name ? -1 : 1); });
    var body;
    if (!rows.length) body = emptyBox('No shops yet', 'Add a shop, then send packs from Dimsum Stock.', 'Add shop', 'shop-modal');
    else body = '<div class="tbl-wrap"><table class="tbl--shops"><thead><tr><th>Shop</th><th>Packs by product</th><th class="num">Packs</th><th class="num">Value</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr data-shop="' + esc(r.s.id) + '"><td><div class="td-main">' + esc(r.s.name) + '</div><div class="td-sub">' + esc(r.s.suburb || '') + (r.s.commission ? ' - ' + num(r.s.commission) + '% commission' : '') + '</div></td>' +
          '<td class="col-per">' + (r.per.length ? r.per.map(function (x) { return '<span class="pack">' + num(x.q) + ' x ' + esc(x.p.name) + '</span>'; }).join('') : '<span class="hint">No packs yet</span>') + '</td>' +
          '<td class="num"><b>' + num(r.packs) + '</b></td><td class="num">' + money(r.value) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var totalPacks = rows.reduce(function (a, r) { return a + r.packs; }, 0);
    var totalValue = rows.reduce(function (a, r) { return a + r.value; }, 0);
    return panel('Stock in shops', totalPacks ? num(totalPacks) + ' packs out at shops, ' + money(totalValue) + ' at selling price' : 'Packs you left at each shop',
      body + (rows.length ? '<div class="panel-foot"><span class="hint">' + db.shops.length + ' shop' + (db.shops.length === 1 ? '' : 's') + ' - ' + money(totalValue) + ' at selling price</span><button class="btn btn--sm" data-act="go" data-to="shops">Open shops</button></div>' : ''));
  }

  function monthQuiet() {
    if (ui.finMonth) return;
    ui.finMonth = today().slice(0, 7);
  }
  function viewFinance() {
    monthQuiet();
    var months = saleMonths();
    if (months.indexOf(ui.finMonth) < 0) { months.push(ui.finMonth); months.sort().reverse(); }
    var m = monthCalc(ui.finMonth);
    var last = monthCalc(addMonth(ui.finMonth, -1));
    var prevMonths = months.filter(function (x) { return x < ui.finMonth; });
    var prev = prevMonths.length ? monthCalc(prevMonths[0]) : null;
    var before = last.gross > 0 ? last : prev;

    var html = head('Finance', 'What came in, what it cost, what is left. Every figure in AUD.',
      '<button class="btn" data-act="fin-settings">' + icon('edit') + 'Monthly costs</button>' +
      '<button class="btn" data-act="fin-csv">' + icon('out') + 'Download CSV</button>');

    var picker = '<div class="months-pick">' + months.slice(0, 12).map(function (k) {
      return '<button data-act="fin-month" data-ym="' + k + '" class="mp' + (k === m.ym ? ' is-now' : '') + '">' + monthLabel(k) + '</button>';
    }).join('') + '</div>';

    html += '<div class="stats stats--4">' +
      stat('Revenue - ' + monthShort(m.ym), money(m.gross), m.orderCount + ' order' + (m.orderCount === 1 ? '' : 's') + ' + ' + m.saleCount + ' shop sale' + (m.saleCount === 1 ? '' : 's'), false, { n: m.gross, k: 'money' }) +
      stat('Commission', money(m.commission), m.commission ? 'Paid to shops on their sales' : 'No shop sales this month', false, { n: m.commission, k: 'money' }) +
      stat('Costs', money(m.rent + m.cogs), (m.rent ? money(m.rent) + ' fixed' : 'No fixed cost') + (m.cogs ? ' - ' + money(m.cogs) + ' food' : ''), false, { n: m.rent + m.cogs, k: 'money' }) +
      stat('Net', money(m.net), m.net > 0 ? (m.gross ? Math.round(m.net / m.gross * 100) + '% of revenue' : 'Money you kept') : 'Below break even', m.net < 0, { n: m.net, k: 'money' }) +
      '</div>';

    html += '<div class="fin-cols">';

    /* profit and loss */
    var pl = [
      ['Paid orders', m.orderRevenue, 'Customer orders marked paid in ' + m.label],
      ['Shop sales', m.shopRevenue, 'What the shops reported at selling price'],
      ['Revenue', m.gross, 'Everything that came in', 'sum'],
      ['Shop commission', -m.commission, m.commission ? 'The shops keep this part' : 'Nothing owed to shops', 'minus'],
      ['Food cost', -m.cogs, m.cogs ? 'Cost per pack you filled in' : (db.products.length ? 'Add a cost per pack to a product to see this' : 'No products yet'), 'minus'],
      ['Fixed costs', -m.rent, m.rent ? 'Rent, van, subscriptions per month' : 'Set your monthly costs', 'minus'],
      ['Net profit', m.net, m.net >= 0 ? 'What you kept' : 'You spent more than you took', 'sum']
    ];
    html += panel('Profit and loss', m.label, '<div class="tbl-wrap"><table class="tbl--pl"><tbody>' +
      pl.map(function (r) {
        var cls = r[3] === 'sum' ? 'pl-sum' : (r[3] === 'minus' ? 'pl-minus' : '');
        return '<tr class="' + cls + '"><td><div class="td-main">' + esc(r[0]) + '</div><div class="td-sub">' + esc(r[2]) + '</div></td><td class="num ' + (r[1] < 0 ? 'neg' : '') + '">' + money(r[1]) + '</td></tr>';
      }).join('') + '</tbody></table></div>',
      '<button class="btn btn--sm" data-act="fin-settings">' + icon('edit', 14) + 'Costs</button>');

    /* month by month */
    var trail = [];
    for (var i = 0; i < 6; i++) trail.push(addMonth(m.ym, -i));
    var trailCalc = trail.map(function (k) { return monthCalc(k); });
    var max = 0; trailCalc.forEach(function (x) { max = Math.max(max, x.gross); });
    html += panel('Month by month', 'Revenue and net for the last six months', '<div class="bars">' +
      trailCalc.reverse().map(function (x) {
        var h = max ? Math.max(2, Math.round(x.gross / max * 100)) : 0;
        var hn = max ? Math.max(0, Math.round(Math.max(0, x.net) / max * 100)) : 0;
        return '<div class="bar-col' + (x.ym === m.ym ? ' is-now' : '') + '" title="' + monthLabel(x.ym) + ': ' + money(x.gross) + ' in, ' + money(x.net) + ' net">' +
          '<div class="bar-stack"><i class="bar bar--net" style="height:' + hn + '%"></i><i class="bar bar--rev" style="height:' + h + '%"></i></div>' +
          '<div class="bar-val">' + (x.gross ? money(x.gross) : '-') + '</div>' +
          '<div class="bar-lab">' + monthLabel(x.ym).slice(0, 3) + '</div></div>';
      }).join('') + '</div><div class="legend"><span><i class="dot dot--rev"></i>Revenue</span><span><i class="dot dot--net"></i>Net</span></div>');

    html += '</div>';

    /* the shape of the month */
    var series = dailySeries(m.ym, 'all');
    var dailyMax = Math.max.apply(null, series.concat([1]));
    var bestDay = 0, bestVal = 0;
    series.forEach(function (v, idx) { if (v > bestVal) { bestVal = v; bestDay = idx + 1; } });
    var busiest = byKey(monthPaidOrders(m.ym), function (o) { return (o.created || '').slice(11, 13); }, function (o) { return o.total; });
    var hourLabel = function (h) { var n = Number(h); if (isNaN(n)) return ''; return fmtTime(h + ':00'); };
    html += panel('Day by day', m.label + ' - ' + money(m.gross) + ' over ' + m.packs + ' pack' + (m.packs === 1 ? '' : 's'),
      '<div class="spark">' + series.map(function (v, idx) {
        var h = Math.round(v / dailyMax * 100);
        return '<i style="height:' + Math.max(v > 0 ? 6 : 2, h) + '%" class="' + (v > 0 ? 'has' : '') + '" title="' + (idx + 1) + ' ' + m.label + ': ' + money(v) + '"></i>';
      }).join('') + '</div>' +
      '<div class="spark-foot"><span>1 ' + monthLabel(m.ym).slice(0, 3) + '</span>' +
      '<span>' + (bestVal ? 'Best day ' + bestDay + ' ' + monthShort(m.ym) + ': ' + money(bestVal) : 'No sales yet') + '</span>' +
      '<span>' + series.length + ' days</span></div>');

    /* where the money comes from */
    var byShop = byKey(monthSales(m.ym), function (x) { var s = shop(x.shop_id); return s ? s.name : (x.shop_name || 'Unknown shop'); }, function (x) { return x.amount; });
    var byProduct = byKey(monthPaidOrders(m.ym).reduce(function (a, o) { return a.concat(o.items || []); }, []).concat(monthSales(m.ym).map(function (x) { return { name: x.product_name, qty: x.qty, price: x.amount / (x.qty || 1) }; })), function (i) { return i.name; }, function (i) { return (Number(i.price) || 0) * (Number(i.qty) || 0); });

    html += '<div class="fin-cols">';
    html += panel('Shop ranking', 'Who sold the most for you', byShop.length ? '<div class="rank">' + byShop.map(function (x, idx) {
      var pct = m.shopRevenue ? Math.round(x.value / m.shopRevenue * 100) : 0;
      return '<div class="rank-row"><span class="rank-n">' + (idx + 1) + '</span><div class="rank-main"><div class="rank-top"><b>' + esc(x.key) + '</b><span>' + money(x.value) + '</span></div><div class="rank-bar"><i style="width:' + Math.max(3, pct) + '%"></i></div></div></div>';
    }).join('') + '</div>' : '<div class="empty">No shop sales this month.<br><span class="hint">Open Shops, then use Sold when a shop reports.</span><div class="panel-body actions"><button class="btn btn--sm" data-act="go" data-to="shops">Open shops</button></div></div>');
    html += panel('Product mix', 'Revenue by product this month', byProduct.length ? '<div class="rank">' + byProduct.map(function (x, idx) {
      var total = byProduct.reduce(function (a, y) { return a + y.value; }, 0);
      var pct = total ? Math.round(x.value / total * 100) : 0;
      return '<div class="rank-row"><span class="rank-n">' + (idx + 1) + '</span><div class="rank-main"><div class="rank-top"><b>' + esc(x.key) + '</b><span>' + money(x.value) + ' <em>' + pct + '%</em></span></div><div class="rank-bar"><i style="width:' + Math.max(3, pct) + '%"></i></div></div></div>';
    }).join('') + '</div>' : '<div class="empty">No paid orders or shop sales this month.</div>');
    html += '</div>';

    /* plain words + the things worth acting on */
    var tips = [];
    if (m.unpaid > 0) tips.push({ t: 'Collect ' + money(m.unpaid), d: m.unpaidCount + ' order' + (m.unpaidCount === 1 ? ' is' : 's are') + ' not paid yet. It is not counted as revenue until it is paid.', act: 'orders', to: 'orders', a: 'Open orders' });
    if (!db.products.some(function (p) { return Number(p.cost) > 0; }) && db.products.length) tips.push({ t: 'Add a cost per pack', d: 'Without it the money page cannot show your real food cost or profit.', act: 'product-modal', a: 'Add cost' });
    if (!m.rent) tips.push({ t: 'Set your monthly costs', d: 'Rent, the van, subscriptions. Put them in once and every month gets more honest.', act: 'fin-settings', a: 'Set costs' });
    var lowMat = db.materials.filter(function (x) { return x.qty <= x.min; });
    if (lowMat.length) tips.push({ t: 'Restock ' + lowMat.length + ' raw material' + (lowMat.length === 1 ? '' : 's'), d: lowMat.slice(0, 3).map(function (x) { return x.name; }).join(', ') + '. Cooking stops without these.', act: 'goto-materials', a: 'Open materials' });
    var idle = [];
    db.shops.forEach(function (s) {
      var packs = db.products.reduce(function (a, p) { return a + shopPacks(p, s.id); }, 0);
      var sold = monthSales(m.ym).filter(function (x) { return x.shop_id === s.id; });
      if (packs > 0 && !sold.length) idle.push(s.name);
    });
    if (idle.length) tips.push({ t: idle.length + ' shop' + (idle.length === 1 ? '' : 's') + ' with no sale this month', d: idle.slice(0, 3).join(', ') + '. Check whether packs there are old.', act: 'goto-shops', a: 'Open shops' });
    if (before && before.gross > 0 && m.gross < before.gross) tips.push({ t: 'Down ' + Math.round((1 - m.gross / before.gross) * 100) + '% from ' + before.label, d: before.label + ' was ' + money(before.gross) + ', this month is ' + money(m.gross) + '.', act: '', a: '' });

    html += panel('Plain words', m.label,
      '<p class="story">' + esc(monthStory(m)) + '</p>' +
      (tips.length ? '<div class="tips">' + tips.map(function (x) {
        return '<div class="tip"><div><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></div>' + (x.act ? '<button class="btn btn--sm" data-act="' + x.act + '"' + (x.to ? ' data-to="' + x.to + '"' : '') + '>' + esc(x.a) + '</button>' : '') + '</div>';
      }).join('') + '</div>' : '<p class="hint">Nothing needs your attention this month.</p>'));

    /* the receipts */
    var ledger = monthPaidOrders(m.ym).map(function (o) {
      return { date: o.date, what: 'Order ' + o.ref, who: o.customer + (o.pay ? ' - ' + o.pay : ''), packs: o.packs, amount: o.total, kind: 'order' };
    }).concat(monthSales(m.ym).map(function (x) {
      var s = shop(x.shop_id);
      return { date: x.date, what: x.product_name, who: (s ? s.name : x.shop_name) + ' - shop sale', packs: x.qty, amount: x.amount, kind: 'shop' };
    })).sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });

    html += panel('Every sale this month', m.orderCount + m.saleCount + ' entries', ledger.length ? '<div class="tbl-wrap"><table class="tbl--ledger"><thead><tr><th>Date</th><th>What</th><th>Customer / shop</th><th class="num">Packs</th><th class="num">Amount</th></tr></thead><tbody>' +
      ledger.map(function (r) {
        return '<tr><td>' + fmtDate(r.date) + '</td><td><div class="td-main">' + esc(r.what) + '</div><div class="td-sub">' + (r.kind === 'order' ? 'Paid order' : 'Shop sale') + '</div></td><td>' + esc(r.who) + '</td><td class="num">' + num(r.packs) + '</td><td class="num"><b>' + money(r.amount) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">Nothing paid in ' + esc(m.label) + ' yet.<br><span class="hint">Orders count here once you mark them paid.</span></div>');

    html += picker;
    return html;
  }

  function viewStock() {
    var html = head('Dimsum Stock', 'Packs in ' + KITCHEN.name + ' (' + KITCHEN.suburb + ') and in shops',
      '<button class="btn btn--primary" data-act="product-modal">' + icon('plus') + 'Add product</button>');
    html += '<div class="stats">' +
      stat('Packs in kitchen', num(totalKitchen()), 'Ready to sell or send', false, { n: totalKitchen(), k: 'qty' }) +
      stat('Packs in shops', num(totalShops()), 'On consignment', false, { n: totalShops(), k: 'qty' }) +
      stat('Products', db.products.length, '', false, { n: db.products.length, k: 'int' }) +
      stat('Out of stock', db.products.filter(function (p) { return p.kitchen <= 0; }).length, 'No packs in kitchen', db.products.some(function (p) { return p.kitchen <= 0; }), { n: db.products.filter(function (p) { return p.kitchen <= 0; }).length, k: 'int' }) +
      '</div>';
    if (!db.products.length) return html + panel('Products', '', emptyBox('No products yet', 'Add a product, for example "Siomay Ayam", then add packs.', 'Add product', 'product-modal'));
    html += panel('Products', 'Use the buttons to add, remove or send packs', '<div class="tbl-wrap"><table><thead><tr><th>Product</th><th class="num">Price / pack</th><th class="num">In kitchen</th><th class="num">In shops</th><th class="num">Total</th><th>Status</th><th class="act">Actions</th></tr></thead><tbody>' +
      db.products.map(function (p) {
        var s = packsInShops(p);
        var st = p.kitchen <= 0 ? '<span class="pill out">Out</span>' : p.kitchen <= 5 ? '<span class="pill low">Low</span>' : '<span class="pill ok">OK</span>';
        return '<tr><td><div class="td-main">' + esc(p.name) + '</div><div class="td-sub">' + esc(p.pack_size || '') + '</div></td>' +
          '<td class="num">' + money(p.price) + '</td><td class="num"><b>' + num(p.kitchen) + '</b></td><td class="num">' + num(s) + '</td><td class="num">' + num(p.kitchen + s) + '</td><td>' + st + '</td>' +
          '<td class="act"><button class="btn btn--sm" data-act="packs-modal" data-id="' + p.id + '" data-mode="add">' + icon('plus', 14) + 'Add</button>' +
          '<button class="btn btn--sm" data-act="packs-modal" data-id="' + p.id + '" data-mode="remove">' + icon('minus', 14) + 'Remove</button>' +
          '<button class="btn btn--sm" data-act="send-modal" data-id="' + p.id + '"' + (db.shops.length ? '' : ' disabled title="Add a shop first"') + '>' + icon('send', 14) + 'Send to shop</button>' +
          '<button class="btn btn--sm btn--ghost" data-act="product-modal" data-id="' + p.id + '">' + icon('edit', 14) + '</button>' +
          '<button class="btn btn--sm btn--danger" data-act="product-del-ask" data-id="' + p.id + '">' + icon('trash', 14) + 'Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>');
    return html;
  }

  function viewMaterials() {
    var low = db.materials.filter(function (m) { return m.qty <= m.min; });
    var html = head('Raw Materials', 'Ingredients and packaging in the kitchen',
      '<button class="btn btn--primary" data-act="material-modal">' + icon('plus') + 'Add material</button>');
    html += '<div class="stats">' +
      stat('Materials', db.materials.length, 'Tracked items', false, { n: db.materials.length, k: 'int' }) +
      stat('Low stock', low.length, low.length ? 'Below minimum' : 'All good', low.length > 0, { n: low.length, k: 'int' }) +
      stat('Out of stock', db.materials.filter(function (m) { return m.qty <= 0; }).length, '', false, { n: db.materials.filter(function (m) { return m.qty <= 0; }).length, k: 'int' }) +
      stat('Kitchen', KITCHEN.name, KITCHEN.suburb) +
      '</div>';
    if (!db.materials.length) return html + panel('Materials', '', emptyBox('No raw materials yet', 'Add things like chicken, prawn, wrappers, bags.', 'Add material', 'material-modal'));
    html += panel('Materials', 'Add when you buy, use when you cook', '<div class="tbl-wrap"><table><thead><tr><th>Material</th><th class="num">In stock</th><th class="num">Minimum</th><th>Status</th><th class="act">Actions</th></tr></thead><tbody>' +
      db.materials.map(function (m) {
        var st = m.qty <= 0 ? '<span class="pill out">Out</span>' : m.qty <= m.min ? '<span class="pill low">Low</span>' : '<span class="pill ok">OK</span>';
        return '<tr><td class="td-main">' + esc(m.name) + '</td><td class="num"><b>' + num(m.qty) + '</b> ' + esc(m.unit) + '</td><td class="num">' + num(m.min) + ' ' + esc(m.unit) + '</td><td>' + st + '</td>' +
          '<td class="act"><button class="btn btn--sm" data-act="mat-qty-modal" data-id="' + m.id + '" data-mode="add">' + icon('plus', 14) + 'Add</button>' +
          '<button class="btn btn--sm" data-act="mat-qty-modal" data-id="' + m.id + '" data-mode="use">' + icon('minus', 14) + 'Use</button>' +
          '<button class="btn btn--sm btn--ghost" data-act="material-modal" data-id="' + m.id + '">' + icon('edit', 14) + '</button>' +
          '<button class="btn btn--sm btn--danger" data-act="material-del-ask" data-id="' + m.id + '">' + icon('trash', 14) + 'Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>');
    return html;
  }

  function viewShops() {
    var html = head('Shops', 'Packs you left at each shop (consignment)',
      '<button class="btn btn--primary" data-act="shop-modal">' + icon('plus') + 'Add shop</button>');
    if (!db.shops.length) return html + panel('Shops', '', emptyBox('No shops yet', 'Add a shop, then send packs from Dimsum Stock.', 'Add shop', 'shop-modal'));
    html += '<div class="shop-grid">';
    db.shops.forEach(function (s) {
      var rows = db.products.filter(function (p) { return shopPacks(p, s.id) > 0; });
      var total = rows.reduce(function (a, p) { return a + shopPacks(p, s.id); }, 0);
      html += '<section class="panel"><div class="panel-head"><div><h2>' + esc(s.name) + '</h2><p>' + esc(s.suburb || '') + (s.phone ? ' - ' + esc(phoneFmt(s.phone)) : '') + '</p></div><div class="shop-total"><span class="cnt" data-count="' + total + '" data-kind="qty" data-key="shop-' + esc(s.id) + '">' + num(total) + '</span> <span class="hint">packs</span></div></div>' +
        (rows.length ? '<div class="tbl-wrap"><table><thead><tr><th>Product</th><th class="num">Packs</th><th class="act">Actions</th></tr></thead><tbody>' +
          rows.map(function (p) {
            return '<tr><td class="td-main">' + esc(p.name) + '</td><td class="num"><b>' + num(shopPacks(p, s.id)) + '</b></td><td class="act">' +
              '<button class="btn btn--sm" data-act="sold-modal" data-shop="' + s.id + '" data-id="' + p.id + '">' + icon('check', 14) + 'Sold</button>' +
              '<button class="btn btn--sm" data-act="back-modal" data-shop="' + s.id + '" data-id="' + p.id + '">' + icon('undo', 14) + 'Take back</button></td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty">No packs at this shop.<br><span class="hint">Go to Dimsum Stock and use "Send to shop".</span></div>') +
        '<div class="panel-head" style="border-top:1px solid var(--line);border-bottom:0"><span class="hint">Commission ' + num(s.commission || 0) + '%</span><div class="actions"><button class="btn btn--sm btn--ghost" data-act="shop-modal" data-id="' + s.id + '">' + icon('edit', 14) + 'Edit</button><button class="btn btn--sm btn--danger" data-act="shop-del-ask" data-id="' + s.id + '">' + icon('trash', 14) + 'Delete</button></div></div></section>';
    });
    html += '</div>';
    var sales = db.sales.slice().reverse();
    html += '<div style="height:18px"></div>' + panel('Shop sales', 'Packs the shops reported as sold', sales.length ? '<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Shop</th><th>Product</th><th class="num">Packs</th><th class="num">Amount</th><th class="act">Actions</th></tr></thead><tbody>' +
      sales.map(function (x) {
        var s = shop(x.shop_id), p = product(x.product_id);
        return '<tr><td>' + fmtDate(x.date) + '</td><td>' + esc(s ? s.name : x.shop_name) + '</td><td>' + esc(p ? p.name : x.product_name) + '</td><td class="num">' + num(x.qty) + '</td><td class="num">' + money(x.amount) + '</td><td class="act"><button class="btn btn--sm btn--danger" data-act="sale-del-ask" data-id="' + x.id + '">' + icon('trash', 14) + 'Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">No shop sales yet.</div>');
    return html;
  }

  function viewOrders() {
    var list = db.orders.slice().reverse().filter(function (o) {
      if (ui.orderFilter === 'open') return o.status !== 'delivered';
      if (ui.orderFilter === 'done') return o.status === 'delivered';
      return true;
    });
    var open = db.orders.filter(function (o) { return o.status !== 'delivered'; });
    var unpaid = db.orders.filter(function (o) { return !o.paid; });
    var totalSales = db.orders.filter(function (o) { return o.paid; }).reduce(function (a, o) { return a + o.total; }, 0) + db.sales.reduce(function (a, s) { return a + s.amount; }, 0);
    var html = head('Orders', 'Customer orders. Packs come out of kitchen stock when you save an order.',
      '<button class="btn btn--primary" data-act="order-modal"' + (db.products.length ? '' : ' disabled title="Add a product first"') + '>' + icon('plus') + 'New order</button>');
    html += '<div class="stats">' +
      stat('Open orders', open.length, open.reduce(function (a, o) { return a + o.packs; }, 0) + ' packs to deliver', false, { n: open.length, k: 'int' }) +
      stat('Not paid', unpaid.length, money(unpaid.reduce(function (a, o) { return a + o.total; }, 0)), unpaid.length > 0, { n: unpaid.length, k: 'int' }) +
      stat('All orders', db.orders.length, '', false, { n: db.orders.length, k: 'int' }) +
      stat('Total sales', money(totalSales), 'Paid orders + shop sales', false, { n: totalSales, k: 'money' }) +
      '</div>';
    var seg = '<div class="seg">' + [['open', 'Open'], ['done', 'Delivered'], ['all', 'All']].map(function (f) { return '<button data-act="order-filter" data-f="' + f[0] + '" class="' + (ui.orderFilter === f[0] ? 'active' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>';
    html += panel('Order list', '', list.length ? '<div class="tbl-wrap"><table class="tbl--orders"><thead><tr><th>Ref</th><th>Customer</th><th>Delivery</th><th class="col-items">Items</th><th class="num">Total</th><th>Paid</th><th>Status</th><th class="act">Actions</th></tr></thead><tbody>' +
      list.map(function (o) {
        return '<tr><td class="td-main">' + esc(o.ref) + '</td><td><div class="td-main">' + esc(o.customer) + '</div><div class="td-sub">' + esc(phoneFmt(o.phone)) + (o.suburb ? ' - ' + esc(o.suburb) : '') + '</div></td><td>' +
          '<div>' + fmtDate(o.date) + '</div>' +
          '<button class="btn btn--sm btn--ghost time-slot" data-act="order-time" data-id="' + o.id + '">' +
            icon('clock', 13) + '<span>' + (fmtTime(o.time) || 'Add time') + '</span>' + icon('edit', 12) +
          '</button></td>' +
          '<td class="col-items"><div class="td-sub" style="margin:0">' + o.items.map(function (i) { return num(i.qty) + ' x ' + esc(i.name); }).join('<br>') + '</div></td>' +
          '<td class="num"><b>' + money(o.total) + '</b></td><td>' + (o.paid ? '<span class="pill ok">Paid' + (o.pay ? ' - ' + esc(o.pay) : '') + '</span>' : '<span class="pill red">Not paid</span>') + '</td>' +
          '<td>' + (o.status === 'delivered' ? '<span class="pill ok">Delivered</span>' : '<span class="pill">Open</span>') + '</td>' +
          /* the next step is always the red button: paid first, delivered only after */
          '<td class="act">' + (o.paid ? '' : '<button class="btn btn--sm btn--primary" data-act="paid-modal" data-id="' + o.id + '">' + icon('check', 14) + 'Paid</button>') +
          ((o.status === 'delivered' || !o.paid) ? '' : '<button class="btn btn--sm btn--primary" data-act="order-deliver" data-id="' + o.id + '">' + icon('send', 14) + 'Delivered</button>') +
          '<button class="btn btn--sm btn--danger" data-act="order-del-ask" data-id="' + o.id + '">' + icon('trash', 14) + 'Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' : emptyBox('No orders here', ui.orderFilter === 'open' ? 'Open orders will show here.' : 'Nothing to show.', db.products.length ? 'New order' : '', 'order-modal'), seg);
    return html;
  }

  /* ---------- modals ---------- */
  function productModal(id) {
    var p = id ? product(id) : null;
    modal(p ? 'Edit product' : 'Add dimsum product', p ? '' : 'You can add packs after saving.', form('f-product',
      (p ? '<input type="hidden" name="id" value="' + p.id + '">' : '') +
      field('Product name', input('name', { ph: 'e.g. Siomay Ayam', value: p ? p.name : '', req: true })) +
      '<div class="row">' + field('Pack size (optional)', input('pack_size', { ph: 'e.g. 6 pcs', value: p ? p.pack_size : '' })) + field('Price per pack (AUD)', input('price', { type: 'number', min: 0, step: '0.5', value: p ? p.price : '', ph: '0.00', req: true })) + '</div>' +
      '<div class="row">' +
        field('Cost per pack (optional)', input('cost', { type: 'number', min: 0, step: '0.5', value: p && p.cost ? p.cost : '', ph: '0.00' })) +
        field('Cooking time (optional)', input('clock', { ph: 'e.g. 25 min', value: p ? p.clock : '' })) +
      '</div>' +
      '<p class="hint">The cost per pack is what the ingredients in one pack cost you. Fill it in and the money page works out your profit.</p>' +
      (p ? '' : field('Packs in kitchen now', input('kitchen', { type: 'number', min: 0, step: '1', value: 0 }))) +
      foot(p ? 'Save' : 'Add product', 'product-save')));
  }
  function packsModal(id, mode) {
    var p = product(id); if (!p) return;
    var add = mode === 'add';
    modal((add ? 'Add packs: ' : 'Remove packs: ') + p.name, 'Now in kitchen: ' + num(p.kitchen) + ' packs', form('f-packs',
      '<input type="hidden" name="id" value="' + p.id + '"><input type="hidden" name="mode" value="' + mode + '">' +
      field('How many packs', input('qty', { type: 'number', min: 1, step: '1', value: '', req: true })) +
      (add ? '<p class="hint">Use this after cooking a new batch.</p>' : field('Reason (optional)', input('note', { ph: 'e.g. spoiled, given away' }))) +
      foot(add ? 'Add packs' : 'Remove packs', 'packs-save')));
  }
  function sendModal(id) {
    var p = product(id); if (!p) return;
    modal('Send to shop: ' + p.name, 'Now in kitchen: ' + num(p.kitchen) + ' packs', form('f-send',
      '<input type="hidden" name="id" value="' + p.id + '">' +
      field('Shop', select('shop', db.shops.map(function (s) { return [s.id, s.name]; }))) +
      field('How many packs', input('qty', { type: 'number', min: 1, step: '1', value: '', req: true })) +
      foot('Send', 'send-save')));
  }
  function materialModal(id) {
    var m = id ? byId(db.materials, id) : null;
    modal(m ? 'Edit material' : 'Add raw material', '', form('f-material',
      (m ? '<input type="hidden" name="id" value="' + m.id + '">' : '') +
      field('Name', input('name', { ph: 'e.g. Chicken mince', value: m ? m.name : '', req: true })) +
      '<div class="row">' + field('Unit', select('unit', [['kg', 'kg'], ['g', 'g'], ['pcs', 'pcs'], ['pack', 'pack'], ['L', 'L']], m ? m.unit : 'kg')) +
      field('Warn me when below', input('min', { type: 'number', min: 0, step: 'any', value: m ? m.min : 0 })) + '</div>' +
      (m ? '' : field('In stock now', input('qty', { type: 'number', min: 0, step: 'any', value: 0 }))) +
      foot(m ? 'Save' : 'Add material', 'material-save')));
  }
  function matQtyModal(id, mode) {
    var m = byId(db.materials, id); if (!m) return;
    var add = mode === 'add';
    modal((add ? 'Add: ' : 'Use: ') + m.name, 'In stock now: ' + num(m.qty) + ' ' + m.unit, form('f-matqty',
      '<input type="hidden" name="id" value="' + m.id + '"><input type="hidden" name="mode" value="' + mode + '">' +
      field('Amount (' + m.unit + ')', input('qty', { type: 'number', min: 0, step: 'any', value: '', req: true })) +
      foot(add ? 'Add' : 'Use', 'matqty-save')));
  }
  function shopModal(id) {
    var s = id ? shop(id) : null;
    modal(s ? 'Edit shop' : 'Add shop', '', form('f-shop',
      (s ? '<input type="hidden" name="id" value="' + s.id + '">' : '') +
      field('Shop name', input('name', { ph: 'e.g. Asian Grocer Campsie', value: s ? s.name : '', req: true })) +
      '<div class="row">' + field('Suburb', input('suburb', { ph: 'e.g. Campsie NSW', value: s ? s.suburb : '' })) + field('Phone', input('phone', { ph: '04xx xxx xxx', value: s ? s.phone : '' })) + '</div>' +
      field('Shop commission (%)', input('commission', { type: 'number', min: 0, max: 100, step: '1', value: s ? s.commission : 0 })) +
      foot(s ? 'Save' : 'Add shop', 'shop-save')));
  }
  function soldModal(shopId, pid) {
    var s = shop(shopId), p = product(pid); if (!s || !p) return;
    var have = shopPacks(p, shopId);
    modal('Sold at ' + s.name, p.name + ' - ' + num(have) + ' packs at this shop', form('f-sold',
      '<input type="hidden" name="shop" value="' + s.id + '"><input type="hidden" name="id" value="' + p.id + '">' +
      '<div class="row">' + field('Packs sold', input('qty', { type: 'number', min: 1, step: '1', value: '', req: true })) + field('Price per pack (AUD)', input('price', { type: 'number', min: 0, step: '0.5', value: p.price })) + '</div>' +
      field('Date', input('date', { type: 'date', value: today() })) +
      '<p class="hint">Shop keeps ' + num(s.commission || 0) + '% commission. Amount saved is the total before commission.</p>' +
      foot('Save sale', 'sold-save')));
  }
  function backModal(shopId, pid) {
    var s = shop(shopId), p = product(pid); if (!s || !p) return;
    modal('Take back from ' + s.name, p.name + ' - ' + num(shopPacks(p, shopId)) + ' packs at this shop', form('f-back',
      '<input type="hidden" name="shop" value="' + s.id + '"><input type="hidden" name="id" value="' + p.id + '">' +
      field('Packs to take back', input('qty', { type: 'number', min: 1, step: '1', value: '', req: true })) +
      '<label class="check"><input type="checkbox" name="to_kitchen" checked> Put them back in kitchen stock</label>' +
      '<p class="hint">Untick if the packs are spoiled and should be thrown away.</p>' +
      foot('Take back', 'back-save')));
  }
  function orderItemRow() {
    return '<div class="row-3 order-item">' + select('prod', db.products.map(function (p) { return [p.id, p.name + ' (' + num(p.kitchen) + ' in kitchen) - ' + money(p.price)]; })) +
      input('qty', { type: 'number', min: 1, step: '1', value: 1 }) + '<button type="button" class="btn btn--sm btn--ghost" data-act="item-remove">' + icon('x', 14) + '</button></div>';
  }
  function orderModal() {
    modal('New order', 'Packs are taken from kitchen stock when you save.', form('f-order',
      '<div class="row">' + field('Customer name', input('customer', { ph: 'Name', req: true })) + field('Phone', input('phone', { ph: '04xx xxx xxx' })) + '</div>' +
      '<div class="row">' + field('Suburb / pickup', input('suburb', { ph: 'e.g. Lakemba or Pickup' })) + field('Delivery date', input('date', { type: 'date', value: today() })) + '</div>' +
      '<div class="row">' + field('Pickup time (optional)', input('time', { type: 'time' })) + field('Note (optional)', input('note', { ph: 'e.g. no chili' })) + '</div>' +
      '<div class="field"><label>Items</label><div class="items-list" id="items">' + orderItemRow() + '</div><button type="button" class="btn btn--sm" style="margin-top:8px" data-act="item-add">' + icon('plus', 14) + 'Add another item</button></div>' +
      '<div class="total-line"><span>Total</span><span id="order-total">$0.00</span></div>' +
      '<label class="check"><input type="checkbox" name="paid" data-act="paid-toggle"> Already paid</label>' +
      '<div class="hidden" id="paid-when">' + field('Paid with', select('pay', [['PayID', 'PayID'], ['Bank transfer', 'Bank transfer'], ['Cash', 'Cash']])) + '</div>' +
      foot('Save order', 'order-save')), true);
    updateOrderTotal();
  }
  function updateOrderTotal() {
    var f = document.getElementById('f-order'); if (!f) return;
    var t = 0;
    f.querySelectorAll('.order-item').forEach(function (r) { var p = product(r.querySelector('select').value); var q = Number(r.querySelector('input').value) || 0; if (p) t += p.price * q; });
    var el = document.getElementById('order-total'); if (el) el.textContent = money(t);
  }
  function timeModal(id) {
    var o = byId(db.orders, id); if (!o) return;
    modal('Pickup time: ' + o.ref, o.customer + ' - ' + fmtDate(o.date), form('f-time',
      '<input type="hidden" name="id" value="' + o.id + '">' +
      '<div class="row">' + field('Delivery date', input('date', { type: 'date', value: o.date })) +
      field('Pickup time', input('time', { type: 'time', value: o.time || '' })) + '</div>' +
      '<p class="hint">Leave the time empty if this order has no fixed pickup time.</p>' +
      foot('Save time', 'time-save')));
  }
  function paidModal(id) {
    var o = byId(db.orders, id); if (!o) return;
    modal('Mark as paid: ' + o.ref, money(o.total), form('f-paid',
      '<input type="hidden" name="id" value="' + o.id + '">' +
      field('Paid with', select('pay', [['PayID', 'PayID'], ['Bank transfer', 'Bank transfer'], ['Cash', 'Cash']])) +
      foot('Mark paid', 'paid-save')));
  }

  function finSettingsModal() {
    var st = db.settings || emptySettings();
    modal('Monthly costs', 'Fixed costs that do not change with how much you sell.', form('f-fincost',
      '<div class="row">' + field('Rent / van / subscriptions (AUD)', input('rent', { type: 'number', min: 0, step: '1', value: st.rent || 0, ph: '0' })) + '</div>' +
      '<p class="hint">Shop commission and food cost are worked out from your own numbers, so they do not go here.</p>' +
      foot('Save costs', 'fin-settings-save')));
  }

  /* one file the accountant can open: the whole month, plus the recap on top */
  function downloadCsv() {
    var m = monthCalc(ui.finMonth);
    var rows = [['month', m.label], ['revenue', m.gross.toFixed(2)], ['shop commission', (-m.commission).toFixed(2)],
      ['food cost', (-m.cogs).toFixed(2)], ['fixed costs', (-m.rent).toFixed(2)], ['net', m.net.toFixed(2)], []];
    rows.push(['date', 'type', 'ref', 'customer or shop', 'product', 'packs', 'amount']);
    monthPaidOrders(m.ym).forEach(function (o) {
      (o.items || []).forEach(function (i) {
        rows.push([o.date, 'order', o.ref, o.customer, i.name, i.qty, (i.price * i.qty).toFixed(2)]);
      });
    });
    monthSales(m.ym).forEach(function (x) {
      var s = shop(x.shop_id);
      rows.push([x.date, 'shop sale', '', s ? s.name : x.shop_name, x.product_name, x.qty, Number(x.amount).toFixed(2)]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        c = c === undefined || c === null ? '' : String(c);
        return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'makuru-' + m.ym + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
    toast('CSV ready');
  }

  /* ---------- actions ---------- */
  function vals(formEl) {
    var o = {}; Array.prototype.forEach.call(formEl.elements, function (el) { if (!el.name) return; o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return o;
  }
  function need(cond, msg) { if (!cond) { toast(msg, true); throw new Error('stop'); } }

  var ACT = {
    enter: function () { mkHop(); go('dashboard'); },
    login: function (b, f) {
      if (cloud.unlocking) return;
      var pin = (vals(f).pin || '').trim();
      if (!pin) { cloud.err = 'Type the PIN.'; render(); return; }
      doLogin(pin);
    },
    signout: function () { signOut(); },
    go: function (b) { go(b.getAttribute('data-to')); },
    close: function () { closeModal(); },
    'order-filter': function (b) { ui.orderFilter = b.getAttribute('data-f'); render(); },
    'clear-ask': function () { confirmDelete('all data', 'clear-do', '', 'All products, materials, shops, orders and shop sales will be removed.'); },
    'clear-do': function () { db = emptyDB(); save(); closeModal(); render(); toast('All data cleared'); },

    'product-modal': function (b) { productModal(b.getAttribute('data-id')); },
    'product-save': function (b, f) {
      var v = vals(f); need(v.name.trim(), 'Please type a product name');
      if (v.id) { var p = product(v.id); p.name = v.name.trim(); p.pack_size = v.pack_size.trim(); p.price = Number(v.price) || 0; p.cost = Number(v.cost) || 0; p.clock = v.clock.trim(); }
      else db.products.push({ id: uid(), name: v.name.trim(), pack_size: v.pack_size.trim(), price: Number(v.price) || 0, cost: Number(v.cost) || 0, clock: v.clock.trim(), kitchen: Math.max(0, Math.floor(Number(v.kitchen) || 0)), shops: {} });
      save(); closeModal(); render(); toast(v.id ? 'Product saved' : 'Product added'); mkHop();
    },
    'product-del-ask': function (b) { var p = product(b.getAttribute('data-id')); confirmDelete('"' + p.name + '"', 'product-del', p.id, 'Its stock numbers will be removed too. Old orders keep the name.'); },
    'product-del': function (b) { db.products = db.products.filter(function (p) { return p.id !== b.getAttribute('data-id'); }); save(); closeModal(); render(); toast('Product deleted'); },
    'packs-modal': function (b) { packsModal(b.getAttribute('data-id'), b.getAttribute('data-mode')); },
    'packs-save': function (b, f) {
      var v = vals(f), p = product(v.id), q = Math.floor(Number(v.qty) || 0); need(q > 0, 'Enter how many packs');
      if (v.mode === 'add') p.kitchen += q; else { need(q <= p.kitchen, 'Only ' + num(p.kitchen) + ' packs in kitchen'); p.kitchen -= q; }
      save(); closeModal(); render(); toast((v.mode === 'add' ? 'Added ' : 'Removed ') + q + ' packs');
    },
    'send-modal': function (b) { sendModal(b.getAttribute('data-id')); },
    'send-save': function (b, f) {
      var v = vals(f), p = product(v.id), s = shop(v.shop), q = Math.floor(Number(v.qty) || 0);
      need(s, 'Pick a shop'); need(q > 0, 'Enter how many packs'); need(q <= p.kitchen, 'Only ' + num(p.kitchen) + ' packs in kitchen');
      p.kitchen -= q; p.shops = p.shops || {}; p.shops[s.id] = shopPacks(p, s.id) + q;
      save(); closeModal(); render(); toast('Sent ' + q + ' packs to ' + s.name);
    },

    'material-modal': function (b) { materialModal(b.getAttribute('data-id')); },
    'material-save': function (b, f) {
      var v = vals(f); need(v.name.trim(), 'Please type a name');
      if (v.id) { var m = byId(db.materials, v.id); m.name = v.name.trim(); m.unit = v.unit; m.min = Number(v.min) || 0; }
      else db.materials.push({ id: uid(), name: v.name.trim(), unit: v.unit, min: Number(v.min) || 0, qty: Math.max(0, Number(v.qty) || 0) });
      save(); closeModal(); render(); toast(v.id ? 'Material saved' : 'Material added');
    },
    'material-del-ask': function (b) { var m = byId(db.materials, b.getAttribute('data-id')); confirmDelete('"' + m.name + '"', 'material-del', m.id); },
    'material-del': function (b) { db.materials = db.materials.filter(function (m) { return m.id !== b.getAttribute('data-id'); }); save(); closeModal(); render(); toast('Material deleted'); },
    'mat-qty-modal': function (b) { matQtyModal(b.getAttribute('data-id'), b.getAttribute('data-mode')); },
    'matqty-save': function (b, f) {
      var v = vals(f), m = byId(db.materials, v.id), q = Number(v.qty) || 0; need(q > 0, 'Enter an amount');
      if (v.mode === 'add') m.qty += q; else { need(q <= m.qty, 'Only ' + num(m.qty) + ' ' + m.unit + ' in stock'); m.qty -= q; }
      m.qty = Math.round(m.qty * 1000) / 1000;
      save(); closeModal(); render(); toast((v.mode === 'add' ? 'Added ' : 'Used ') + num(q) + ' ' + m.unit);
    },

    'shop-modal': function (b) { shopModal(b.getAttribute('data-id')); },
    'shop-save': function (b, f) {
      var v = vals(f); need(v.name.trim(), 'Please type a shop name');
      var data = { name: v.name.trim(), suburb: v.suburb.trim(), phone: v.phone.trim(), commission: Number(v.commission) || 0 };
      if (v.id) { var s = shop(v.id); Object.assign(s, data); } else { data.id = uid(); db.shops.push(data); }
      save(); closeModal(); render(); toast(v.id ? 'Shop saved' : 'Shop added');
    },
    'shop-del-ask': function (b) { var s = shop(b.getAttribute('data-id')); confirmDelete('"' + s.name + '"', 'shop-del', s.id, 'Packs still at this shop go back to kitchen stock.'); },
    'shop-del': function (b) {
      var id = b.getAttribute('data-id');
      db.products.forEach(function (p) { if (p.shops && p.shops[id]) { p.kitchen += p.shops[id]; delete p.shops[id]; } });
      db.shops = db.shops.filter(function (s) { return s.id !== id; });
      save(); closeModal(); render(); toast('Shop deleted');
    },
    'sold-modal': function (b) { soldModal(b.getAttribute('data-shop'), b.getAttribute('data-id')); },
    'sold-save': function (b, f) {
      var v = vals(f), s = shop(v.shop), p = product(v.id), q = Math.floor(Number(v.qty) || 0), have = shopPacks(p, s.id);
      need(q > 0, 'Enter packs sold'); need(q <= have, 'Only ' + num(have) + ' packs at this shop');
      p.shops[s.id] = have - q; if (p.shops[s.id] === 0) delete p.shops[s.id];
      var price = Number(v.price) || 0;
      var d = v.date || today();
      db.sales.push({ id: uid(), date: d, sale_month: ym(d), shop_id: s.id, shop_name: s.name, product_id: p.id, product_name: p.name, qty: q, amount: Math.round(price * q * 100) / 100 });
      save(); closeModal(); render(); toast('Sale saved');
    },
    'sale-del-ask': function (b) { confirmDelete('this sale', 'sale-del', b.getAttribute('data-id'), 'The packs go back to the shop count.'); },
    'sale-del': function (b) {
      var id = b.getAttribute('data-id'), x = byId(db.sales, id); if (!x) return;
      var p = product(x.product_id), s = shop(x.shop_id);
      if (p && s) { p.shops = p.shops || {}; p.shops[s.id] = shopPacks(p, s.id) + x.qty; }
      db.sales = db.sales.filter(function (y) { return y.id !== id; });
      save(); closeModal(); render(); toast('Sale deleted');
    },
    'back-modal': function (b) { backModal(b.getAttribute('data-shop'), b.getAttribute('data-id')); },
    'back-save': function (b, f) {
      var v = vals(f), s = shop(v.shop), p = product(v.id), q = Math.floor(Number(v.qty) || 0), have = shopPacks(p, s.id);
      need(q > 0, 'Enter packs'); need(q <= have, 'Only ' + num(have) + ' packs at this shop');
      p.shops[s.id] = have - q; if (p.shops[s.id] === 0) delete p.shops[s.id];
      if (v.to_kitchen) p.kitchen += q;
      save(); closeModal(); render(); toast(v.to_kitchen ? q + ' packs back in kitchen' : q + ' packs thrown away');
    },

    'order-modal': function () { if (!db.products.length) { toast('Add a product first', true); return; } orderModal(); },
    'item-add': function () { var l = document.getElementById('items'); if (l) { l.insertAdjacentHTML('beforeend', orderItemRow()); updateOrderTotal(); } },
    'item-remove': function (b) { var rows = document.querySelectorAll('.order-item'); if (rows.length > 1) b.closest('.order-item').remove(); updateOrderTotal(); },
    'paid-toggle': function (b) { var box = document.getElementById('paid-when'); if (box) box.classList.toggle('hidden', !b.checked); },
    'order-time': function (b) { timeModal(b.getAttribute('data-id')); },
    'time-save': function (b, f) {
      var v = vals(f), o = byId(db.orders, v.id); if (!o) return;
      o.date = v.date || o.date; o.time = v.time || '';
      save(); closeModal(); render(); toast(v.time ? 'Pickup ' + fmtTime(v.time) : 'Pickup time cleared');
    },
    'order-save': function (b, f) {
      var v = vals(f); need(v.customer.trim(), 'Please type the customer name');
      var items = [], needMap = {};
      f.querySelectorAll('.order-item').forEach(function (r) {
        var pid = r.querySelector('select').value, q = Math.floor(Number(r.querySelector('input').value) || 0);
        if (q <= 0) return; needMap[pid] = (needMap[pid] || 0) + q;
        var ex = items.filter(function (i) { return i.product_id === pid; })[0];
        if (ex) ex.qty += q; else { var p = product(pid); items.push({ product_id: pid, name: p.name, qty: q, price: p.price }); }
      });
      need(items.length, 'Add at least one item');
      Object.keys(needMap).forEach(function (pid) { var p = product(pid); need(needMap[pid] <= p.kitchen, 'Not enough ' + p.name + ' in kitchen (' + num(p.kitchen) + ' left)'); });
      items.forEach(function (i) { product(i.product_id).kitchen -= i.qty; });
      var total = items.reduce(function (a, i) { return a + i.price * i.qty; }, 0);
      var ref = 'ORD-' + String(db.seq.order++).padStart(3, '0');
      var d = v.date || today();
      db.orders.push({ id: uid(), ref: ref, customer: v.customer.trim(), phone: v.phone.trim(), suburb: v.suburb.trim(), date: d, items: items, packs: items.reduce(function (a, i) { return a + i.qty; }, 0), total: Math.round(total * 100) / 100, time: v.time || '', paid: !!v.paid, paid_month: v.paid ? ym(d) : '', pay: v.paid ? (v.pay || 'Paid') : '', status: 'open', note: v.note.trim(), created: new Date().toISOString() });
      ui.orderFilter = 'open';
      save(); closeModal(); render(); toast('Order ' + ref + ' saved'); mkHop('Order saved.');
    },
    'paid-modal': function (b) { paidModal(b.getAttribute('data-id')); },
    'paid-save': function (b, f) {
      var v = vals(f), o = byId(db.orders, v.id); if (!o) return;
      o.paid = true; o.pay = v.pay;
      /* the day the money actually arrived, not the day the order was placed */
      o.paid_month = o.paid_month || today().slice(0, 7);
      o.paid_on = o.paid_on || today();
      save(); closeModal(); render(); toast('Marked as paid');
    },
    'fin-month': function (b) { ui.finMonth = b.getAttribute('data-ym'); render(); },
    'fin-settings': function () { finSettingsModal(); },
    'fin-settings-save': function (b, f) {
      var v = vals(f);
      db.settings = db.settings || emptySettings();
      db.settings.rent = Math.max(0, Number(v.rent) || 0);
      save(); closeModal(); render(); toast('Monthly costs saved');
    },
    'fin-csv': function () { downloadCsv(); },
    'goto-shops': function () { go('shops'); },
    'goto-materials': function () { go('materials'); },
    'order-deliver': function (b) {
      var o = byId(db.orders, b.getAttribute('data-id')); if (!o) return;
      /* an order may never leave the kitchen unpaid */
      if (!o.paid) { toast('Mark as paid first', true); return; }
      o.status = 'delivered'; save(); render(); toast('Marked as delivered');
    },
    'order-del-ask': function (b) { var o = byId(db.orders, b.getAttribute('data-id')); confirmDelete('order ' + o.ref, 'order-del', o.id, o.status === 'delivered' ? 'The order will be removed from the list.' : 'Packs go back to kitchen stock.'); },
    'order-del': function (b) {
      var id = b.getAttribute('data-id'), o = byId(db.orders, id); if (!o) return;
      if (o.status !== 'delivered') o.items.forEach(function (i) { var p = product(i.product_id); if (p) p.kitchen += i.qty; });
      db.orders = db.orders.filter(function (x) { return x.id !== id; });
      save(); closeModal(); render(); toast('Order deleted'); mkWiggle();
    }
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    if (b.classList.contains('scrim') && e.target !== b) return;
    var act = b.getAttribute('data-act'); if (!ACT[act]) return;
    if (b.type === 'submit') { e.preventDefault(); }
    var f = b.closest('form');
    try { ACT[act](b, f); } catch (err) { if (err.message !== 'stop') console.error(err); }
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = e.target.querySelector('button[type="submit"][data-act]'); if (!btn) return;
    try { ACT[btn.getAttribute('data-act')](btn, e.target); } catch (err) { if (err.message !== 'stop') console.error(err); }
  });
  document.addEventListener('input', function (e) {
    if (e.target.closest('#f-order')) updateOrderTotal();
    if (e.target.matches && e.target.matches('#f-login input[name=pin]')) cloud.pinDraft = e.target.value;
  });
  document.addEventListener('change', function (e) { if (e.target.closest('#f-order')) updateOrderTotal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('hashchange', function () { closeModal(); render(true); window.scrollTo(0, 0); });
  // a soft glow that follows the pointer across buttons
  if (CAN_ANIM) document.addEventListener('mousemove', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.btn') : null;
    if (!b) return;
    var r = b.getBoundingClientRect();
    b.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    b.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  render();
  bootMascot();
  bootCloud();
  if (!route() && mk && !mkGreeted) { mkGreeted = true; setTimeout(function () { mk.say('Hi! Hungry?', 2400); }, 1500); }
})();
