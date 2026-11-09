# Backend makuru. — supaya data dipakai bareng dari beberapa device

Sekarang data **tidak lagi disimpan di browser**. Semua device (HP, tablet, laptop) membaca dan menulis ke **satu database di server**. Buka di mana saja, isinya sama.

```
server/
├── server.mjs          ← server HTTP (Node 20+, tanpa dependency)
├── core.mjs            ← logika auth + API (dipakai juga oleh build Vercel)
├── storage-file.mjs    ← simpan ke state.json (VPS/Railway/Fly)
├── package.json
├── Dockerfile          ← untuk deploy ke VPS / Railway / Fly
├── public/index.html   ← app-nya (otomatis disalin dari build)
├── data/               ← database: state.json + secret + pin + backups/
└── test-api.mjs        ← 21 tes API
```

---

## Cara kerja singkat

- **Login PIN.** Semua device mengetik PIN yang sama → dapat token yang berlaku 30 hari. Tanpa PIN, app tidak terbuka.
- **Satu dokumen database.** Seluruh isi (produk, material, toko, order, penjualan) disimpan sebagai satu file `state.json`, lengkap dengan nomor versi.
- **Anti-tabrakan.** Setiap penyimpanan menyertakan versi yang dia baca. Kalau device lain sudah menyimpan lebih dulu, server menolak (409) dan app **menggabungkan** dua versi itu otomatis — jadi dua orang bisa menambah pesanan bersamaan tanpa saling menimpa.
- **Sinkron otomatis.** App menarik perubahan tiap 12 detik, saat tab kembali aktif, dan saat koneksi pulih. Statusnya terlihat di sidebar: **Synced / Saving / Merged / Offline**.
- **Backup.** Server menyimpan salinan bertanggal di `data/backups/` (maksimal 20 file) dan menulis file secara atomik supaya tidak pernah setengah jadi.
- Kalau file yang sama dibuka sebagai file biasa (atau di-host statis di Netlify), **mode lokal tetap jalan** seperti sebelumnya — tanpa login, data di browser.

---

## Jalan di komputer sendiri (5 menit)

```bash
cd server
MAKURU_PIN=1234 node server.mjs
```

Buka **http://localhost:8080** → masukkan PIN `1234`.

Kalau `MAKURU_PIN` tidak diisi, server membuat PIN acak 6 angka dan menampilkannya di log (juga tersimpan di `data/pin`).

**Mencoba dari HP di jaringan yang sama:** cari IP komputer (`ipconfig` / `ifconfig` / `ip a`), lalu buka `http://192.168.x.x:8080` di HP. Kedua device akan melihat data yang sama.

---

> **Mau pakai Vercel?** Baca **`DEPLOY-VERCEL.md`** — serverless tidak bisa menulis file, jadi untuk Vercel dipakai Postgres (`vercel/`, sudah dites 16/16).

## Deploy supaya bisa diakses dari mana saja

Kamu butuh host yang bisa **menjalankan Node** dan **menyimpan file** (bukan sekadar hosting statis). Tiga pilihan termudah:

### A. Railway (paling cepat, ada free credit)
1. Push folder `server/` ke repo GitHub.
2. <https://railway.app> → **New Project** → **Deploy from GitHub repo** → pilih repo.
3. **Variables** → tambahkan `MAKURU_PIN` = PIN pilihanmu (contoh `4271`).
4. **Settings → Volumes** → Add volume, mount path **`/app/data`** (ini yang bikin data tidak hilang saat redeploy).
5. **Settings → Networking** → Generate domain → dapat `https://makuru-xxxx.up.railway.app`.
6. Buka di HP dan laptop, masukkan PIN yang sama.

### B. Fly.io
```bash
cd server
fly launch --no-deploy          # pilih region dekat Australia, misal syd
fly volumes create makuru_data --size 1
fly secrets set MAKURU_PIN=4271
fly deploy
```
Pastikan di `fly.toml` ada:
```toml
[mounts]
  source = "makuru_data"
  destination = "/app/data"
```

