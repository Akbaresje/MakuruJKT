/* =========================================================
   makuru. — storefront + order monitoring
   Vanilla JS, no build step. Data persists in localStorage.
   ========================================================= */
(function () {
  'use strict';

  var IMG = window.__IMG || {};
  var DAY = 86400000;

  /* ---------------------------------------------------------
     i18n
  --------------------------------------------------------- */
  var I18N = {
    id: {
      announce: 'Open PO Batch 12 — tutup <b>Kamis, 12 Nov 18:00 AEDT</b>',
      announce2: 'Ambil di 4 stokis di Australia',
      announceCta: 'Pesan sekarang',
      logoSub: 'dimsum',
      navMenu: 'Katalog', navStory: 'Cerita', navLoc: 'Lokasi', navTesti: 'Testimoni',
      cart: 'Keranjang', ctaOrder: 'Pesan Sekarang',
      heroLive: 'Open PO', heroBatch: 'Batch 12 · pengambilan 20–22 Nov',
      heroH1a: 'Hangat, Lembut,', heroH1b: 'Penuh Rasa.',
      heroSub: 'Dimsum kukus & goreng artisanal dengan chili oil racikan istimewa. Dibuat batch kecil di Sydney, lalu diantar ke stokis pilihanmu di seluruh Australia.',
      heroCta1: 'Lihat Menu', heroCta2: 'Cara Open PO',
      heroReviews: 'dari 320+ ulasan · 100% halal · dibuat batch kecil',
      sticker: 'Terbatas<br>120 pack', freshBadge: 'Dikukus fresh', batchCloses: 'Batch 12 ditutup dalam',
      strip1t: '100% Halal', strip1s: 'Daging segar pilihan',
      strip2t: 'PO tiap 2 minggu', strip2s: 'Batch kecil, selalu fresh',
      strip3t: '4 stokis di Australia', strip3s: 'Sydney · Melbourne · Brisbane · Perth',
      strip4t: 'Frozen pack tahan 30 hari', strip4s: 'Kukus sendiri di rumah',
      valKicker: 'Kenapa makuru.', valTitle1: 'Dibuat pelan,', valTitle2: 'disajikan hangat.',
      valSub: 'Tiga hal yang nggak pernah kami kompromikan — dari dapur kami di Sydney sampai ke tanganmu.',
      val1t: '100% Halal & daging segar', val1s: 'Ayam & udang dari supplier halal tersertifikasi, digiling sendiri setiap batch. Tanpa pengawet, tanpa MSG tambahan.',
      val2t: 'Chili oil racikan makuru.', val2s: 'Cabai kering, bawang, dan rempah disangrai manual. Pedasnya hangat, bukan menusuk — cocok jadi cocolan apa saja.',
      val3t: 'Dikukus segar setiap batch', val3s: 'Kami kukus di hari pengiriman, lalu langsung diantar ke stokis. Frozen pack disiapkan dengan blast-freezer.',
      menuKicker: 'Katalog Batch 12', menuTitle1: 'Pilih', menuTitle2: 'kukusanmu.',
      menuSub: 'Harga dalam AUD. Order sebelum PO tutup, ambil di stokis terdekat pada 20–22 November.',
      menuNote: 'Minimum order 2 pack per pengambilan. Gratis chili oil 50ml untuk order di atas A$60.',
      menuNoteLink: 'Lihat jadwal PO',
      poKicker: 'Cara Open PO', poTitle1: 'Satu batch,', poTitle2: 'tiga langkah.',
      poSub: 'Kami tidak menyimpan stok di gudang. Semua dimasak setelah PO tutup, jadi yang kamu terima selalu baru.',
      step1t: 'Pilih menu & bayar', step1s: 'Checkout di web ini, transfer bank atau bayar di tempat. Order otomatis masuk ke dashboard kami dan diverifikasi maksimal 12 jam.',
      step2t: 'Kami produksi 16–18 Nov', step2s: 'Belanja bahan, giling, lipat, kukus, lalu blast-freeze untuk frozen pack. Ada update status di WhatsApp untuk setiap perubahan.',
      step3t: 'Ambil di stokis 20–22 Nov', step3s: 'Tunjukkan kode order (contoh MK-1213). Stokis sudah menerima daftar nama — tinggal ambil dan kukus 8 menit di rumah.',
      batchOpen: 'PO sedang buka', batchTitle: 'Batch 12 · Edisi Akhir Tahun', batchSub: 'Kapasitas 120 pack · dibuat di Sydney',
      cdDays: 'Hari', cdHours: 'Jam', cdMins: 'Menit', cdSecs: 'Detik', batchSold: 'Terjual',
      d1: 'PO tutup', d2: 'Produksi', d3: 'Pengambilan', batchCta: 'Pesan di batch ini',
      locKicker: 'Stokis', locTitle1: 'Ambil di', locTitle2: 'stokis terdekat.',
      locSub: 'Empat partner toko di Australia. Pilih satu saat checkout — pesananmu dikirim ke toko itu saja.',
      locBadge: '20–22 Nov · 4 kota',
      testiKicker: 'Kata mereka', testiTitle1: 'Sudah', testiTitle2: 'kukus dulu?',
      ctaTitle1: 'Batch 12 tinggal', ctaSub: 'Setelah PO tutup, batch berikutnya baru dibuka awal Desember. Amankan porsimu sekarang.', ctaSeeMenu: 'Lihat Menu',
      footAbout: 'Dimsum artisanal batch kecil. Dibuat dengan tangan di Sydney, dikirim ke stokis pilihan di seluruh Australia.',
      footMenu: 'Menu', footPo: 'Cara Open PO', footInfo: 'Info', footShip: 'Pengiriman & pengambilan',
      footFaq: 'FAQ halal & bahan', footDash: 'Dashboard monitoring', footWholesale: 'Kerja sama stokis',
      footContact: 'Kontak', footHours: 'Sen–Sab · 09:00–18:00 AEDT', footRights: 'Dibuat di Sydney, Australia',
      dashOps: 'Order Monitoring', dvOverview: 'Ringkasan', dvOrders: 'Pesanan', dvBatch: 'Batch PO', dvOutlets: 'Stokis', dvSettings: 'Pengaturan',
      storeName: 'Dapur makuru.', storeAddr: 'Alexandria, Sydney NSW<br>ABN 42 118 903 551', backStore: '← Kembali ke toko',
      searchPh: 'Cari pesanan / nama / telepon', export: 'Ekspor CSV', roleAdmin: 'Owner',
      liveNote: 'Tersambung ke toko.', liveNote2: 'Pesanan baru dari website masuk otomatis ke daftar ini.',
      chartTitle: 'Pendapatan 14 hari terakhir', chartSub: 'Total order masuk per hari, semua batch', legendRevenue: 'Pendapatan',
      pipelineTitle: 'Status pipeline', pipelineSub: 'Batch 12 · semua pesanan',
      fulfilRate: 'Order siap diambil / total', avgPrep: 'Rata-rata waktu proses',
      topProducts: 'Produk terlaris', topProductsSub: 'Batch 12 · by unit',
      outletLoad: 'Beban per stokis', outletLoadSub: 'Pack yang harus dikirim',
      activity: 'Aktivitas terbaru', activitySub: 'Realtime', seeAll: 'Lihat semua',
      thOrder: 'Order', thCustomer: 'Pelanggan', thItems: 'Item', thOutlet: 'Stokis', thStatus: 'Status', thPay: 'Bayar', thTotal: 'Total', thTime: 'Waktu',
      allOutlets: 'Semua stokis', allBatches: 'Semua batch', sortNew: 'Terbaru dulu', sortOld: 'Terlama dulu', sortHigh: 'Nilai terbesar',
      tableHint: 'Klik baris untuk detail & update status',
      allocTitle: 'Alokasi pengiriman batch 12', allocSub: 'Dihitung otomatis dari pesanan berstatus aktif',
      setBatch: 'Pengaturan batch aktif', setBatchSub: 'Mempengaruhi toko & countdown', setCap: 'Kapasitas batch (pack)',
      setClose: 'PO tutup (ISO)', setPhone: 'Nomor WhatsApp toko', save: 'Simpan',
      setData: 'Data demo', setDataSub: 'Data disimpan di browser (localStorage)',
      setDataHelp: 'Semua order tersimpan lokal di perangkat ini. Reset akan mengembalikan contoh data batch 10–12.',
      resetData: 'Reset ke data contoh',
      setNote: 'Untuk produksi, sambungkan ke Google Sheets / Supabase agar data tersinkron antar perangkat.',
      cartTitle: 'Kukusanmu', cartNote: 'Ini pre-order. Pesananmu diproduksi 16–18 Nov dan siap diambil 20–22 Nov.',
      subtotal: 'Subtotal', pickup: 'Pengambilan', free: 'Gratis di stokis', total: 'Total', checkout: 'Lanjut ke checkout',
      coTitle: 'Selesaikan pre-order', coSub: 'Batch 12 · pengambilan 20–22 Nov di stokis pilihanmu',
      dashCrumbsTail: 'monitoring pesanan & pengambilan',
      /* pills, cards, badges */
      catAll: 'Semua', catKukus: 'Dimsum Kukus', catGoreng: 'Dimsum Goreng', catFrozen: 'Frozen Pack', catChili: 'Chili Oil', catMinum: 'Minuman',
      add: 'Tambah', added: 'Masuk', best: 'Best Seller', spicy: 'Pedas', halalBadge: 'Halal', frozenBadge: 'Frozen', newBadge: 'Baru',
      fresh: 'Fresh', frozenType: 'Frozen', perPack: 'per pack', viewMenu: 'Lihat menu',
      cartEmptyT: 'Kukusanmu masih kosong nih.', cartEmptyB: 'Yuk pilih dimsum favoritmu — batch 12 cuma buka sampai 12 November.',
      cartEmptyCta: 'Mulai pilih dimsum',
      pickAt: 'Ambil di', openMaps: 'Buka map', selectOutlet: 'Pilih stokis',
      /* checkout */
      coName: 'Nama lengkap', coPhone: 'Nomor HP (WhatsApp)', coEmail: 'Email', coOutlet: 'Stokis pengambilan',
      coSlot: 'Jadwal pengambilan', coPay: 'Metode pembayaran', coNote: 'Catatan (opsional)', coNotePh: 'Contoh: tanpa chili oil, plastik terpisah…',
      payTransfer: 'Transfer bank', payCash: 'Bayar di tempat', coSubmit: 'Buat pre-order', coSummary: 'Ringkasan',
      coRequired: 'Wajib diisi', coInvalidPhone: 'Nomor terlalu pendek', coPickOutlet: 'Pilih satu stokis',
      coSuccessT: 'Pre-order masuk!', coSuccessB: 'Kami sudah terima pesananmu. Simpan kode order ini dan sebutkan saat ambil di stokis.',
      coWa: 'Konfirmasi via WhatsApp', coTrack: 'Lacak di dashboard', coClose: 'Tutup', coNew: 'Pesanan baru',
      /* statuses */
      stPending: 'Menunggu bayar', stPaid: 'Dibayar', stProduction: 'Produksi', stPacked: 'Dikemas', stReady: 'Siap diambil', stPicked: 'Sudah diambil', stCancelled: 'Dibatalkan',
      /* dashboard dynamic */
      kpiOrders: 'Pesanan masuk', kpiRevenue: 'Pendapatan', kpiReady: 'Siap diambil', kpiAov: 'Rata-rata order',
      vsBatch: 'vs batch lalu', fromOrders: 'dari {n} pesanan', perOrder: 'per pesanan', packUnit: 'pack',
      activeOrders: 'Pesanan aktif', needsAction: 'Perlu tindakan', noActivity: 'Belum ada aktivitas',
      orderDetail: 'Detail pesanan', itemsTitle: 'Item pesanan', customerTitle: 'Pelanggan', pickupTitle: 'Pengambilan',
      timelineTitle: 'Riwayat status', noteTitle: 'Catatan internal', saveNote: 'Simpan catatan',
      advance: 'Lanjut ke', cancelOrder: 'Batalkan pesanan', reOpen: 'Aktifkan lagi', chatCustomer: 'Chat pelanggan',
      pickTime: 'Jadwal', phone: 'Telepon', email: 'Email', outletLabel: 'Stokis', batchLabel: 'Batch',
      created: 'Dibuat', paymentLabel: 'Pembayaran', unpaid: 'Belum bayar', paidLbl: 'Lunas', codLbl: 'Bayar di tempat',
      noOrders: 'Tidak ada pesanan yang cocok dengan filter.', clearFilter: 'Reset filter',
      allStatuses: 'Semua status', showing: 'Menampilkan {a} dari {b} pesanan',
      toastAdded: '{name} masuk keranjang.', toastRemoved: '{name} dihapus dari keranjang.',
      toastStatus: 'Status {id} → {status}', toastNote: 'Catatan disimpan.', toastSettings: 'Pengaturan tersimpan.',
      toastReset: 'Data contoh dimuat ulang.', toastExport: 'CSV berhasil diunduh.', toastEmptyCart: 'Keranjang masih kosong.',
      toastOutlet: 'Stokis untuk pesanan {id}: {outlet}',
      toastNew: 'Pesanan baru: {id} · {name}', toastCopied: 'Kode order disalin.',
      capacity: 'Kapasitas', sold: 'Terjual', revenue: 'Pendapatan', ordersN: 'pesanan', packsN: 'pack',
      batchOpenBadge: 'Buka', batchClosedBadge: 'Tutup', batchDoneBadge: 'Selesai', active: 'Aktif', inactive: 'Nonaktif',
      pickupWindow: 'Jam ambil', viewOrders: 'Lihat pesanan', allocDate: 'Target kirim', destination: 'Tujuan',
      noBatchOrders: 'Belum ada pesanan di batch ini.', batchesTitle: 'Batch', batchProgress: 'Progres batch',
      storeStatus: 'Status toko', totalRevenue: 'Total nilai', activeSwitch: 'Toko aktif'
    },
    en: {
      announce: 'Batch 12 PO open — closes <b>Thu, 12 Nov 6:00pm AEDT</b>',
      announce2: 'Collect from 4 stockists across Australia',
      announceCta: 'Order now',
      logoSub: 'dimsum',
      navMenu: 'Menu', navStory: 'Story', navLoc: 'Stockists', navTesti: 'Reviews',
      cart: 'Cart', ctaOrder: 'Order Now',
      heroLive: 'PO Open', heroBatch: 'Batch 12 · pickup 20–22 Nov',
      heroH1a: 'Warm, Soft,', heroH1b: 'Full of Flavour.',
      heroSub: 'Artisanal steamed and pan-fried dim sum with our signature chili oil. Made in small batches in Sydney, delivered to your chosen stockist across Australia.',
      heroCta1: 'Browse Menu', heroCta2: 'How PO works',
      heroReviews: 'from 320+ reviews · 100% halal · small batch',
      sticker: 'Limited<br>120 packs', freshBadge: 'Freshly steamed', batchCloses: 'Batch 12 closes in',
      strip1t: '100% Halal', strip1s: 'Fresh cuts only',
      strip2t: 'PO every 2 weeks', strip2s: 'Small batch, always fresh',
      strip3t: '4 stockists in Australia', strip3s: 'Sydney · Melbourne · Brisbane · Perth',
      strip4t: 'Frozen packs keep 30 days', strip4s: 'Steam them at home',
      valKicker: 'Why makuru.', valTitle1: 'Made slowly,', valTitle2: 'served warm.',
      valSub: 'Three things we never compromise on — from our Sydney kitchen to your table.',
      val1t: '100% Halal & fresh cuts', val1s: 'Chicken and prawns from certified halal suppliers, minced in-house each batch. No preservatives, no added MSG.',
      val2t: 'House-made chili oil.', val2s: 'Dried chilies, garlic and spices toasted by hand. A gentle warmth instead of a sharp burn — perfect on everything.',
      val3t: 'Steamed fresh every batch', val3s: 'We steam on dispatch day and deliver straight to stockists. Frozen packs are blast-frozen for quality.',
      menuKicker: 'Batch 12 Catalogue', menuTitle1: 'Build your', menuTitle2: 'steamer box.',
      menuSub: 'Prices in AUD. Order before the PO closes, collect from your nearest stockist on 20–22 November.',
      menuNote: 'Minimum 2 packs per pickup. Free 50ml chili oil on orders over A$60.',
      menuNoteLink: 'See PO schedule',
      poKicker: 'How the PO works', poTitle1: 'One batch,', poTitle2: 'three steps.',
      poSub: 'We do not hold stock in a warehouse. Everything is cooked after the PO closes, so what you get is always new.',
      step1t: 'Pick & pay', step1s: 'Check out here, bank transfer or pay on pickup. Your order lands in our dashboard and is verified within 12 hours.',
      step2t: 'We produce 16–18 Nov', step2s: 'Sourcing, mincing, folding, steaming, then blast-freezing for frozen packs. Every status change is sent to you on WhatsApp.',
      step3t: 'Collect 20–22 Nov', step3s: 'Show your order code (e.g. MK-1213). The stockist already has your name — just collect and steam for 8 minutes at home.',
      batchOpen: 'PO is open', batchTitle: 'Batch 12 · End of Year Edition', batchSub: '120 pack capacity · made in Sydney',
      cdDays: 'Days', cdHours: 'Hours', cdMins: 'Mins', cdSecs: 'Secs', batchSold: 'Sold',
      d1: 'PO closes', d2: 'Production', d3: 'Pickup', batchCta: 'Order in this batch',
      locKicker: 'Stockists', locTitle1: 'Collect from a', locTitle2: 'stockist near you.',
      locSub: 'Four partner shops around Australia. Pick one at checkout — your order ships to that shop only.',
      locBadge: '20–22 Nov · 4 cities',
      testiKicker: 'Word of mouth', testiTitle1: 'Steamed', testiTitle2: 'it yet?',
      ctaTitle1: 'Batch 12 has', ctaSub: 'Once the PO closes, the next batch opens in early December. Secure your packs now.', ctaSeeMenu: 'See Menu',
      footAbout: 'Small-batch artisanal dim sum. Hand-made in Sydney, delivered to selected stockists across Australia.',
      footMenu: 'Menu', footPo: 'How PO works', footInfo: 'Info', footShip: 'Delivery & pickup',
      footFaq: 'Halal & ingredient FAQ', footDash: 'Order monitoring', footWholesale: 'Become a stockist',
      footContact: 'Contact', footHours: 'Mon–Sat · 9am–6pm AEDT', footRights: 'Made in Sydney, Australia',
      dashOps: 'Order Monitoring', dvOverview: 'Overview', dvOrders: 'Orders', dvBatch: 'PO Batches', dvOutlets: 'Stockists', dvSettings: 'Settings',
      storeName: 'makuru. kitchen', storeAddr: 'Alexandria, Sydney NSW<br>ABN 42 118 903 551', backStore: '← Back to store',
      searchPh: 'Search order / name / phone', export: 'Export CSV', roleAdmin: 'Owner',
      liveNote: 'Connected to store.', liveNote2: 'New website orders appear here automatically.',
      chartTitle: 'Revenue, last 14 days', chartSub: 'Daily order value, all batches', legendRevenue: 'Revenue',
      pipelineTitle: 'Status pipeline', pipelineSub: 'Batch 12 · all orders',
      fulfilRate: 'Ready / total orders', avgPrep: 'Average processing time',
      topProducts: 'Best sellers', topProductsSub: 'Batch 12 · by units',
      outletLoad: 'Load per stockist', outletLoadSub: 'Packs to deliver',
      activity: 'Recent activity', activitySub: 'Live', seeAll: 'See all',
      thOrder: 'Order', thCustomer: 'Customer', thItems: 'Items', thOutlet: 'Stockist', thStatus: 'Status', thPay: 'Payment', thTotal: 'Total', thTime: 'Time',
      allOutlets: 'All stockists', allBatches: 'All batches', sortNew: 'Newest first', sortOld: 'Oldest first', sortHigh: 'Highest value',
      tableHint: 'Click a row for details & status updates',
      allocTitle: 'Batch 12 delivery allocation', allocSub: 'Generated from active orders',
      setBatch: 'Active batch settings', setBatchSub: 'Affects storefront & countdown', setCap: 'Batch capacity (packs)',
      setClose: 'PO closes (ISO)', setPhone: 'Shop WhatsApp number', save: 'Save',
      setData: 'Demo data', setDataSub: 'Stored in this browser (localStorage)',
      setDataHelp: 'All orders live locally on this device. Reset restores sample data for batches 10–12.',
      resetData: 'Reset to sample data',
      setNote: 'For production, connect Google Sheets / Supabase so data syncs across devices.',
      cartTitle: 'Your steamer', cartNote: 'This is a pre-order. Made 16–18 Nov, ready to collect 20–22 Nov.',
      subtotal: 'Subtotal', pickup: 'Pickup', free: 'Free at stockist', total: 'Total', checkout: 'Continue to checkout',
      coTitle: 'Complete your pre-order', coSub: 'Batch 12 · pickup 20–22 Nov at your chosen stockist',
      dashCrumbsTail: 'order & pickup monitoring',
      catAll: 'All', catKukus: 'Steamed', catGoreng: 'Pan-fried', catFrozen: 'Frozen Packs', catChili: 'Chili Oil', catMinum: 'Drinks',
      add: 'Add', added: 'Added', best: 'Best Seller', spicy: 'Spicy', halalBadge: 'Halal', frozenBadge: 'Frozen', newBadge: 'New',
      fresh: 'Fresh', frozenType: 'Frozen', perPack: 'per pack', viewMenu: 'See menu',
      cartEmptyT: 'Your steamer is empty.', cartEmptyB: 'Pick your favourites — batch 12 is only open until 12 November.',
      cartEmptyCta: 'Browse dim sum',
      pickAt: 'Collect at', openMaps: 'Open map', selectOutlet: 'Choose stockist',
      coName: 'Full name', coPhone: 'Mobile (WhatsApp)', coEmail: 'Email', coOutlet: 'Pickup stockist',
      coSlot: 'Pickup window', coPay: 'Payment method', coNote: 'Notes (optional)', coNotePh: 'e.g. no chili oil, separate bags…',
      payTransfer: 'Bank transfer', payCash: 'Pay on pickup', coSubmit: 'Place pre-order', coSummary: 'Summary',
      coRequired: 'Required', coInvalidPhone: 'Number too short', coPickOutlet: 'Choose one stockist',
      coSuccessT: 'Pre-order received!', coSuccessB: 'We have your order. Keep this code and mention it when you collect at the stockist.',
      coWa: 'Confirm on WhatsApp', coTrack: 'Track in dashboard', coClose: 'Close', coNew: 'New order',
      stPending: 'Awaiting payment', stPaid: 'Paid', stProduction: 'In production', stPacked: 'Packed', stReady: 'Ready for pickup', stPicked: 'Collected', stCancelled: 'Cancelled',
      kpiOrders: 'Orders received', kpiRevenue: 'Revenue', kpiReady: 'Ready for pickup', kpiAov: 'Average order',
      vsBatch: 'vs last batch', fromOrders: 'of {n} orders', perOrder: 'per order', packUnit: 'packs',
      activeOrders: 'Active orders', needsAction: 'Needs action', noActivity: 'No activity yet',
      orderDetail: 'Order detail', itemsTitle: 'Order items', customerTitle: 'Customer', pickupTitle: 'Pickup',
      timelineTitle: 'Status history', noteTitle: 'Internal note', saveNote: 'Save note',
      advance: 'Move to', cancelOrder: 'Cancel order', reOpen: 'Re-activate', chatCustomer: 'Message customer',
      pickTime: 'Window', phone: 'Phone', email: 'Email', outletLabel: 'Stockist', batchLabel: 'Batch',
      created: 'Created', paymentLabel: 'Payment', unpaid: 'Unpaid', paidLbl: 'Paid', codLbl: 'Pay on pickup',
      noOrders: 'No orders match these filters.', clearFilter: 'Clear filters',
      allStatuses: 'All statuses', showing: 'Showing {a} of {b} orders',
      toastAdded: '{name} added to cart.', toastRemoved: '{name} removed from cart.',
      toastStatus: '{id} → {status}', toastNote: 'Note saved.', toastSettings: 'Settings saved.',
      toastReset: 'Sample data restored.', toastExport: 'CSV downloaded.', toastEmptyCart: 'Your cart is empty.',
      toastOutlet: '{id} is for {outlet}',
      toastNew: 'New order: {id} · {name}', toastCopied: 'Order code copied.',
      capacity: 'Capacity', sold: 'Sold', revenue: 'Revenue', ordersN: 'orders', packsN: 'packs',
      batchOpenBadge: 'Open', batchClosedBadge: 'Closed', batchDoneBadge: 'Completed', active: 'Active', inactive: 'Inactive',
      pickupWindow: 'Pickup hours', viewOrders: 'View orders', allocDate: 'Ship by', destination: 'Destination',
      noBatchOrders: 'No orders in this batch yet.', batchesTitle: 'Batches', batchProgress: 'Batch progress',
      storeStatus: 'Shop status', totalRevenue: 'Total value', activeSwitch: 'Shop active'
    }
  };

  var LANG = localStorage.getItem('makuru_lang') || 'id';
  function t(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N.id[k] || k; }
  function tr(k, vars) {
    var s = t(k);
    Object.keys(vars || {}).forEach(function (key) { s = s.replace('{' + key + '}', vars[key]); });
    return s;
  }

  /* ---------------------------------------------------------
     catalogue & ops data
  --------------------------------------------------------- */
  var PRODUCTS = [
    { sku: 'siomay', cat: 'kukus', price: 12.5, unit: 6, tags: ['best', 'halal'], img: 'siomay',
      name: { id: 'Siomay Ayam Udang', en: 'Chicken & Prawn Siomay' },
      desc: { id: 'Ayam & udang giling, wortel, kulit tipis. Favorit sepanjang masa.', en: 'Minced chicken & prawn, carrot, thin wrapper. The all-time favourite.' } },
    { sku: 'hargow', cat: 'kukus', price: 14, unit: 6, tags: ['halal', 'fresh'], img: 'hargow',
      name: { id: 'Har Gow Udang', en: 'Prawn Har Gow' },
      desc: { id: 'Udang utuh, kulit kristal kenyal, dikukus 7 menit.', en: 'Whole prawns in a bouncy crystal wrapper, steamed 7 minutes.' } },
    { sku: 'bao', cat: 'kukus', price: 11, unit: 3, tags: ['halal'], img: 'bao',
      name: { id: 'Char Siu Bao', en: 'Char Siu Bao' },
      desc: { id: 'Roti kukus lembut, isi char siu manis-gurih.', en: 'Pillowy steamed bun with sweet-savoury char siu filling.' } },
    { sku: 'gyoza', cat: 'goreng', price: 13.5, unit: 8, tags: ['best'], img: 'gyoza',
      name: { id: 'Gyoza Ayam Goreng', en: 'Crispy Chicken Gyoza' },
      desc: { id: 'Goreng crispy dengan skirt renyah, saus chili terpisah.', en: 'Pan-fried with a crispy lace skirt, chili sauce on the side.' } },
    { sku: 'wonton', cat: 'chili', price: 15.5, unit: 10, tags: ['spicy', 'best'], img: 'wonton',
      name: { id: 'Wonton Chili Oil', en: 'Chili Oil Wontons' },
      desc: { id: 'Wonton ayam berendam chili oil, taburan scallion.', en: 'Chicken wontons swimming in chili oil, scallion on top.' } },
    { sku: 'frozen', cat: 'frozen', price: 32, unit: 30, tags: ['frozen', 'halal'], img: 'frozen',
      name: { id: 'Frozen Mix Pack', en: 'Frozen Mix Pack' },
      desc: { id: 'Siomay, har gow, gyoza. Blast-frozen, tahan 30 hari.', en: 'Siomay, har gow, gyoza. Blast-frozen, keeps 30 days.' } },
    { sku: 'chilioil', cat: 'chili', price: 14, unit: 220, tags: ['new', 'spicy'], img: 'chilioil',
      name: { id: 'Chili Oil Jar', en: 'Chili Oil Jar' },
      desc: { id: '220ml. Bawang goreng, cabai kering, minyak canola.', en: '220ml. Fried garlic, dried chilies, canola oil.' } },
    { sku: 'drink', cat: 'minum', price: 6.5, unit: 400, tags: ['new'], img: 'drink',
      name: { id: 'Lychee Iced Tea', en: 'Lychee Iced Tea' },
      desc: { id: 'Teh hitam dingin, leci utuh, daun mint.', en: 'Iced black tea, whole lychee, mint leaf.' } }
  ];

  var CATS = [
    { key: 'all', label: 'catAll' }, { key: 'kukus', label: 'catKukus' }, { key: 'goreng', label: 'catGoreng' },
    { key: 'frozen', label: 'catFrozen' }, { key: 'chili', label: 'catChili' }, { key: 'minum', label: 'catMinum' }
  ];

  var OUTLETS = [
    { id: 'syd', code: 'SYD', city: 'Sydney', name: 'Dixon Street Kitchen', addr: '82 Dixon St, Haymarket NSW 2000',
      hours: 'Fri–Sun · 11:00–18:00', maps: 'https://maps.google.com/?q=82+Dixon+St+Haymarket+NSW', active: true },
    { id: 'mel', code: 'MEL', city: 'Melbourne', name: 'Footscray Provisions', addr: '14 Leeds St, Footscray VIC 3011',
      hours: 'Thu–Sat · 10:00–17:00', maps: 'https://maps.google.com/?q=14+Leeds+St+Footscray+VIC', active: true },
    { id: 'bne', code: 'BNE', city: 'Brisbane', name: 'West End Larder', addr: '55 Boundary St, West End QLD 4101',
      hours: 'Sat · 09:00–15:00', maps: 'https://maps.google.com/?q=55+Boundary+St+West+End+QLD', active: true },
    { id: 'per', code: 'PER', city: 'Perth', name: 'Northbridge Noodle Bar', addr: '21 William St, Northbridge WA 6003',
      hours: 'Fri–Sat · 11:00–19:00', maps: 'https://maps.google.com/?q=21+William+St+Northbridge+WA', active: true }
  ];

  var BATCHES = [
    { n: 12, title: 'Edisi Akhir Tahun', capacity: 120, closeAt: '2026-11-12T18:00:00+11:00', production: '16–18 Nov', delivery: '19 Nov', pickup: '20–22 Nov', state: 'open' },
    { n: 11, title: 'Edisi Spring', capacity: 140, closeAt: '2026-10-29T18:00:00+11:00', production: '2–4 Nov', delivery: '5 Nov', pickup: '6–8 Nov', state: 'closed' },
    { n: 10, title: 'Edisi Mid-Autumn', capacity: 120, closeAt: '2026-10-15T18:00:00+11:00', production: '19–21 Okt', delivery: '22 Okt', pickup: '23–25 Okt', state: 'done' }
  ];

  var STATUSES = [
    { key: 'pending', label: 'stPending', tone: 'gold', next: 'paid', icon: 'clock' },
    { key: 'paid', label: 'stPaid', tone: 'green', next: 'production', icon: 'card' },
    { key: 'production', label: 'stProduction', tone: 'red', next: 'packed', icon: 'flame' },
    { key: 'packed', label: 'stPacked', tone: 'ink', next: 'ready', icon: 'box' },
    { key: 'ready', label: 'stReady', tone: 'green', next: 'picked', icon: 'check' },
    { key: 'picked', label: 'stPicked', tone: 'muted', next: null, icon: 'check' },
    { key: 'cancelled', label: 'stCancelled', tone: 'muted', next: null, icon: 'x' }
  ];
  function statusMeta(k) {
    for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].key === k) return STATUSES[i];
    return STATUSES[0];
  }
  function nextStatuses(k) {
    if (k === 'cancelled') return ['pending'];
    var m = statusMeta(k);
    return m.next ? [m.next] : [];
  }

  var SLOTS = ['Fri, 20 Nov · 16:00–19:00', 'Sat, 21 Nov · 10:00–15:00', 'Sun, 22 Nov · 11:00–16:00'];
  var SLOTS_ID = ['Jum, 20 Nov · 16:00–19:00', 'Sab, 21 Nov · 10:00–15:00', 'Min, 22 Nov · 11:00–16:00'];
  function slotLabel(i) { return LANG === 'id' ? SLOTS_ID[i] : SLOTS[i]; }

  /* ---------------------------------------------------------
     storage
  --------------------------------------------------------- */
  var K_ORDER = 'makuru_orders_v2', K_CART = 'makuru_cart_v2', K_SET = 'makuru_settings_v2';
  var settings = load(K_SET, { capacity: 120, closeAt: BATCHES[0].closeAt, phone: '61412555018' });
  var orders = load(K_ORDER, null);
  var cart = load(K_CART, {});

  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function persist() {
    try {
      localStorage.setItem(K_ORDER, JSON.stringify(orders));
      localStorage.setItem(K_CART, JSON.stringify(cart));
      localStorage.setItem(K_SET, JSON.stringify(settings));
    } catch (e) { /* storage full / blocked — app still works in-memory */ }
  }

  /* ---------------------------------------------------------
     helpers
  --------------------------------------------------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function money(n) {
    return 'A$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function product(sku) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].sku === sku) return PRODUCTS[i];
    return null;
  }
  function pName(p) { return p.name[LANG] || p.name.id; }
  function pDesc(p) { return p.desc[LANG] || p.desc.id; }
  function outlet(id) {
    for (var i = 0; i < OUTLETS.length; i++) if (OUTLETS[i].id === id) return OUTLETS[i];
    return { id: id, code: '—', city: '—', name: '—', addr: '', hours: '', maps: '#' };
  }
  function batchOf(n) {
    for (var i = 0; i < BATCHES.length; i++) if (BATCHES[i].n === n) return BATCHES[i];
    return BATCHES[0];
  }
  function activeBatch() {
    var b = {};
    for (var k in BATCHES[0]) b[k] = BATCHES[0][k];
    b.capacity = Number(settings.capacity) || 120;
    b.closeAt = settings.closeAt;
    return b;
  }
  function dateFmt(iso, withTime) {
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    var opt = { day: 'numeric', month: 'short' };
    if (withTime) { opt.hour = '2-digit'; opt.minute = '2-digit'; opt.hour12 = false; }
    return d.toLocaleString(LANG === 'id' ? 'id-ID' : 'en-AU', opt);
  }
  function relTime(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return LANG === 'id' ? 'baru saja' : 'just now';
    var m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (LANG === 'id') return m < 60 ? m + ' menit lalu' : h < 24 ? h + ' jam lalu' : d + ' hari lalu';
    return m < 60 ? m + 'm ago' : h < 24 ? h + 'h ago' : d + 'd ago';
  }
  function sum(arr, fn) { return arr.reduce(function (a, b) { return a + (fn ? fn(b) : b); }, 0); }
  function cartCount() { return sum(Object.keys(cart), function (k) { return cart[k]; }); }
  function cartItems() {
    return Object.keys(cart).map(function (sku) { return { p: product(sku), qty: cart[sku] }; })
      .filter(function (x) { return x.p && x.qty > 0; });
  }
  function cartTotal() { return sum(cartItems(), function (x) { return x.p.price * x.qty; }); }
  function orderTotal(o) { return sum(o.items, function (i) { return i.price * i.qty; }); }
  function activeOrders(n) {
    return orders.filter(function (o) { return o.batch === n && o.status !== 'cancelled'; });
  }
  function soldPacks(n) { return sum(activeOrders(n), function (o) { return sum(o.items, function (i) { return i.qty; }); }); }

  /* icons */
  var ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1.5-.5-2.5-1-3 3 1 5 4 5 7a7 7 0 1 1-14 0c0-5 5-7 7-13Z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v8a3 3 0 0 1-1.5 2.6l-6 3.4a3 3 0 0 1-3 0l-6-3.4A3 3 0 0 1 3 16V8a3 3 0 0 1 1.5-2.6l6-3.4a3 3 0 0 1 3 0l6 3.4A3 3 0 0 1 21 8Z"/><path d="m3.5 7.5 8.5 5 8.5-5M12 22V12.5"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.6a3.4 3.4 0 0 1 0 6.4M17 20a6.5 6.5 0 0 0-2-4.7"/></svg>',
    dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 6.5c0-2-2.2-3-5-3s-5 1-5 3 2 2.6 5 3.2 5 1.1 5 3.3-2.2 3-5 3-5-1-5-3"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
    trendUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17 10 11l3.5 3.5L20 8"/><path d="M15 8h5v5"/></svg>',
    trendDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l6 6 3.5-3.5L20 16"/><path d="M15 16h5v-5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2m0 2a8 8 0 1 1-4.2 14.8l-.4-.2-2.5.7.7-2.4-.2-.4A8 8 0 0 1 12 4m-3.3 4c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2s.9 2.3 1 2.5c.1.2 1.7 2.8 4.3 3.8 2.1.8 2.6.7 3 .6.6-.1 1.6-.7 1.8-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.3-1.6-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.5-.8-2 0-.4-.2-.4-.4-.4z"/></svg>'
  };
  function statusIcon(k) { return ICONS[statusMeta(k).icon] || ICONS.clock; }

  /* ---------------------------------------------------------
     seed data
  --------------------------------------------------------- */
  function seed() {
    var seedRnd = 20261106;
    function rnd() { seedRnd = (seedRnd * 1103515245 + 12345) % 2147483648; return seedRnd / 2147483648; }
    function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

    var names = ['Ayu Puspita', 'Daniel Kim', 'Rina Marlina', 'Josh Tanner', 'Melissa Chen', 'Bagus Pratama',
      'Siti Rahma', 'Tom Whitfield', 'Vina Ong', 'Kevin Lau', 'Nadia Putri', 'Ethan Brooks',
      'Grace Lim', 'Fajar Nugroho', 'Chloe Nguyen', 'Hendra Wijaya', 'Sarah Mitchell', 'Yuki Tanaka'];
    var plan = [
      ['12', 'pending', 0], ['12', 'pending', 1], ['12', 'paid', 0], ['12', 'paid', 1], ['12', 'paid', 2],
      ['12', 'production', 1], ['12', 'production', 2], ['12', 'packed', 2], ['12', 'packed', 3],
      ['12', 'ready', 4], ['12', 'ready', 5], ['12', 'picked', 6],
      ['11', 'picked', 9], ['11', 'picked', 10], ['11', 'picked', 11], ['11', 'cancelled', 12],
      ['10', 'picked', 18], ['10', 'picked', 20], ['10', 'picked', 24]
    ];
    var out = [];
    var counters = { 12: 1200, 11: 1100, 10: 1000 };

    plan.forEach(function (row, idx) {
      var batch = Number(row[0]), status = row[1], daysAgo = row[2];
      counters[batch] += 1;
      var id = 'MK-' + counters[batch];
      var nItems = 1 + Math.floor(rnd() * 3);
      var pickedSkus = [];
      var items = [];
      for (var j = 0; j < nItems; j++) {
        var p = pick(PRODUCTS);
        if (pickedSkus.indexOf(p.sku) >= 0) { j--; continue; }
        pickedSkus.push(p.sku);
        var baseQty = batch === 12 ? 2 : 1;
        items.push({ sku: p.sku, qty: baseQty + Math.floor(rnd() * 2), price: p.price });
      }
      var base = new Date();
      base.setHours(0, 0, 0, 0);
      base.setDate(base.getDate() - daysAgo);
      base.setSeconds(Math.floor(rnd() * 50), 0);
      base.setMinutes(Math.floor(rnd() * 59));
      base.setHours(9 + Math.floor(rnd() * 8));
      var nowMs = Date.now();
      if (base.getTime() > nowMs - 25 * 60000) base = new Date(nowMs - (25 + Math.floor(rnd() * 240)) * 60000);
      var createdAt = base;
      var outletId = OUTLETS[idx % OUTLETS.length].id;
      var total = sum(items, function (i) { return i.price * i.qty; });
      var timeline = [];
      var chain = ['pending', 'paid', 'production', 'packed', 'ready', 'picked'];
      var upto = status === 'cancelled' ? 1 : chain.indexOf(status) + 1;
      for (var s = 0; s < upto; s++) {
        timeline.push({ s: chain[s], at: new Date(createdAt.getTime() + s * 3600000 * (4 + rnd() * 8)).toISOString() });
      }
      out.push({
        id: id, createdAt: createdAt.toISOString(), batch: batch,
        customer: {
          name: names[idx % names.length],
          phone: '+61 4' + (10 + idx) + ' ' + (200 + idx) + ' ' + (300 + idx),
          email: names[idx % names.length].toLowerCase().replace(/[^a-z]/g, '.') + '@mail.com'
        },
        items: items, total: total, outlet: outletId,
        slot: Math.floor(rnd() * 3), payment: idx % 3 === 0 ? 'cash' : 'transfer',
        status: status, note: '', timeline: timeline, source: 'seed'
      });
    });
    return out;
  }

  /* ---------------------------------------------------------
     storefront render
  --------------------------------------------------------- */
  var state = { cat: 'all', q: '', status: 'all', outlet: 'all', batch: 'all', sort: 'new', view: 'overview', activeOrder: null };

  function applyStaticI18n() {
    $$('[data-i18n]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    $$('[data-lang]').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-lang') === LANG); });
    document.documentElement.lang = LANG;
  }

  function renderFilters() {
    var host = $('#filters');
    if (!host) return;
    host.innerHTML = CATS.map(function (c) {
      return '<button class="pill' + (state.cat === c.key ? ' is-active' : '') + '" data-cat="' + c.key + '">' + t(c.label) + '</button>';
    }).join('');
  }

  function badgeHtml(tag) {
    if (tag === 'best') return '<span class="badge badge--gold">' + t('best') + '</span>';
    if (tag === 'spicy') return '<span class="badge badge--gold">' + t('spicy') + '</span>';
    if (tag === 'halal') return '<span class="badge badge--green">' + t('halalBadge') + '</span>';
    if (tag === 'frozen') return '<span class="badge badge--green">' + t('frozenBadge') + '</span>';
    if (tag === 'new') return '<span class="badge badge--soft">' + t('newBadge') + '</span>';
    return '';
  }

  function renderMenu() {
    var host = $('#menuGrid');
    if (!host) return;
    var list = PRODUCTS.filter(function (p) { return state.cat === 'all' || p.cat === state.cat; });
    if (!list.length) { host.innerHTML = ''; return; }
    host.innerHTML = list.map(function (p, i) {
      var added = cart[p.sku] > 0;
      var isLiquid = p.cat === 'chili' || p.cat === 'minum';
      var unitLabel = isLiquid ? (p.unit + ' ml') : (p.unit + ' pcs');
      var typeLabel = p.cat === 'frozen' ? t('frozenType') : isLiquid ? (p.cat === 'chili' ? t('catChili') : t('catMinum')) : t('fresh');
      return '' +
        '<article class="card reveal" style="transition-delay:' + (i % 4) * 40 + 'ms">' +
          '<div class="card-media">' +
            '<img src="' + (IMG[p.img] || '') + '" alt="' + esc(pName(p)) + '" loading="lazy">' +
            '<div class="card-badges">' + p.tags.map(badgeHtml).join('') + '</div>' +
            '<button class="card-fav" aria-label="Favorit">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.6 12 20 12 20Z"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-title"><h3>' + esc(pName(p)) + '</h3></div>' +
            '<p class="card-desc">' + esc(pDesc(p)) + '</p>' +
            '<div class="card-meta"><span>' + esc(unitLabel) + '</span><i></i><span>' + esc(typeLabel) + '</span><i></i><span>' + t('perPack') + '</span></div>' +
            '<div class="card-foot">' +
              '<div class="price">' + money(p.price) + '<small>' + esc(p.unit + (p.cat === 'chili' || p.cat === 'minum' ? ' ml' : ' pcs')) + '</small></div>' +
              '<button class="add-btn' + (added ? ' is-added' : '') + '" data-add="' + p.sku + '">' +
                (added ? ICONS.check + '<span>' + t('added') + '</span>' : ICONS.plus + '<span>' + t('add') + '</span>') +
              '</button>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');
    observeReveal();
  }

  function mapSvg(code) {
    return '<svg viewBox="0 0 240 92" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="240" height="92" fill="#F3EBDD"/>' +
      '<path d="M0 62h240M0 26h240M56 0v92M132 0v92M198 0v92" stroke="rgba(36,30,30,.07)" stroke-width="1"/>' +
      '<path d="M0 74c28-10 44 4 70-2s38-20 66-14 46 16 74 6 20-10 30-8" stroke="#DDA15E" stroke-width="2.4" fill="none" opacity=".65"/>' +
      '<path d="M0 30c34 8 52-8 82-2s48 14 74 4 48-12 84-4" stroke="#9E2A2B" stroke-width="2" fill="none" opacity=".28"/>' +
      '</svg>';
  }

  function renderStockists() {
    var host = $('#stockistGrid');
    if (!host) return;
    host.innerHTML = OUTLETS.map(function (o) {
      return '' +
        '<article class="stockist reveal">' +
          '<div class="stockist-map">' + mapSvg(o.code) +
            '<span class="city">' + esc(o.city) + '</span>' +
            '<span class="pin">' + ICONS.pin + '</span>' +
          '</div>' +
          '<div class="stockist-body">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
              '<h3>' + esc(o.name) + '</h3>' +
              '<span class="badge badge--green" style="font-size:9px">' + t('active') + '</span>' +
            '</div>' +
            '<p class="stockist-addr">' + esc(o.addr) + '</p>' +
            '<div class="stockist-row">' + ICONS.clock + '<span>' + esc(o.hours) + '</span></div>' +
            '<div class="stockist-row">' + ICONS.pin + '<span>' + t('locBadge') + '</span></div>' +
            '<div class="stockist-foot">' +
              '<a class="btn btn--ghost btn--sm" href="' + esc(o.maps) + '" target="_blank" rel="noopener">' + t('openMaps') + '</a>' +
              '<button class="link-arrow" data-pick-outlet="' + o.id + '" style="font-size:11px">' + t('selectOutlet') + ICONS.arrow + '</button>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');
    observeReveal();
  }

  /* ---------------------------------------------------------
     cart
  --------------------------------------------------------- */
  function updateCartBadge(pop) {
    var el = $('#cartCount');
    if (!el) return;
    el.textContent = cartCount();
    if (pop) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }

  function renderCart() {
    var body = $('#cartBody'), foot = $('#cartFoot');
    if (!body) return;
    var items = cartItems();
    $('#cartHeadCount').textContent = items.length ? cartCount() + ' item' : '0';
    if (!items.length) {
      body.innerHTML = '<div class="empty-state">' +
        '<div class="es-icon">' + ICONS.bag + '</div>' +
        '<h4>' + t('cartEmptyT') + '</h4>' +
        '<p>' + t('cartEmptyB') + '</p>' +
        '<button class="btn btn--primary btn--sm" id="emptyCartCta" style="margin-top:8px">' + t('cartEmptyCta') + '</button>' +
        '</div>';
      foot.style.display = 'none';
      return;
    }
    foot.style.display = '';
    body.innerHTML = items.map(function (x) {
      return '<div class="cart-line">' +
        '<img src="' + (IMG[x.p.img] || '') + '" alt="' + esc(pName(x.p)) + '">' +
        '<div>' +
          '<h4>' + esc(pName(x.p)) + '</h4>' +
          '<div class="cl-price">' + money(x.p.price) + ' · ' + x.p.unit + (x.p.cat === 'chili' || x.p.cat === 'minum' ? ' ml' : ' pcs') + '</div>' +
          '<div class="qty">' +
            '<button data-qty="dec" data-sku="' + x.p.sku + '" aria-label="Kurangi">' + ICONS.minus + '</button>' +
            '<b>' + x.qty + '</b>' +
            '<button data-qty="inc" data-sku="' + x.p.sku + '" aria-label="Tambah">' + ICONS.plus + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="cl-right">' +
          '<span class="cl-total">' + money(x.p.price * x.qty) + '</span>' +
          '<button class="cl-remove" data-remove="' + x.p.sku + '">Hapus</button>' +
        '</div>' +
      '</div>';
    }).join('');
    $('#cartSubtotal').textContent = money(cartTotal());
    $('#cartTotal').textContent = money(cartTotal());
  }

  function addToCart(sku, silent) {
    cart[sku] = (cart[sku] || 0) + 1;
    persist(); updateCartBadge(true); renderMenu(); renderCart();
    var p = product(sku);
    if (!silent && p) toast(tr('toastAdded', { name: pName(p) }));
  }
  function changeQty(sku, delta) {
    cart[sku] = (cart[sku] || 0) + delta;
    if (cart[sku] <= 0) delete cart[sku];
    persist(); updateCartBadge(false); renderMenu(); renderCart();
  }

  /* ---------------------------------------------------------
     checkout
  --------------------------------------------------------- */
  var coState = { outlet: '', slot: 0, payment: 'transfer', errors: {} };

  function openCheckout() {
    if (!cartItems().length) { toast(t('toastEmptyCart')); return; }
    coState.outlet = coState.outlet || (OUTLETS[0] && OUTLETS[0].id);
    coState.errors = {};
    renderCheckout();
    closeCart();
    $('#checkoutModal').classList.add('is-open');
    document.body.classList.add('locked');
  }

  function renderCheckout() {
    var items = cartItems();
    var host = $('#checkoutBody');
    host.innerHTML =
      '<form id="coForm" novalidate>' +
        '<div class="field-row">' +
          '<div class="field" data-field="name"><label>' + t('coName') + '</label><input name="name" autocomplete="name" placeholder="Akbar Satrio"><span class="err">' + t('coRequired') + '</span></div>' +
          '<div class="field" data-field="phone"><label>' + t('coPhone') + '</label><input name="phone" inputmode="tel" autocomplete="tel" placeholder="0412 555 018"><span class="err">' + t('coInvalidPhone') + '</span></div>' +
        '</div>' +
        '<div class="field"><label>' + t('coEmail') + '</label><input name="email" type="email" autocomplete="email" placeholder="kamu@email.com"></div>' +
        '<div class="field"><label>' + t('coOutlet') + '</label>' +
          '<div class="pick-grid" id="outletPicker">' + OUTLETS.map(function (o) {
            return '<button type="button" class="pick' + (coState.outlet === o.id ? ' is-active' : '') + '" data-co-outlet="' + o.id + '">' +
              '<b>' + esc(o.name) + '</b><small>' + esc(o.city) + ' · ' + esc(o.addr) + '</small></button>';
          }).join('') + '</div>' +
          '<span class="err" id="outletErr" style="display:none">' + t('coPickOutlet') + '</span>' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field"><label>' + t('coSlot') + '</label><select name="slot">' +
            SLOTS.map(function (s, i) { return '<option value="' + i + '">' + slotLabel(i) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>' + t('coPay') + '</label><select name="payment">' +
            '<option value="transfer">' + t('payTransfer') + '</option><option value="cash">' + t('payCash') + '</option>' +
          '</select></div>' +
        '</div>' +
        '<div class="field"><label>' + t('coNote') + '</label><textarea name="note" placeholder="' + esc(t('coNotePh')) + '"></textarea></div>' +
        '<div class="summary-box">' +
          '<div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:800;margin-bottom:2px">' + t('coSummary') + '</div>' +
          items.map(function (x) {
            return '<div class="sb-line"><span>' + x.qty + '× ' + esc(pName(x.p)) + '</span><b>' + money(x.p.price * x.qty) + '</b></div>';
          }).join('') +
          '<div class="sb-line" style="border-top:1px dashed var(--border);padding-top:8px"><span>' + t('total') + '</span><b style="font-size:15px">' + money(cartTotal()) + '</b></div>' +
        '</div>' +
        '<button class="btn btn--primary btn--block" type="submit" style="margin-top:2px">' + t('coSubmit') + ' · ' + money(cartTotal()) + '</button>' +
        '<p style="font-size:10.5px;color:var(--muted);text-align:center">' + t('cartNote') + '</p>' +
      '</form>';
  }

  function submitCheckout(e) {
    e.preventDefault();
    var form = e.target;
    var f = form.elements;
    var name = f.name.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim();
    var ok = true;
    $$('.field.has-error', form).forEach(function (f) { f.classList.remove('has-error'); });
    if (name.length < 2) { $('[data-field="name"]', form).classList.add('has-error'); ok = false; }
    if (phone.replace(/\D/g, '').length < 6) { $('[data-field="phone"]', form).classList.add('has-error'); ok = false; }
    if (!coState.outlet) { $('#outletErr').style.display = 'block'; ok = false; }
    if (!ok) return;

    var seq = 1200;
    orders.forEach(function (o) {
      var m = /^MK-(\d+)$/.exec(o.id);
      if (m) seq = Math.max(seq, Number(m[1]));
    });
    var items = cartItems().map(function (x) { return { sku: x.p.sku, qty: x.qty, price: x.p.price }; });
    var order = {
      id: 'MK-' + (seq + 1),
      createdAt: new Date().toISOString(),
      batch: 12,
      customer: { name: name, phone: phone, email: email },
      items: items,
      total: cartTotal(),
      outlet: coState.outlet,
      slot: Number(f.slot.value) || 0,
      payment: f.payment.value,
      note: f.note.value.trim(),
      status: 'pending',
      timeline: [{ s: 'pending', at: new Date().toISOString() }],
      source: 'web'
    };
    orders.unshift(order);
    cart = {};
    persist();
    updateCartBadge(false); renderMenu(); renderCart();
    renderDashboard();
    toast(tr('toastNew', { id: order.id, name: order.customer.name }));
    showSuccess(order);
  }

  function showSuccess(o) {
    var body = $('#checkoutBody');
    var waText = encodeURIComponent(
      'Halo makuru., saya ' + o.customer.name + ' mau konfirmasi pre-order ' + o.id +
      ' (' + money(o.total) + ') untuk pengambilan di ' + outlet(o.outlet).name + ', ' + outlet(o.outlet).city + '.'
    );
    body.innerHTML = '<div class="success">' +
      '<div class="success-icon">' + ICONS.check + '</div>' +
      '<h3>' + t('coSuccessT') + '</h3>' +
      '<p>' + t('coSuccessB') + '</p>' +
      '<div class="order-code">' + o.id + '</div>' +
      '<div class="summary-box" style="width:100%;text-align:left;margin-top:4px">' +
        '<div class="sb-line"><span>' + t('pickAt') + '</span><b>' + esc(outlet(o.outlet).name) + ' · ' + esc(outlet(o.outlet).city) + '</b></div>' +
        '<div class="sb-line"><span>' + t('pickTime') + '</span><b>' + slotLabel(o.slot) + '</b></div>' +
        '<div class="sb-line"><span>' + t('total') + '</span><b>' + money(o.total) + '</b></div>' +
      '</div>' +
      '<div class="success-actions">' +
        '<a class="btn btn--primary btn--sm" target="_blank" rel="noopener" href="https://wa.me/' + settings.phone + '?text=' + waText + '">' + ICONS.wa + ' ' + t('coWa') + '</a>' +
        '<button class="btn btn--ghost btn--sm" id="trackOrder" data-track="' + o.id + '">' + t('coTrack') + '</button>' +
        '<button class="btn btn--ghost btn--sm" id="closeSuccess">' + t('coClose') + '</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     countdown
  --------------------------------------------------------- */
  function tickCountdown() {
    var close = new Date(settings.closeAt).getTime();
    var diff = Math.max(0, close - Date.now());
    var d = Math.floor(diff / DAY), h = Math.floor(diff % DAY / 3600000), m = Math.floor(diff % 3600000 / 60000), s = Math.floor(diff % 60000 / 1000);
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var hero = $('#heroCountdown');
    if (hero) hero.textContent = diff > 0 ? (d + 'h ' + pad(h) + 'j ' + pad(m) + 'm') : (LANG === 'id' ? 'PO ditutup' : 'PO closed');
    var big = $('#bigCountdown');
    if (big) {
      var cells = big.children;
      cells[0].querySelector('b').textContent = pad(d);
      cells[1].querySelector('b').textContent = pad(h);
      cells[2].querySelector('b').textContent = pad(m);
      cells[3].querySelector('b').textContent = pad(s);
    }
    var sold = soldPacks(12), cap = Number(settings.capacity) || 120;
    var pct = Math.min(100, Math.round(sold / cap * 100));
    var bar = $('#heroProgress'); if (bar) bar.style.width = pct + '%';
    var lab = $('#heroProgressLabel'); if (lab) lab.textContent = sold + '/' + cap + ' ' + t('packsN') + ' · ' + pct + '%';
    var meter = $('#batchMeter'); if (meter) meter.style.width = pct + '%';
    var soldLab = $('#batchSoldLabel'); if (soldLab) soldLab.textContent = sold + ' / ' + cap + ' ' + t('packUnit');
    var left = $('#ctaLeft'); if (left) left.textContent = Math.max(0, cap - sold) + ' ' + t('packUnit') + '.';
  }

  /* ---------------------------------------------------------
     dashboard
  --------------------------------------------------------- */
  function renderDashboard() {
    renderKPIs();
    renderChart();
    renderPipeline();
    renderTopProducts();
    renderOutletLoad();
    renderActivity();
    renderOrders();
    renderBatchGrid();
    renderAlloc();
    renderOutletCards();
    renderSettings();
    fillSelects();
    var pending = activeOrders(12).filter(function (o) { return o.status === 'pending'; }).length;
    var badge = $('#navOrderBadge'); if (badge) badge.textContent = pending;
    var n = $('#navOrderBadge'); if (n) n.style.display = pending ? '' : 'none';
    tickCountdown();
  }

  function batchStats(n) {
    var list = orders.filter(function (o) { return o.batch === n && o.status !== 'cancelled'; });
    var packs = sum(list, function (o) { return sum(o.items, function (i) { return i.qty; }); });
    var rev = sum(list, function (o) { return o.total; });
    var ready = list.filter(function (o) { return o.status === 'ready'; }).length;
    var picked = list.filter(function (o) { return o.status === 'picked'; }).length;
    return { list: list, packs: packs, revenue: rev, ready: ready, picked: picked, count: list.length };
  }

  function sparkline(vals, color) {
    var w = 120, h = 34, max = Math.max.apply(null, vals.concat([1]));
    var pts = vals.map(function (v, i) {
      var x = (i / Math.max(1, vals.length - 1)) * w;
      var y = h - (v / max) * (h - 4) - 2;
      return [x, y];
    });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = path + ' L' + w + ' ' + h + ' L0 ' + h + ' Z';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + area + '" fill="' + color + '" opacity=".10"/>' +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  function lastDays(n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      out.push(d);
    }
    return out;
  }

  function dailySeries(n, metric) {
    var days = lastDays(n);
    return days.map(function (d) {
      var next = d.getTime() + DAY;
      var list = orders.filter(function (o) {
        var time = new Date(o.createdAt).getTime();
        return time >= d.getTime() && time < next && o.status !== 'cancelled';
      });
      return metric === 'revenue' ? sum(list, function (o) { return o.total; }) : list.length;
    });
  }

  function renderKPIs() {
    var host = $('#kpiGrid');
    if (!host) return;
    var cur = batchStats(12), prev = batchStats(11);
    function delta(now, before) {
      if (!before) return '';
      var pct = Math.round((now - before) / before * 100);
      var up = pct >= 0;
      return '<span class="trend' + (up ? '' : ' down') + '">' + (up ? ICONS.trendUp : ICONS.trendDown) + Math.abs(pct) + '%</span><span>' + t('vsBatch') + '</span>';
    }
    var aov = cur.count ? cur.revenue / cur.count : 0;
    var prevAov = prev.count ? prev.revenue / prev.count : 0;
    var cards = [
      { label: t('kpiOrders'), value: cur.count, icon: ICONS.bag, foot: delta(cur.count, prev.count), spark: sparkline(dailySeries(14, 'orders'), '#9E2A2B') },
      { label: t('kpiRevenue'), value: money(cur.revenue), icon: ICONS.dollar, foot: delta(cur.revenue, prev.revenue), spark: sparkline(dailySeries(14, 'revenue'), '#4A6B53') },
      { label: t('kpiReady'), value: cur.ready, icon: ICONS.box, foot: '<span>' + tr('fromOrders', { n: cur.count }) + '</span>' },
      { label: t('kpiAov'), value: money(aov), icon: ICONS.users, foot: '<span>' + (prevAov ? delta(aov, prevAov) : t('perOrder')) + '</span>' }
    ];
    host.innerHTML = cards.map(function (c) {
      return '<div class="kpi">' +
        '<div class="kpi-top"><span class="kpi-label">' + c.label + '</span><span class="kpi-icon">' + c.icon + '</span></div>' +
        '<div class="kpi-value">' + c.value + '</div>' +
        '<div class="kpi-foot">' + c.foot + '</div>' +
        (c.spark || '') +
      '</div>';
    }).join('');
  }

  function renderChart() {
    var host = $('#chartHost');
    if (!host) return;
    var days = lastDays(14);
    var vals = dailySeries(14, 'revenue');
    var max = Math.max.apply(null, vals.concat([1]));
    max = Math.ceil(max / 50) * 50 || 100;
    var W = 620, H = 186, padL = 40, padR = 8, padT = 12, padB = 22;
    var iw = W - padL - padR, ih = H - padT - padB;
    var pts = vals.map(function (v, i) {
      return [padL + (i / (vals.length - 1)) * iw, padT + ih - (v / max) * ih];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + (padL + iw) + ' ' + (padT + ih) + ' L' + padL + ' ' + (padT + ih) + ' Z';
    var grid = [0, .25, .5, .75, 1].map(function (f) {
      var y = padT + ih * f;
      var v = Math.round(max * (1 - f));
      return '<line class="grid-line" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"/>' +
        '<text class="axis-label" x="0" y="' + (y + 3) + '">A$' + (v >= 1000 ? (v / 1000) + 'k' : v) + '</text>';
    }).join('');
    var xlabels = days.map(function (d, i) {
      if (i % 2 !== 0) return '';
      var x = padL + (i / (days.length - 1)) * iw;
      return '<text class="axis-label" x="' + x + '" y="' + (H - 4) + '" text-anchor="middle">' +
        d.toLocaleDateString(LANG === 'id' ? 'id-ID' : 'en-AU', { day: 'numeric', month: 'short' }) + '</text>';
    }).join('');
    var dots = pts.map(function (p, i) {
      if (i !== pts.length - 1) return '';
      return '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.4"/>';
    }).join('');
    var total = sum(vals);
    host.innerHTML =
      '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px">' +
        '<span style="font-family:var(--display);font-size:27px;font-weight:900">' + money(total) + '</span>' +
        '<span style="font-size:11px;color:var(--muted)">' + t('chartSub') + '</span>' +
      '</div>' +
      '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Revenue chart">' +
        '<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#9E2A2B" stop-opacity=".22"/>' +
          '<stop offset="100%" stop-color="#9E2A2B" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        grid +
        '<path class="area" d="' + area + '"/>' +
        '<path class="line" d="' + line + '"/>' +
        dots + xlabels +
      '</svg>';
  }

  function renderPipeline() {
    var host = $('#pipelineHost');
    if (!host) return;
    var list = activeOrders(12);
    var stages = ['pending', 'paid', 'production', 'packed', 'ready', 'picked'];
    var counts = stages.map(function (s) { return list.filter(function (o) { return o.status === s; }).length; });
    var max = Math.max.apply(null, counts.concat([1]));
    host.innerHTML = stages.map(function (s, i) {
      var m = statusMeta(s);
      return '<div class="pl-stage" data-tone="' + m.tone + '">' +
        '<b>' + counts[i] + '</b>' +
        '<small>' + t(m.label) + '</small>' +
        '<div class="pl-bar"><i style="width:' + Math.round(counts[i] / max * 100) + '%"></i></div>' +
      '</div>';
    }).join('');
    var readyOrDone = list.filter(function (o) { return o.status === 'ready' || o.status === 'picked'; }).length;
    var rate = list.length ? Math.round(readyOrDone / list.length * 100) : 0;
    $('#fulfilRate').textContent = rate + '% (' + readyOrDone + '/' + list.length + ')';
    var processed = list.filter(function (o) { return o.timeline && o.timeline.length > 1; });
    var avgH = processed.length ? sum(processed, function (o) {
      var a = new Date(o.timeline[0].at).getTime(), b = new Date(o.timeline[o.timeline.length - 1].at).getTime();
      return Math.max(0, b - a) / 3600000;
    }) / processed.length : 0;
    $('#avgPrep').textContent = avgH ? (avgH.toFixed(1) + (LANG === 'id' ? ' jam (dari order ke status akhir)' : ' hrs (order → latest status)')) : '—';
  }

  function renderTopProducts() {
    var host = $('#topProductsHost');
    if (!host) return;
    var agg = {};
    activeOrders(12).forEach(function (o) {
      o.items.forEach(function (i) {
        agg[i.sku] = agg[i.sku] || { qty: 0, rev: 0 };
        agg[i.sku].qty += i.qty;
        agg[i.sku].rev += i.qty * i.price;
      });
    });
    var rows = Object.keys(agg).map(function (sku) { return { sku: sku, qty: agg[sku].qty, rev: agg[sku].rev }; })
      .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
    if (!rows.length) { host.innerHTML = '<p class="cell-muted">' + t('noBatchOrders') + '</p>'; return; }
    var max = rows[0].qty;
    host.innerHTML = rows.map(function (r, i) {
      var p = product(r.sku);
      return '<div class="tp-row">' +
        '<span class="tp-rank">' + (i + 1) + '</span>' +
        '<div><div class="tp-name">' + esc(p ? pName(p) : r.sku) + '<span>' + r.qty + ' ' + t('packUnit') + '</span></div>' +
        '<div class="tp-meter"><i style="width:' + Math.round(r.qty / max * 100) + '%"></i></div></div>' +
        '<span class="tp-amt">' + money(r.rev) + '</span>' +
      '</div>';
    }).join('');
  }

  function renderOutletLoad() {
    var host = $('#outletLoadHost');
    if (!host) return;
    var list = activeOrders(12);
    var rows = OUTLETS.map(function (o) {
      var mine = list.filter(function (x) { return x.outlet === o.id; });
      return { o: o, packs: sum(mine, function (x) { return sum(x.items, function (i) { return i.qty; }); }), count: mine.length };
    });
    var max = Math.max.apply(null, rows.map(function (r) { return r.packs; }).concat([1]));
    host.innerHTML = rows.map(function (r) {
      return '<div class="sl-row">' +
        '<span class="sl-ava">' + r.o.code + '</span>' +
        '<span><b>' + esc(r.o.city) + '</b><small>' + r.count + ' ' + t('ordersN') + '</small></span>' +
        '<span class="sl-meter"><i style="width:' + Math.round(r.packs / max * 100) + '%"></i></span>' +
        '<span class="sl-val">' + r.packs + ' ' + t('packUnit') + '</span>' +
      '</div>';
    }).join('');
  }

  function renderActivity() {
    var host = $('#activityHost');
    if (!host) return;
    var list = orders.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 6);
    if (!list.length) { host.innerHTML = '<div class="table-empty">' + t('noActivity') + '</div>'; return; }
    host.innerHTML = list.map(function (o) {
      return '<div class="act">' +
        '<span class="act-ic">' + statusIcon(o.status) + '</span>' +
        '<span><b>' + esc(o.customer.name) + ' · ' + o.id + '</b><small>' + t(statusMeta(o.status).label) + ' · ' + money(o.total) + '</small></span>' +
        '<span class="act-time">' + relTime(o.createdAt) + '</span>' +
      '</div>';
    }).join('');
  }

  function filteredOrders() {
    var q = state.q.toLowerCase().trim();
    var list = orders.filter(function (o) {
      if (state.status !== 'all' && o.status !== state.status) return false;
      if (state.outlet !== 'all' && o.outlet !== state.outlet) return false;
      if (state.batch !== 'all' && String(o.batch) !== String(state.batch)) return false;
      if (q) {
        var hay = (o.id + ' ' + o.customer.name + ' ' + o.customer.phone + ' ' + o.customer.email).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      if (state.sort === 'old') return new Date(a.createdAt) - new Date(b.createdAt);
      if (state.sort === 'high') return b.total - a.total;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return list;
  }

  function renderOrders() {
    var body = $('#ordersBody');
    if (!body) return;
    var list = filteredOrders();
    $('#ordersCount').textContent = tr('showing', { a: list.length, b: orders.length });
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="8"><div class="table-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16M4 12h16M4 19h10"/></svg>' +
        t('noOrders') + '</div></td></tr>';
      return;
    }
    body.innerHTML = list.map(function (o) {
      var m = statusMeta(o.status);
      var packs = sum(o.items, function (i) { return i.qty; });
      var payLabel = o.payment === 'cash' ? t('codLbl') : (o.status === 'pending' ? t('unpaid') : t('paidLbl'));
      return '<tr data-order="' + o.id + '">' +
        '<td><span class="order-id"><span class="oi-dot" style="background:' + (o.status === 'pending' ? 'var(--gold)' : o.status === 'ready' ? 'var(--green)' : 'var(--border-strong)') + '"></span>' + o.id + '</span></td>' +
        '<td class="cust"><b>' + esc(o.customer.name) + '</b><small>' + esc(o.customer.phone) + '</small></td>' +
        '<td class="cell-muted">' + o.items.length + ' item · ' + packs + ' ' + t('packUnit') + '</td>' +
        '<td><span style="font-size:11.5px;font-weight:600">' + esc(outlet(o.outlet).city) + '</span><br><small class="cell-muted">' + esc(outlet(o.outlet).code) + ' · B' + o.batch + '</small></td>' +
        '<td><span class="status" data-s="' + o.status + '"><span class="dot"></span>' + t(m.label) + '</span></td>' +
        '<td><span class="pay-badge">' + (o.payment === 'cash' ? ICONS.box : ICONS.card) + payLabel + '</span></td>' +
        '<td class="total-cell">' + money(o.total) + '</td>' +
        '<td class="cell-muted">' + relTime(o.createdAt) + '</td>' +
      '</tr>';
    }).join('');
  }

  function renderBatchGrid() {
    var host = $('#batchGrid');
    if (!host) return;
    host.innerHTML = BATCHES.map(function (b) {
      var stats = batchStats(b.n);
      var cap = b.n === 12 ? Number(settings.capacity) || b.capacity : b.capacity;
      var pct = Math.min(100, Math.round(stats.packs / cap * 100));
      var badge = b.state === 'open' ? '<span class="badge badge--gold">' + t('batchOpenBadge') + '</span>'
        : b.state === 'closed' ? '<span class="badge badge--soft">' + t('batchClosedBadge') + '</span>'
          : '<span class="badge badge--green">' + t('batchDoneBadge') + '</span>';
      return '<article class="batch-tile">' +
        '<div class="batch-tile-head"><div><h3>Batch ' + b.n + '</h3><small>' + b.title + ' · ' + b.pickup + '</small></div>' + badge + '</div>' +
        '<div><div class="batch-meter-head" style="color:var(--muted);display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:6px">' +
          '<span>' + t('sold') + '</span><b style="color:var(--ink)">' + stats.packs + ' / ' + cap + ' ' + t('packUnit') + ' · ' + pct + '%</b></div>' +
          '<div class="meter meter--light"><i style="width:' + pct + '%"></i></div></div>' +
        '<div class="bt-meta">' +
          '<div>' + t('ordersN') + '<b>' + stats.count + '</b></div>' +
          '<div>' + t('revenue') + '<b>' + money(stats.revenue) + '</b></div>' +
          '<div>' + t('batchLabel') + ' ' + t('capacity') + '<b>' + cap + '</b></div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderAlloc() {
    var host = $('#allocHost');
    if (!host) return;
    var list = activeOrders(12);
    var rows = OUTLETS.map(function (o) {
      var mine = list.filter(function (x) { return x.outlet === o.id; });
      return { o: o, packs: sum(mine, function (x) { return sum(x.items, function (i) { return i.qty; }); }), count: mine.length, rev: sum(mine, function (x) { return x.total; }) };
    });
    var totalPacks = Math.max(1, sum(rows, function (r) { return r.packs; }));
    host.innerHTML = rows.map(function (r) {
      return '<div class="sl-row" style="padding:12px 18px">' +
        '<span class="sl-ava">' + r.o.code + '</span>' +
        '<span style="min-width:0"><b>' + esc(r.o.name) + '</b><small>' + esc(r.o.city) + ' · ' + r.o.hours + '</small></span>' +
        '<span class="sl-val" style="min-width:70px">' + r.packs + ' ' + t('packUnit') + '<br><small style="font-weight:600;color:var(--muted)">' + Math.round(r.packs / totalPacks * 100) + '%</small></span>' +
        '<span class="sl-val" style="min-width:86px">' + money(r.rev) + '<br><small style="font-weight:600;color:var(--muted)">' + r.count + ' ' + t('ordersN') + '</small></span>' +
      '</div>';
    }).join('');
  }

  function renderOutletCards() {
    var host = $('#outletGrid');
    if (!host) return;
    var list12 = activeOrders(12);
    host.innerHTML = OUTLETS.map(function (o) {
      var mine = list12.filter(function (x) { return x.outlet === o.id; });
      var packs = sum(mine, function (x) { return sum(x.items, function (i) { return i.qty; }); });
      var rev = sum(mine, function (x) { return x.total; });
      return '<article class="st-card">' +
        '<div class="st-card-head"><div><h3>' + esc(o.city) + '</h3><small>' + esc(o.name) + '<br>' + esc(o.addr) + '</small></div>' +
          '<button class="switch' + (o.active ? ' is-on' : '') + '" data-toggle-outlet="' + o.id + '" aria-label="Toggle"></button></div>' +
        '<div class="st-card-body">' +
          '<div class="st-stat"><span>' + t('pickupWindow') + '</span><b>' + esc(o.hours) + '</b></div>' +
          '<div class="st-stat"><span>' + t('packsN') + ' batch 12</span><b>' + packs + '</b></div>' +
          '<div class="st-stat"><span>' + t('ordersN') + '</span><b>' + mine.length + '</b></div>' +
          '<div class="st-stat"><span>' + t('revenue') + '</span><b>' + money(rev) + '</b></div>' +
        '</div>' +
        '<div class="st-card-foot"><span class="status" data-s="' + (o.active ? 'ready' : 'picked') + '"><span class="dot"></span>' + (o.active ? t('active') : t('inactive')) + '</span>' +
          '<button class="link-arrow" data-view-orders-outlet="' + o.id + '" style="font-size:11px">' + t('viewOrders') + ICONS.arrow + '</button></div>' +
      '</article>';
    }).join('');
  }

  function fillSelects() {
    var fo = $('#filterOutlet'), fb = $('#filterBatch');
    if (fo) {
      fo.innerHTML = '<option value="all">' + t('allOutlets') + '</option>' + OUTLETS.map(function (o) {
        return '<option value="' + o.id + '">' + esc(o.city) + ' — ' + esc(o.name) + '</option>';
      }).join('');
      fo.value = state.outlet;
    }
    if (fb) {
      fb.innerHTML = '<option value="all">' + t('allBatches') + '</option>' + BATCHES.map(function (b) {
        return '<option value="' + b.n + '">Batch ' + b.n + '</option>';
      }).join('');
      fb.value = state.batch;
    }
    var st = $('#statusTabs');
    if (st) {
      st.innerHTML = [{ k: 'all', l: 'allStatuses' }].concat(STATUSES.map(function (s) { return { k: s.key, l: s.label }; }))
        .map(function (s) {
          return '<button data-status="' + s.k + '" class="' + (state.status === s.k ? 'is-active' : '') + '">' + t(s.l) + '</button>';
        }).join('');
    }
  }

  function renderSettings() {
    var cap = $('#setCapacity'), close = $('#setCloseAt'), phone = $('#setPhone');
    if (cap) cap.value = settings.capacity;
    if (close) close.value = settings.closeAt;
    if (phone) phone.value = settings.phone;
  }

  /* ---------------------------------------------------------
     order sheet
  --------------------------------------------------------- */
  function openOrder(id) {
    var o = orders.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    state.activeOrder = id;
    var m = statusMeta(o.status);
    $('#sheetTitle').textContent = o.id;
    $('#sheetSub').innerHTML = esc(o.customer.name) + ' · ' + money(o.total) + ' · <span class="status" data-s="' + o.status + '"><span class="dot"></span>' + t(m.label) + '</span>';
    var items = o.items.map(function (i) {
      var p = product(i.sku);
      return '<div class="item-row">' +
        '<img src="' + (p ? IMG[p.img] : '') + '" alt="">' +
        '<div class="ir-name"><b>' + esc(p ? pName(p) : i.sku) + '</b><small>' + i.qty + ' × ' + money(i.price) + '</small></div>' +
        '<span class="ir-price">' + money(i.price * i.qty) + '</span>' +
      '</div>';
    }).join('');
    var order = ['pending', 'paid', 'production', 'packed', 'ready', 'picked'];
    var currentIdx = order.indexOf(o.status);
    var tl = order.map(function (s, idx) {
      var rec = (o.timeline || []).filter(function (x) { return x.s === s; })[0];
      var cls = o.status === 'cancelled' ? (idx === 0 ? 'is-done' : '') : idx < currentIdx ? 'is-done' : idx === currentIdx ? (s === 'picked' ? 'is-done' : 'is-current') : '';
      return '<div class="tl-item ' + cls + '">' +
        '<span class="tl-dot">' + (cls === 'is-done' ? ICONS.check : statusIcon(s)) + '</span>' +
        '<span><b>' + t(statusMeta(s).label) + '</b><small>' + (rec ? dateFmt(rec.at, true) : '—') + '</small></span>' +
      '</div>';
    }).join('');
    if (o.status === 'cancelled') {
      tl += '<div class="tl-item is-current" style="padding-top:12px"><span class="tl-dot">' + ICONS.x + '</span><span><b>' + t('stCancelled') + '</b><small>' + dateFmt((o.timeline || [{}])[(o.timeline || []).length - 1].at, true) + '</small></span></div>';
    }
    $('#sheetBody').innerHTML =
      '<div class="sheet-block"><h4>' + t('itemsTitle') + '</h4>' + items +
        '<div class="kv total"><span>' + t('total') + '</span><b>' + money(o.total) + '</b></div></div>' +
      '<div class="sheet-block"><h4>' + t('customerTitle') + '</h4>' +
        '<div class="kv"><span>' + t('coName') + '</span><b>' + esc(o.customer.name) + '</b></div>' +
        '<div class="kv"><span>' + t('phone') + '</span><b>' + esc(o.customer.phone) + '</b></div>' +
        '<div class="kv"><span>' + t('email') + '</span><b>' + esc(o.customer.email || '—') + '</b></div>' +
        (o.note ? '<div class="kv"><span>' + t('coNote') + '</span><b style="max-width:60%">' + esc(o.note) + '</b></div>' : '') +
      '</div>' +
      '<div class="sheet-block"><h4>' + t('pickupTitle') + '</h4>' +
        '<div class="kv"><span>' + t('outletLabel') + '</span><b>' + esc(outlet(o.outlet).name) + '<br><small class="cell-muted">' + esc(outlet(o.outlet).city) + '</small></b></div>' +
        '<div class="kv"><span>' + t('pickTime') + '</span><b>' + slotLabel(o.slot) + '</b></div>' +
        '<div class="kv"><span>' + t('batchLabel') + '</span><b>Batch ' + o.batch + '</b></div>' +
        '<div class="kv"><span>' + t('paymentLabel') + '</span><b>' + (o.payment === 'cash' ? t('codLbl') : t('payTransfer')) + ' · ' + (o.status === 'pending' ? t('unpaid') : t('paidLbl')) + '</b></div>' +
      '</div>' +
      '<div class="sheet-block"><h4>' + t('timelineTitle') + '</h4><div class="timeline">' + tl + '</div></div>' +
      '<div class="sheet-block"><h4>' + t('noteTitle') + '</h4>' +
        '<textarea class="note-area" id="orderNote" placeholder="' + esc(t('coNotePh')) + '">' + esc(o.note || '') + '</textarea>' +
        '<button class="btn btn--ghost btn--sm" id="saveNote" style="margin-top:8px">' + t('saveNote') + '</button>' +
      '</div>';

    var actions = '';
    if (o.status !== 'picked' && o.status !== 'cancelled') {
      var nxt = statusMeta(o.status).next;
      if (nxt) actions += '<button class="btn btn--primary btn--block" data-advance="' + o.id + '">' + t('advance') + ' ' + t(statusMeta(nxt).label) + ' →</button>';
      actions += '<div style="display:flex;gap:8px">' +
        '<a class="btn btn--ghost btn--sm" style="flex:1" target="_blank" rel="noopener" href="https://wa.me/' + (o.customer.phone || '').replace(/\D/g, '') + '">' + ICONS.wa + ' ' + t('chatCustomer') + '</a>' +
        '<button class="btn btn--ghost btn--sm" style="flex:1" data-cancel="' + o.id + '">' + t('cancelOrder') + '</button></div>';
    } else if (o.status === 'cancelled') {
      actions += '<button class="btn btn--outline btn--block" data-advance="' + o.id + '">' + t('reOpen') + '</button>';
    }
    actions += '<button class="btn btn--ghost btn--sm btn--block" data-copy="' + o.id + '">' + ICONS.copy + ' Salin kode order</button>';
    $('#sheetFoot').innerHTML = actions;
    $('#orderSheet').classList.add('is-open');
    $('#scrim').classList.add('is-open');
    document.body.classList.add('locked');
  }

  function closeSheet() {
    $('#orderSheet').classList.remove('is-open');
    if (!$('#cartDrawer').classList.contains('is-open') && !$('#checkoutModal').classList.contains('is-open')) {
      $('#scrim').classList.remove('is-open');
      document.body.classList.remove('locked');
    }
    state.activeOrder = null;
  }

  function setStatus(id, next) {
    var o = orders.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    o.status = next;
    o.timeline = o.timeline || [];
    o.timeline.push({ s: next, at: new Date().toISOString() });
    persist();
    renderDashboard();
    if (state.activeOrder === id) openOrder(id);
    toast(tr('toastStatus', { id: id, status: t(statusMeta(next).label) }));
  }

  /* ---------------------------------------------------------
     CSV
  --------------------------------------------------------- */
  function exportCsv() {
    var list = filteredOrders();
    if (!list.length) { toast(t('noOrders')); return; }
    var head = ['Order', 'Created', 'Batch', 'Customer', 'Phone', 'Email', 'Outlet', 'Status', 'Payment', 'Items', 'Total AUD', 'Note'];
    var rows = list.map(function (o) {
      var items = o.items.map(function (i) {
        var p = product(i.sku);
        return i.qty + 'x ' + (p ? p.name.en : i.sku);
      }).join(' | ');
      return [o.id, new Date(o.createdAt).toISOString(), 'B' + o.batch, o.customer.name, o.customer.phone, o.customer.email || '',
        outlet(o.outlet).name + ' (' + outlet(o.outlet).city + ')', statusMeta(o.status).label, o.payment, items, o.total.toFixed(2), o.note || ''];
    });
    var csv = [head].concat(rows).map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'makuru-orders-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast(t('toastExport'));
  }

  /* ---------------------------------------------------------
     navigation / chrome
  --------------------------------------------------------- */
  function openCart() {
    renderCart();
    $('#cartDrawer').classList.add('is-open');
    $('#scrim').classList.add('is-open');
    document.body.classList.add('locked');
  }
  function closeCart() {
    $('#cartDrawer').classList.remove('is-open');
    if (!$('#orderSheet').classList.contains('is-open') && !$('#checkoutModal').classList.contains('is-open')) {
      $('#scrim').classList.remove('is-open');
      document.body.classList.remove('locked');
    }
  }
  function closeCheckout() {
    $('#checkoutModal').classList.remove('is-open');
    if (!$('#cartDrawer').classList.contains('is-open') && !$('#orderSheet').classList.contains('is-open')) {
      $('#scrim').classList.remove('is-open');
      document.body.classList.remove('locked');
    }
    renderCheckout();
  }

  function showDashboard(view) {
    closeCart(); closeCheckout(); closeSheet();
    $('#storefront').hidden = true;
    $('#siteHeader').hidden = true;
    $('.announce').hidden = true;
    $('.footer').hidden = true;
    $('#dashboard').hidden = false;
    document.body.classList.remove('locked');
    if (view) switchView(view);
    renderDashboard();
    window.scrollTo(0, 0);
    history.replaceState(null, '', '#dashboard');
  }
  function hideDashboard() {
    $('#dashboard').hidden = true;
    $('#storefront').hidden = false;
    $('#siteHeader').hidden = false;
    $('.announce').hidden = false;
    $('.footer').hidden = false;
    history.replaceState(null, '', '#');
  }
  var VIEW_TITLES = { overview: 'dvOverview', orders: 'dvOrders', batch: 'dvBatch', outlets: 'dvOutlets', settings: 'dvSettings' };
  function switchView(view) {
    state.view = view;
    $$('.dash-nav button').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-view') === view); });
    $$('[data-view-panel]').forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-view-panel') === view); });
    $('#dashTitle').textContent = t(VIEW_TITLES[view] || 'dvOverview');
    $('#dashTitle').setAttribute('data-i18n', VIEW_TITLES[view] || 'dvOverview');
  }

  function toast(msg) {
    var host = $('#toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = ICONS.check + '<span>' + esc(msg) + '</span>';
    host.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, 2600);
  }

  /* ---------------------------------------------------------
     reveal
  --------------------------------------------------------- */
  var io = null;
  function revealAll() { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }
  function observeReveal() {
    /* Inside an embedded preview (iframe) or without IO support, skip the
       scroll animation so content is never stuck invisible. */
    var embedded = false;
    try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
    if (embedded || !('IntersectionObserver' in window)) { revealAll(); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    }
    $$('.reveal:not(.in)').forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     events
  --------------------------------------------------------- */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-add]');
      if (el) { addToCart(el.getAttribute('data-add')); return; }

      el = e.target.closest('[data-cat]');
      if (el) { state.cat = el.getAttribute('data-cat'); renderFilters(); renderMenu(); return; }

      el = e.target.closest('[data-lang]');
      if (el) {
        LANG = el.getAttribute('data-lang');
        localStorage.setItem('makuru_lang', LANG);
        applyStaticI18n(); renderFilters(); renderMenu(); renderStockists(); renderCart();
        renderDashboard();
        return;
      }

      el = e.target.closest('[data-pick-outlet]');
      if (el) {
        coState.outlet = el.getAttribute('data-pick-outlet');
        if (!cartItems().length) { openCart(); toast(t('selectOutlet') + ': ' + outlet(coState.outlet).name); }
        else openCheckout();
        return;
      }

      el = e.target.closest('[data-qty]');
      if (el) { changeQty(el.getAttribute('data-sku'), el.getAttribute('data-qty') === 'inc' ? 1 : -1); return; }

      el = e.target.closest('[data-remove]');
      if (el) {
        var p = product(el.getAttribute('data-remove'));
        delete cart[el.getAttribute('data-remove')];
        persist(); updateCartBadge(false); renderMenu(); renderCart();
        if (p) toast(tr('toastRemoved', { name: pName(p) }));
        return;
      }

      if (e.target.closest('#emptyCartCta')) { closeCart(); document.getElementById('katalog').scrollIntoView({ behavior: 'smooth' }); return; }

      el = e.target.closest('[data-co-outlet]');
      if (el) {
        coState.outlet = el.getAttribute('data-co-outlet');
        $$('#outletPicker .pick').forEach(function (b) { b.classList.toggle('is-active', b === el); });
        var err = $('#outletErr'); if (err) err.style.display = 'none';
        return;
      }

      el = e.target.closest('[data-order]');
      if (el) { openOrder(el.getAttribute('data-order')); return; }

      el = e.target.closest('[data-advance]');
      if (el) {
        var id = el.getAttribute('data-advance');
        var o = orders.filter(function (x) { return x.id === id; })[0];
        if (!o) return;
        var nx = nextStatuses(o.status)[0];
        if (nx) setStatus(id, nx);
        return;
      }
      el = e.target.closest('[data-cancel]');
      if (el) { setStatus(el.getAttribute('data-cancel'), 'cancelled'); return; }

      el = e.target.closest('[data-copy]');
      if (el) {
        var code = el.getAttribute('data-copy');
        if (navigator.clipboard) navigator.clipboard.writeText(code).catch(function () {});
        toast(t('toastCopied') + ' ' + code);
        return;
      }

      el = e.target.closest('#saveNote');
      if (el) {
        var noteEl = $('#orderNote');
        var oid = state.activeOrder;
        var ord = orders.filter(function (x) { return x.id === oid; })[0];
        if (ord && noteEl) { ord.note = noteEl.value.trim(); persist(); toast(t('toastNote')); }
        return;
      }

      el = e.target.closest('[data-jump]');
      if (el) { switchView(el.getAttribute('data-jump')); return; }

      el = e.target.closest('[data-toggle-outlet]');
      if (el) {
        var oid2 = el.getAttribute('data-toggle-outlet');
        OUTLETS.forEach(function (o) { if (o.id === oid2) o.active = !o.active; });
        renderOutletCards();
        toast(outlet(oid2).city + ' · ' + (outlet(oid2).active ? t('active') : t('inactive')));
        return;
      }

      el = e.target.closest('[data-view-orders-outlet]');
      if (el) {
        state.outlet = el.getAttribute('data-view-orders-outlet');
        state.status = 'all'; state.batch = '12';
        fillSelects(); renderOrders(); switchView('orders');
        return;
      }

      el = e.target.closest('#trackOrder');
      if (el) {
        var tid = el.getAttribute('data-track');
        $('#checkoutModal').classList.remove('is-open');
        showDashboard('orders');
        openOrder(tid);
        switchView('orders');
        return;
      }

      el = e.target.closest('#closeSuccess');
      if (el) { closeCheckout(); return; }

      el = e.target.closest('.dash-nav button');
      if (el) { switchView(el.getAttribute('data-view')); return; }

      if (e.target.closest('#openDashBtn') || e.target.closest('#footerDashLink')) { e.preventDefault(); showDashboard('overview'); return; }
      if (e.target.closest('#backToStore') || e.target.closest('#dashLogo')) { e.preventDefault(); hideDashboard(); return; }

      if (e.target.closest('#openCart')) { openCart(); return; }
      if (e.target.closest('#closeCart')) { closeCart(); return; }
      if (e.target.closest('#headerOrderBtn') || e.target.closest('#ctaOrderBtn') || e.target.closest('#batchCta')) {
        if (cartItems().length) openCheckout(); else { document.getElementById('katalog').scrollIntoView({ behavior: 'smooth' }); }
        return;
      }
      if (e.target.closest('#checkoutBtn')) { openCheckout(); return; }
      if (e.target.closest('#closeCheckout')) { closeCheckout(); return; }
      if (e.target.closest('#closeSheet')) { closeSheet(); return; }
      if (e.target.closest('#exportCsv')) { exportCsv(); return; }
      if (e.target.closest('#saveSettings')) {
        settings.capacity = Math.max(1, Number($('#setCapacity').value) || 120);
        settings.closeAt = $('#setCloseAt').value || settings.closeAt;
        settings.phone = $('#setPhone').value.replace(/\D/g, '') || settings.phone;
        persist(); renderDashboard(); tickCountdown(); toast(t('toastSettings'));
        return;
      }
      if (e.target.closest('#resetData')) {
        orders = seed(); cart = {}; persist(); updateCartBadge(false); renderMenu(); renderCart(); renderDashboard();
        toast(t('toastReset'));
        return;
      }
      if (e.target.closest('#scrim')) { closeCart(); closeCheckout(); closeSheet(); return; }
    });

    document.addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'coForm') submitCheckout(e);
    });

    var search = $('#globalSearch');
    if (search) {
      search.addEventListener('input', function () {
        state.q = search.value;
        if (state.view !== 'orders') switchView('orders');
        renderOrders();
      });
    }
    ['filterOutlet', 'filterBatch', 'filterSort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'filterOutlet') state.outlet = el.value;
        if (id === 'filterBatch') state.batch = el.value;
        if (id === 'filterSort') state.sort = el.value;
        renderOrders();
      });
    });
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-status]');
      if (tab) { state.status = tab.getAttribute('data-status'); fillSelects(); renderOrders(); }
    });

    var mt = $('#menuToggle');
    if (mt) mt.addEventListener('click', function () {
      var nav = $('.nav');
      if (!nav) return;
      var open = nav.style.display === 'flex';
      if (open) { nav.style.display = ''; return; }
      nav.style.cssText = 'display:flex;position:absolute;top:78px;left:16px;right:16px;flex-direction:column;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px 18px;box-shadow:var(--shadow-md);z-index:40';
      $$('.nav a').forEach(function (a) { a.style.padding = '9px 0'; });
    });

    var header = $('#siteHeader');
    if (header) window.addEventListener('scroll', function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    }, { passive: true });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeCart(); closeCheckout(); closeSheet(); }
    });
  }

  /* ---------------------------------------------------------
     boot
  --------------------------------------------------------- */
  function boot() {
    if (!Array.isArray(orders) || !orders.length) { orders = seed(); persist(); }
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    applyStaticI18n();
    renderFilters();
    renderMenu();
    renderStockists();
    updateCartBadge(false);
    renderCart();
    tickCountdown();
    setInterval(tickCountdown, 1000);
    observeReveal();
    window.addEventListener('beforeprint', revealAll);
    setTimeout(function () { if (!window.scrollY) revealAll(); }, 2500);
    bindEvents();
    renderDashboard();
    fillSelects();

    if (location.hash === '#dashboard') showDashboard('overview');

    window.addEventListener('hashchange', function () {
      if (location.hash === '#dashboard') showDashboard(state.view);
      else hideDashboard();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
