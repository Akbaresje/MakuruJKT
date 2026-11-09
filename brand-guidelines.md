# Brand System & AI Web Builder Directives: makuru. Dimsum

> **Sumber:** Google Drive — `Brand Guidelines & AI Web Builder Rules.md`
> **Status:** dokumen acuan aktif untuk seluruh build di project ini.
> **Role:** UI, arsitektur komponen, layout, dan styling makuru. wajib mengikuti token & aturan di bawah.

---

## 1. Brand Essence & Visual Archetype

- **Brand Name:** makuru. *(strictly lowercase with trailing period)*
- **Core Offering:** Freshly steamed artisanal dimsum, comfort street-to-table food, chili oil, frozen packs.
- **Visual Personality:** Warm, artisanal, approachable, retro-modern oriental, appetite-inducing, clean.
- **Anti-patterns (DO NOT DO):**
  - Jangan pakai merah neon keras atau kuning tersaturasi tinggi.
  - Jangan pakai sudut kotak tajam (`border-radius: 0px`).
  - Jangan pakai ornamen naga, kuas kaligrafi, atau tipografi pseudo-oriental klise.
  - Jangan kapitalisasi wordmark: bukan `MAKURU` / `Makuru` — selalu `makuru.`

---

## 2. Color Palette & Design Tokens

```json
{
  "colors": {
    "brand": {
      "primary": "#9E2A2B",
      "primary-hover": "#832223",
      "background": "#FAF5EB",
      "surface": "#FFFFFF",
      "surface-alt": "#F3EBDD",
      "gold": "#DDA15E",
      "green": "#4A6B53",
      "text": {
        "primary": "#241E1E",
        "muted": "#736B66",
        "light": "#FAF5EB"
      },
      "border": "rgba(36, 30, 30, 0.08)"
    }
  }
}
```

Peran token: Chili Brick Red = CTA & wordmark · Steamer Cream = kanvas · Paper White = kartu/modal/input ·
Soft Oat = hover & tag sekunder · Sesame Gold = badge/rating/diskon · Scallion Green = halal/veggie/stok ·
Char Charcoal = teks · Warm Gray = caption/timestamp.

**Radius:** `16px` (kartu kecil), `24px` (panel/kartu besar), `9999px` (pill/CTA). Tidak ada sudut 0.

---

## 3. Typography Architecture

| Role | Font | Weights | Usage |
| :--- | :--- | :--- | :--- |
| Display / Heading | `Fraunces`, serif | 600 / 700 / 900 | Hero, judul section, nama dish |
| Body & UI | `Plus Jakarta Sans`, sans-serif | 400 / 500 / 600 / 700 | Harga, deskripsi, nav, form, badge |

> Di build ini kedua font di-embed sebagai **variable font woff2 base64** di dalam `index.html`,
> jadi preview tetap tampil on-brand tanpa akses internet.

---

## 4. UI Component Patterns

**A. Logo** — `makuru.` lowercase, Fraunces 900, warna merah brand, clearance ≥ 12px.
**B. CTA**
- Primary: bg `#9E2A2B`, teks `#FAF5EB`, semibold, radius full/16px, hover `#832223`, `active:scale-.95`.
- Secondary: border 2px `#9E2A2B`, transparan, teks merah, hover `rgba(158,42,43,.06)`.
**C. Menu & Product Cards** — putih, border 1px `rgba(36,30,30,.08)`, radius 24px;
gambar 1:1 / 4:3 dengan zoom halus; badge spicy/best seller = gold + teks gelap; halal/fresh = green + teks cream.

---

## 5. Page Structure Blueprint

1. **Navbar** — logo kiri, link (Katalog, Cerita, Lokasi, Testimoni), CTA "Pesan Sekarang" + cart.
2. **Hero** — headline Fraunces "Hangat, Lembut, Penuh Rasa." + subhead + dual CTA + visual kukusan bambu.
3. **Category Filter & Menu Grid** — pill kategori + grid responsif 2→4 kolom.
4. **Value Proposition** — 3 micro-features (halal & daging segar, chili oil racikan, dikukus segar).
5. **Ordering / Outlet** — alur WhatsApp order, agregator, lokasi toko + jam + maps.
6. **Footer** — logo, copyright, sosial, kontak.

---

## 6. Microcopy & Tone of Voice

- **Tone:** friendly, welcoming, appetizing, humble, modern Indonesian street-culinary.
- **Contoh:** "Pesan Sekarang", "Bungkus Hangat", "Kukus Sekarang",
  empty state "Kukusanmu masih kosong nih. Yuk pilih dimsum favoritmu!",
  toast "Siomay Ayam Udang berhasil masuk keranjang."

---

## 7. Adaptasi untuk pasar Australia (dipakai di build ini)

Acuan brand tetap dipatuhi, dengan penyesuaian operasional:

- **Mata uang:** AUD (`A$`), bukan IDR.
- **Bahasa:** default Indonesia + toggle **EN** untuk pelanggan lokal Australia.
- **Model jualan:** **Open PO per batch** (bukan order harian) → countdown tutup PO, sisa kapasitas, jadwal produksi & pengambilan.
- **Distribusi:** pesanan **diantar ke 4 stokis** (Sydney, Melbourne, Brisbane, Perth), pelanggan memilih stokis + slot saat checkout.
- **Copy:** tetap hangat & culinary, tapi nama menu diberi padanan Inggris (mis. "Siomay Ayam Udang" / "Chicken & Prawn Siomay").
- **Dashboard monitoring** untuk owner: alur status PO (Menunggu bayar → Dibayar → Produksi → Dikemas → Siap diambil → Sudah diambil).
