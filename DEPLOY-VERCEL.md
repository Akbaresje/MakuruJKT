# Deploy makuru. ke Vercel — langkah demi langkah

> **Baca ini dulu:** Vercel tidak menyimpan file. Kalau app-nya dinaikkan apa adanya (seperti `deploy/` di Netlify), semua data hilang setiap kali situs "bangun" — jadi **wajib pakai database**. Folder **`vercel/`** di workspace ini sudah disiapkan untuk itu: app + fungsi `/api` + tabel Postgres.

Isi folder `vercel/`:

```
vercel/
├── index.html              app (sama persis dengan makuru-ops.html)
├── api/[...path].mjs       fungsi serverless: login PIN, baca/tulis data
├── lib/core.mjs            logika auth + API (sama dengan server VPS)
├── lib/storage-pg.mjs      simpan ke Postgres (satu baris, satu dokumen, versi)
├── package.json            dependency: pg
├── vercel.json             rewrite + header keamanan
├── dev-server.mjs          tes lokal dengan Postgres
└── .env.example            daftar variabel yang dibutuhkan
```

---

## Ringkas (jalur tercepat)

1. **Buat database gratis** di Neon (atau Vercel Postgres). Copy connection string.
2. **Deploy folder `vercel/`** ke Vercel.
3. **Set 2 env var:** `MAKURU_PIN` dan `POSTGRES_URL`.
4. **Redeploy**, buka URL, masukkan PIN. Selesai.

Detailnya di bawah (≈15 menit).

---

## Langkah 1 — Siapkan database (pilih salah satu)

### 1A. Neon (paling gampang, gratis)
1. Buka <https://neon.tech> → daftar (bisa pakai GitHub/Google).
2. **Create project** → nama `makuru` → region **AWS ap-southeast-2 (Sydney)** biar dekat Australia.
3. Di halaman **Connection string**, pilih **Pooled connection** (ada tulisan *pooler*), copy string-nya. Bentuknya:
   ```
   postgresql://neondb_owner:xxxx@ep-xxx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Tidak perlu bikin tabel.** Server membuat tabel `makuru_state` sendiri saat request pertama.

> ### Sudah tersambung: project `little-brook-24843381`
> Setup Neon untuk repo ini **sudah dijalankan dan diuji** terhadap database sungguhan.
>
> | Item | Nilai |
> | :--- | :--- |
> | Organization | `org-divine-dawn-86048500` |
> | Project | `little-brook-24843381` |
> | Branch | `production` |
> | Host (pooled) | `ep-wispy-moon-a7td2p0s-pooler.ap-southeast-2.aws.neon.tech` |
> | Driver terpakai | `@neondatabase/serverless` (HTTP), otomatis untuk host `*.neon.tech` |
> | Tabel | `makuru_state` — dibuat otomatis, satu baris `id = 1` |
>
> Yang perlu kamu isi **saat deploy ke Vercel** (Settings → Environment Variables):
> ```
> DATABASE_URL = postgresql://neondb_owner:<password>@ep-wispy-moon-a7td2p0s-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
> MAKURU_PIN   = 4271
> MAKURU_SECRET= <64 karakter hex acak>   # opsional, tapi disarankan
> TOKEN_DAYS   = 30                       # opsional
> ```
> Nilai persisnya ada di `vercel/.env.local` di workspace ini (file itu **tidak** di-commit).
>
> **CLI Neon.** `neon init` sudah dijalankan (offline) → `vercel/.neon` menunjuk ke project di atas,
> dan `neon.ts` mendeklarasikan service `postgres`. `neon deploy` **belum** bisa dijalankan karena
> butuh `NEON_API_KEY` (`neon login` memakai callback ke `127.0.0.1` yang tidak bisa dijangkau dari
> sandbox). Kalau nanti mau menjalankannya di komputermu:
> ```bash
> cd vercel
> export NEON_API_KEY=neon_xxx     # console.neon.tech → Account settings → API keys
> neon deploy -y                    # apply neon.ts + tulis .env.local
> npm run build
> node --env-file=.env.local scripts/verify-cloud.mjs
> ```

### 1B. Vercel Postgres### 1B. Vercel Postgres (langsung dari dashboard Vercel)
1. Di project Vercel: tab **Storage** → **Create Database** → **Postgres** → region **Sydney** → Create.
2. Vercel otomatis menambahkan env var `POSTGRES_URL` (dan beberapa varian lain) ke project.
3. Kalau env var belum muncul, buka database → **Quickstart** → copy `POSTGRES_URL`.
   > Catatan: Vercel Postgres sekarang berbasis Neon; kalau diminta memilih, pilih **Neon** lalu hubungkan ke project.

### 1C. Supabase
1. <https://supabase.com> → New project → region **ap-southeast-2**.
2. **Project Settings → Database → Connection string → URI** (pakai yang *Session pooler*).
3. Ganti `[YOUR-PASSWORD]` dengan password database-mu.

---

## Langkah 2 — Deploy kode

### 2A. Lewat CLI (paling cepat dan pasti)
```bash
npm i -g vercel
cd vercel
vercel login
vercel --prod
```
Saat ditanya:
- *Set up and deploy?* → **y**
- *Which scope?* → pilih akunmu
- *Link to existing project?* → **n**
- *What's your project's name?* → `makuru`
- *In which directory is your code located?* → **./** (enter saja)
- *Want to modify these settings?* → **n** (framework terdeteksi sebagai *Other*, sudah benar)

Setelah selesai, catat URL-nya (`https://makuru-xxxx.vercel.app`).

