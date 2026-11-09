# makuru. — Dimsum Open PO + Order Monitoring

Aplikasi web untuk jualan dimsum model **open pre-order (PO)** dengan pengambilan di **beberapa stokis di Australia**, lengkap dengan **dashboard monitoring pesanan** untuk owner.

Dibangun mengikuti **Brand Guidelines & AI Web Builder Rules: makuru.** (lihat `brand-guidelines.md`).

---

## File

| File | Isi |
| :--- | :--- |
| `index.html` | **Aplikasi lengkap (single file).** Font, gambar, CSS, JS semuanya ter-embed — bisa dibuka dobel klik, tanpa server, tanpa internet. |
| `brand-guidelines.md` | Salinan aturan brand resmi dari Google Drive + catatan adaptasi pasar Australia. |
| `site-src/` | Source yang bisa diedit: `styles.css`, `body.html`, `app.js`, `img/`, `fonts/`, `build.py`. |
| `shots/` | Screenshot hasil QA desktop & mobile. |

### Cara edit

```bash
cd site-src
# edit styles.css / body.html / app.js, lalu:
python3 build.py        # menghasilkan ../index.html (single file)
```

---

## Yang ada di dalamnya

### Storefront (sisi pelanggan)
- **Hero** + badge "Open PO", countdown batch, progress kapasitas (mis. 74/120 pack).
- **Katalog** 8 produk (kukus, goreng, frozen pack, chili oil, minuman) + filter kategori, harga AUD.
- **Alur Open PO** 3 langkah + kartu batch (tanggal tutup PO, produksi, pengambilan).
- **4 stokis** (Sydney, Melbourne, Brisbane, Perth): alamat, jam ambil, tombol map, "pilih stokis".
- **Cart drawer** + **checkout**: nama, WhatsApp, email, stokis, slot pengambilan, metode bayar, catatan.
- **Halaman sukses** dengan kode order (mis. `MK-1213`), tombol konfirmasi WhatsApp & lacak di dashboard.
- **Bilingual ID / EN** (toggle di header) — penting karena pelanggan di Australia.

### Dashboard monitoring (sisi owner)
Tombol grid di header, atau footer → "Dashboard monitoring". Bisa juga langsung `index.html#dashboard`.

1. **Ringkasan** — 4 KPI (pesanan masuk, pendapatan, siap diambil, rata-rata order) + trend vs batch lalu, grafik pendapatan 14 hari, pipeline status 6 tahap, produk terlaris, beban per stokis, aktivitas terbaru.
2. **Pesanan** — tabel semua order: search, filter status/stokis/batch, sorting, klik baris → panel detail.
3. **Batch PO** — progres tiap batch (terjual/kapasitas/nilai) + alokasi pengiriman per stokis otomatis.
4. **Stokis** — kartu per kota: jam ambil, jumlah pack, order, nilai, toggle aktif/nonaktif, shortcut lihat order.
5. **Pengaturan** — ubah kapasitas batch, waktu tutup PO, nomor WhatsApp; reset data contoh.

**Alur status pesanan:** Menunggu bayar → Dibayar → Produksi → Dikemas → Siap diambil → Sudah diambil (+ Dibatalkan).
Setiap perubahan tersimpan dengan timestamp dan tampil di **riwayat status** pada panel detail. Ada juga catatan internal per order dan **export CSV**.

---

## Data & penyimpanan

- Semua data (order, cart, pengaturan) disimpan di **localStorage** browser — jadi demo langsung jalan tanpa backend dan tetap ada saat halaman di-refresh.
- Data awal: **19 pesanan contoh** batch 10–12 di 4 stokis, tersebar 0–24 hari terakhir supaya grafik & KPI langsung terisi.
- Kode order baru di-generate otomatis (`MK-1214`, `MK-1215`, dst).

### Kalau mau dipakai produksi
1. Ganti `localStorage` → **Supabase / Firebase / Google Sheets API** (`site-src/app.js`, bagian `load()/persist()`).
2. Tambah halaman login/role untuk owner sebelum dashboard.
3. Kirim notifikasi status ke pelanggan via **WhatsApp Cloud API** (sekarang masih link `wa.me` manual).
4. File gambar produk di `site-src/img/` bisa diganti foto asli; jalankan `python3 build.py` lagi.

---

## Catatan brand yang dipatuhi

- Palet hanya dari token resmi: `#9E2A2B`, `#FAF5EB`, `#FFFFFF`, `#F3EBDD`, `#DDA15E`, `#4A6B53`, `#241E1E`, `#736B66`.
- Font **Fraunces** (display) + **Plus Jakarta Sans** (UI), di-embed sebagai variable woff2.
- Wordmark selalu **`makuru.`** (lowercase + titik), tidak ada ornamen naga/kaligrafi, tidak ada sudut tajam (radius 16/24/full).
- Tone copy hangat & culinary: "Pesan Sekarang", "Kukusanmu masih kosong nih.", "Dikukus fresh".