### C. VPS sendiri (DigitalOcean, Hetzner, Contabo…)
```bash
# di server, sekali saja
apt install -y nodejs   # butuh Node 20+
mkdir -p /srv/makuru && cd /srv/makuru
# upload isi folder server/ ke sini (scp / rsync / git clone)
MAKURU_PIN=4271 node server.mjs
```
Supaya tetap hidup setelah logout, pakai systemd:

```ini
# /etc/systemd/system/makuru.service
[Unit]
Description=makuru sync server
After=network.target

[Service]
WorkingDirectory=/srv/makuru
Environment=MAKURU_PIN=4271
Environment=PORT=8080
Environment=DATA_DIR=/srv/makuru/data
Environment=PUBLIC_DIR=/srv/makuru/public
ExecStart=/usr/bin/node server.mjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```
```bash
systemctl enable --now makuru
```

Lalu pasang **Caddy** (HTTPS otomatis) di depannya:
```
makuru.domainkamu.com {
  reverse_proxy 127.0.0.1:8080
}
```

> Kalau pakai reverse proxy, server membaca header `X-Forwarded-For` untuk rate-limit PIN. Jangan lupa aktifkan header itu di proxy-nya.

---

## Variabel lingkungan

| Nama | Default | Arti |
| :--- | :--- | :--- |
| `PORT` | `8080` | port server |
| `MAKURU_PIN` | acak, dibuat sekali | PIN untuk semua device |
| `DATA_DIR` | `./data` | tempat `state.json`, `secret`, `pin`, `backups/` |
| `PUBLIC_DIR` | `./public` | tempat `index.html` |
| `TOKEN_DAYS` | `30` | masa berlaku login |

---

## Endpoint

| Method | Path | Fungsi |
| :--- | :--- | :--- |
| GET | `/api/health` | cek server hidup + versi data |
| POST | `/api/login` | `{pin}` → `{token}` |
| GET | `/api/state` | ambil seluruh data (butuh token) |
| PUT | `/api/state` | `{data, baseVersion}` → simpan; `409` + data terbaru kalau versi basi |

---

## Backup & pindah server

- Salinan otomatis: `data/backups/state-*.json` (20 terakhir).
- Backup manual: `cp data/state.json backup-$(date +%F).json`
- Pindah server: hentikan server, copy seluruh folder `data/`, jalankan lagi. Token lama tetap valid karena `secret` ikut pindah.
- Reset total: hapus `data/state.json` (dan `backups/`), lalu mulai lagi dari nol.

---

## Tes

```bash
node server/test-api.mjs          # 21 tes: auth, simpan, konflik, restart, rate limit
node ops-simple/tests/cloud.mjs   # 19 tes 2 browser: 2 device, 1 database, merge anti-tabrakan
node vercel/test-vercel.mjs       # 16 tes build Vercel di Postgres sungguhan
```

Hasil terakhir: **21/21**, **19/19**, **16/16**, tanpa error console.

---

## Yang perlu kamu tahu (jujur)

- **Satu PIN untuk semua orang.** Cocok untuk kamu + karyawan toko. Belum ada akun terpisah per orang atau log "siapa mengubah apa".
- **Semua data di satu file JSON.** Untuk skala ini (ratusan produk/order) lebih dari cukup dan gampang di-backup. Kalau nanti butuh ribuan transaksi + laporan berat, sebaiknya pindah ke Postgres/Supabase — strukturnya sudah disiapkan supaya migrasinya tidak sulit.
- **HTTPS wajib** kalau diakses lewat internet (Railway/Fly/VPS+Caddy sudah otomatis). Jangan pakai `http://` di jaringan publik, karena PIN ikut terkirim.
- **Ganti PIN** = edit `MAKURU_PIN` lalu restart. Semua device harus login ulang (token lama tetap sah sampai 30 hari — hapus `data/secret` kalau mau semua token langsung mati).
