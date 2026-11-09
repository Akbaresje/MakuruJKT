# Deploy makuru. — langkah demi langkah

> **Mau dipakai dari beberapa device (HP + laptop + toko)?** Versi statis di bawah menyimpan data **per-browser** — tidak bisa dibagi. Untuk itu pakai server: lihat **`README-backend.md`** (VPS/Railway/Fly) atau **`DEPLOY-VERCEL.md`** (Vercel + Postgres).

Pilih **satu** jalur. Kalau bingung: pakai **Jalur A (Netlify)**. Sekitar 5 menit, tanpa install apa pun.

Yang dipakai cuma isi folder **`deploy/`**:

```
deploy/
├── index.html    ← seluruh app (font, CSS, JS, maskot, ikon) sudah di dalam
├── 404.html      ← halaman kalau URL salah
├── _headers      ← header keamanan + cache (dipakai Netlify & Cloudflare)
└── .nojekyll     ← penanda untuk GitHub Pages
```

Kalau lebih suka satu file: **`makuru-deploy.zip`** (119 KB) isinya sama persis.

---

## Jalur A — Netlify Drop (paling cepat, tanpa Git)

1. **Download dulu** folder `deploy` ke komputer, atau ambil `makuru-deploy.zip` lalu **extract** (harus berupa folder, bukan zip).
2. Buka **<https://app.netlify.com/drop>**
3. **Login / daftar gratis** (bisa pakai akun Google atau GitHub). Ini wajib sekarang, tapi gratis.
4. Setelah masuk, halaman itu menampilkan kotak besar bertuliskan *"Drag and drop your site output folder here"*.
5. **Tarik folder `deploy`** ke kotak itu.
   - Yang ditarik **foldernya**, bukan file `index.html` di dalamnya.
   - Kalau drag tidak jalan: klik kotaknya → pilih folder `deploy` → **Upload**.
6. Tunggu 10–30 detik. Muncul URL seperti **`https://spontaneous-panda-a1b2c3.netlify.app`** — itu situsmu, sudah live.
7. **Ganti nama jadi rapi:**
   - Klik **Site configuration** (atau *Site settings*) → **Change site name**
   - Isi `makuru` → **Save**
   - URL jadi **`https://makuru.netlify.app`** (kalau sudah dipakai orang, tambahkan angka: `makuru-id`)
8. **Buka URL-nya di HP juga.** Selesai.

**Update nanti (1 menit):** buka site → tab **Deploys** → tarik ulang folder `deploy` ke kotak *"Need to update your site? Drag and drop your site output folder here"* → tunggu selesai. URL tidak berubah.

---

## Jalur B — Cloudflare Pages

1. Buka **<https://dash.cloudflare.com>** → daftar / login (gratis).
2. Menu kiri: **Workers & Pages** → **Create** → tab **Pages** → **Upload assets**.
3. Nama proyek: `makuru` → **Create project**.
4. Tarik folder **`deploy`** ke area upload → **Deploy site**.
5. Dapat **`https://makuru.pages.dev`**.
6. Update: masuk proyek → **Create new deployment** → upload folder `deploy` lagi.

Kelebihan: cepat diakses dari Indonesia dan kuota gratisnya longgar.

---

## Jalur C — GitHub Pages (perlu Git)

1. Buat repo baru di <https://github.com/new>, nama `makuru`, **Public**, jangan centang apa pun.
2. Di terminal, dari folder **`deploy`**:

```bash
cd deploy
git init
git add .
git commit -m "makuru site"
git branch -M main
git remote add origin https://github.com/USERNAME/makuru.git
git push -u origin main
```

   Ganti `USERNAME` dengan username GitHub kamu. Saat diminta password, pakai **Personal Access Token** (Settings → Developer settings → Tokens), bukan password akun.

3. Di repo: **Settings** → **Pages** → Source: **Deploy from a branch** → Branch **`main`** / folder **`/ (root)`** → **Save**.
4. Tunggu 1–2 menit, URL: **`https://USERNAME.github.io/makuru/`**
5. Update: ubah file → `git add . && git commit -m "update" && git push` → otomatis deploy ulang.

---

## Jalur D — Vercel

**Lewat dashboard (tanpa terminal):**
1. <https://vercel.com> → login gratis.
2. **Add New…** → **Project** → tab upload → tarik folder `deploy` → **Deploy**.
3. Dapat **`https://makuru-xxxx.vercel.app`**.

**Lewat terminal:**
```bash
npm i -g vercel
cd deploy
vercel --prod
```

---

## Jalur E — Hosting sendiri (cPanel / VPS / shared hosting)

1. Masuk **File Manager** hosting → buka **`public_html`**.
2. Upload isi folder `deploy` (bukan foldernya, tapi **isinya**: `index.html`, `404.html`, `_headers`, `.nojekyll`).
3. Selesai. Tidak butuh PHP, Node, atau database — ini halaman statis.
4. Pastikan domain mengarah ke folder itu; kalau perlu, tambahkan file `.htaccess` untuk 404 (bilang saja, saya buatkan).

---

## Pasang domain sendiri (opsional, setelah live)

1. Beli domain (Namecheap, Cloudflare Registrar, DomaiNesia, dsb).
2. Di panel host (Netlify: **Domain management** → *Add a domain*):
   - Masukkan domainmu → host memberi **2–4 record DNS**.
3. Di tempat kamu beli domain, buka **DNS settings**, lalu:
   - **CNAME** `www` → alamat situs dari host (contoh `makuru.netlify.app`)
   - **A record** `@` → IP yang diberikan host (Netlify biasanya `75.2.60.5`)
4. Tunggu 5–60 menit (propagasi DNS). Host otomatis membuatkan **HTTPS gratis**.
5. Balik ke panel host → aktifkan **HTTPS / Force SSL**.

---

## Cek 30 detik setelah live

Buka URL-nya, lalu pastikan:

- [ ] Tulisan **makuru.** muncul dan hurufnya naik satu per satu
- [ ] Tombol **Enter** → ada animasi "pinch" lalu masuk ke Home
- [ ] Maskot dimsum di pojok kanan bawah: matanya ikut kursor, diklik → lompat
- [ ] Tambah 1 produk → refresh halaman → datanya masih ada
- [ ] Buka di HP: menu bisa digeser, maskot mengecil
- [ ] Tab browser ada ikon dimsum kecil

---

## Penting: data itu per-browser

App menyimpan data di **localStorage** browser (key `makuru_simple_v1`). Artinya:

- Data **hanya ada di browser itu**. Buka di laptop lain / HP lain → kosong lagi.
- Hilang kalau browser dibersihkan, pakai mode Incognito, atau klik **Clear all data**.
- Cocok untuk: kamu sendiri di satu perangkat, atau demo ke calon pembeli.
- Belum cocok untuk: dipakai bersama oleh beberapa toko/perangkat sekaligus → perlu backend (login + database).

**Backup manual:** DevTools → **Application** → **Local Storage** → pilih domainmu → copy isi `makuru_simple_v1` → simpan ke file teks. Untuk mengembalikan: tempel lagi isinya.

---

## Update situs nanti

```bash
python3 ops-simple/build.py          # bangun ulang dari sumber
cp makuru-ops.html deploy/index.html # masukkan ke folder deploy
```
Lalu upload ulang folder `deploy` ke host (Netlify: drag ulang di tab Deploys; GitHub: `git commit && git push`).