### 2B. Lewat GitHub (kalau mau auto-deploy tiap push)
1. Buat repo baru, isi dengan folder `vercel/`:
   ```bash
   cd vercel
   git init && git add . && git commit -m "makuru on vercel"
   git branch -M main
   git remote add origin https://github.com/USERNAME/makuru-vercel.git
   git push -u origin main
   ```
2. <https://vercel.com/new> → **Import** repo itu → **Deploy** (jangan ubah setting apa pun).

### 2C. Lewat dashboard (tanpa Git, tanpa CLI)
1. <https://vercel.com/new> → tab upload/drag & drop.
2. Tarik **isi** folder `vercel/` (bukan foldernya). Kalau drag tidak tersedia, install CLI (cara 2A). Dashboard upload paling praktis lewat CLI/Git untuk struktur folder yang ada `api/`.

---

## Langkah 3 — Set variabel lingkungan

Vercel → project → **Settings** → **Environment Variables** → tambah dua ini (pilih **Production**, boleh juga Preview/Development):

| Nama | Nilai | Wajib |
| :--- | :--- | :--- |
| `MAKURU_PIN` | PIN pilihanmu, contoh `4271` | ya |
| `POSTGRES_URL` | connection string dari Langkah 1 | ya |
| `MAKURU_SECRET` | string acak panjang, contoh hasil `openssl rand -hex 32` | opsional |
| `TOKEN_DAYS` | `30` (default) | opsional |

Keterangan:
- `MAKURU_SECRET` dipakai untuk menandatangani token login. Kalau tidak diisi, server menurunkan kunci dari PIN + URL database, jadi tetap stabil. Mengisinya lebih aman (bisa ganti PIN tanpa mematikan sesi lain).
- Jangan taruh PIN di kode atau di repo — hanya di Environment Variables.

Setelah menambah env var, **Redeploy** (Vercel → Deployments → titik tiga → Redeploy), karena env baru hanya terbaca saat deploy ulang.

---

## Langkah 4 — Uji

1. Buka `https://makuru-xxxx.vercel.app` → muncul layar **Sign in**.
2. Masukkan PIN → masuk ke Home.
3. Tambah 1 produk di **Dimsum Stock**.
4. Buka URL yang sama di HP → masukkan PIN yang sama → **produk tadi sudah ada**.
5. Ubah sesuatu di HP → dalam ±12 detik (atau saat tab laptop aktif kembali) angka di laptop ikut berubah. Status di sidebar: **Synced**.

Cek cepat lewat terminal:
```bash
curl https://makuru-xxxx.vercel.app/api/health
# {"ok":true,"app":"makuru","mode":"cloud","version":3,...}
```

Kalau `MAKURU_PIN` atau `POSTGRES_URL` lupa diisi, `/api/health` menjawab error yang jelas (`MAKURU_PIN is not set`) — bukan diam-diam kosong.

---

## Langkah 5 — Domain sendiri (opsional)

1. Vercel → project → **Settings** → **Domains** → **Add**.
2. Masukkan `makuru.domainmu.com` (atau domain utama).
3. Vercel memberi instruksi DNS:
   - Subdomain: **CNAME** `makuru` → `cname.vercel-dns.com`
   - Domain utama: **A** `@` → `76.76.21.21`
4. Pasang di tempat kamu beli domain, tunggu 5–60 menit. HTTPS dibuat otomatis.

---

## Tes lokal dulu sebelum deploy (opsional, tapi disarankan)

Butuh Node 20+ dan Postgres (lokal atau Neon).

```bash
cd vercel
npm install

# arahkan ke database mana pun
export POSTGRES_URL='postgres://user:pass@127.0.0.1:5432/makuru'
export MAKURU_PIN=1234

node dev-server.mjs
# buka http://localhost:8090
```

Atau pakai Vercel CLI yang meniru platform-nya:
```bash
cd vercel
cp .env.example .env.local   # isi nilainya
vercel dev
```

---

## Bukti dari database Neon yang sebenarnya

Dijalankan terhadap project `little-brook-24843381`, branch `production`:

```
$ npm run build
env:  DATABASE_URL, MAKURU_PIN, MAKURU_SECRET, TOKEN_DAYS
PASS  storage driver  neon-http (ep-wispy-moon-a7td2p0s-pooler.ap-southeast-2.aws.neon.tech)
PASS  MAKURU_PIN set  (hidden)
build ok

$ node --env-file=.env.local scripts/verify-cloud.mjs
PASS  health responds  {"ok":true,"app":"makuru","mode":"cloud","version":0,...}
PASS  storage driver  neon-http on ep-wispy-moon-...neon.tech
PASS  wrong PIN rejected  HTTP 401
PASS  PIN login returns a token  expires in 30 days
PASS  write accepted  v0 -> v1
PASS  product round-trips
PASS  stale write rejected  HTTP 409
PASS  data survives a process restart  version 1
10 passed, 0 failed

$ node --env-file=.env.local test-vercel.mjs
PASS  second device sees the product from the shared database
PASS  first device picks up the second device change
PASS  Postgres holds both products (v5, 2 products)
16 passed, 0 failed
```

Skema yang terbentuk otomatis di Neon:

```
id          smallint
version     bigint
created_at  timestamp with time zone
updated_at  timestamp with time zone
data        jsonb
```

## Hasil tes yang sudah saya jalankan di workspace ini

`node vercel/test-vercel.mjs` — memakai **Postgres 17 sungguhan**, fungsi Vercel dijalankan lewat host tiruan:

| Cek | Hasil |
| :--- | :--- |
| Tabel dibuat otomatis saat request pertama | lulus |
| PIN salah ditolak, PIN benar dapat token | lulus |
| Simpan → baca balik dari Postgres | lulus |
| Versi basi → 409 (optimistic locking di SQL) | lulus |
| Dua penulisan bersamaan → satu menang, satu 409 | lulus |
| Data tetap ada di "cold start" berikutnya | lulus |
| **2 browser = 2 device**, satu database | lulus |
| Device B lihat data A, device A lihat data B | lulus |
| Env var kurang → error jelas | lulus |

**16/16 lulus, tanpa error console.** Ditambah tes server VPS (`node server/test-api.mjs` 21/21) dan tes app (`smoke` 33, `mascot` 18, `anim` 19, `cloud` 19) yang tetap lulus.

---

## Kalau ada masalah

| Gejala | Penyebab & solusi |
| :--- | :--- |
| Layar PIN tidak muncul, langsung masuk app | `MAKURU_PIN` belum diset / belum redeploy → app jatuh ke mode lokal (data di browser) |
| `500 ... MAKURU_PIN is not set` | Set env var, lalu **Redeploy** |
| `500 ... POSTGRES_URL is not set` | Sama: set connection string, redeploy |
| `password authentication failed` | Password di connection string salah / karakter khusus belum di-URL-encode |
| `SSL required` | Tambahkan `?sslmode=require` di akhir connection string |
| Data hilang tiap beberapa menit | Biasanya masih pakai filesystem Vercel (deploy `deploy/`, bukan `vercel/`) atau `POSTGRES_URL` menunjuk database yang di-reset |
| Login terus minta PIN | `MAKURU_SECRET` berubah-ubah antar deploy — set nilainya supaya tetap |
| Situs lambat saat pertama dibuka | Cold start serverless; request berikutnya cepat |

---

## Yang perlu diketahui (jujur)

- **Satu PIN untuk semua orang.** Cocok untuk kamu + karyawan. Belum ada akun per orang / log aktivitas.
- **Semua data satu baris JSON.** Untuk ratusan produk dan ribuan order masih nyaman; kalau nanti butuh laporan berat, sebaiknya dipecah ke tabel relasional.
- **Paket gratis**: Neon/Vercel Postgres gratis untuk skala ini, tapi database gratis bisa "tidur" saat tidak dipakai — request pertama setelah lama diam terasa 1–2 detik.
- **Jangan pakai `deploy/` (versi statis) kalau butuh multi-device.** Versi statis tetap berguna untuk demo cepat, tapi datanya per-browser.
