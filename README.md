# makuru. — dimsum open PO, orders, multi-shop stock

Selling dimsum through an **open pre-order (PO) batch** model, distributed from several
pickup shops across Australia. Two products in one repo:

- **Storefront** (`index.html`) — customer-facing catalogue, PO batch, shop picker, cart, checkout.
- **Ops app** (`makuru-ops.html`) — owner-facing: dimsum stock, raw-material stock, packs per
  consignment shop, orders. English-only, PIN-protected, syncs across devices through Postgres.

No frameworks, no build toolchain to install: the UI ships as a single self-contained HTML file,
the backend is one serverless function plus one SQL table.

---

## Two ways to run it

### 1. Offline / single machine (`makuru-ops.html`)

Double-click `makuru-ops.html`. Everything (fonts, icons, CSS, JS) is embedded; data lives in
`localStorage`. No server, no internet.

### 2. Multi-device, cloud (`vercel/`)

Same app, but state is stored server-side and shared between phones, tablets and the shop laptop.
Sign-in is a PIN; every save is versioned so two devices can never silently overwrite each other.

```bash
cd vercel
cp .env.example .env.local      # set MAKURU_PIN and DATABASE_URL
npm install
npm run dev                     # http://localhost:8090
```

Deploy: [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) — covers Neon, Vercel Postgres and Supabase,
plus CLI / GitHub / dashboard deploys, a custom domain, and a troubleshooting table.

> The backend needs a **hosted Postgres** because Vercel functions have no persistent disk.
> Any Postgres works; `neon.ts` is included for `neon deploy`.

---

## Layout

| Path | What it is |
| :--- | :--- |
| `index.html` | Storefront + sales dashboard, single file (1.6 MB). Built from `site-src/`. |
| `site-src/` | Editable storefront source: `styles.css`, `body.html`, `app.js`, `img/`, `fonts/`, `build.py`. |
| `makuru-ops.html` | Ops app, offline single file (220 KB). Built from `ops-simple/`. |
| `ops-simple/` | Ops source: `app.js`, `styles.css`, `build.py`, `tests/`. |
| `server/` | Node server for VPS/Railway/Fly: file storage, PIN auth, same API. |
| `vercel/` | Vercel project: serverless handler, Postgres storage, local dev host, tests. |
| `deploy/` | Static copy of the ops app for Netlify/Cloudflare/GitHub Pages. |
| `brand-guidelines.md` | Brand rules this design follows. |

### Rebuilding

```bash
cd site-src   && python3 build.py    # -> index.html
cd ops-simple && python3 build.py    # -> makuru-ops.html, deploy/, server/public/, vercel/
```

`ops-simple/build.py` also refreshes the copies inside `deploy/`, `server/public/` and `vercel/`,
so there is exactly one source of truth for the ops UI.

---

## API

| Method | Route | Notes |
| :--- | :--- | :--- |
| `GET` | `/api/health` | `{ok, app, mode, version, updatedAt}` |
| `POST` | `/api/login` | `{pin}` → `{token, expiresInDays}`; `401` wrong PIN, `429` rate-limited |
| `GET` | `/api/state` | Bearer token → `{version, updatedAt, createdAt, data}` |
| `PUT` | `/api/state` | `{baseVersion, data}` → `200 {version}` or `409` with the current document |

`PUT` is optimistic: if another device saved first, the write is rejected with `409` and the app
merges instead of clobbering. Storage is one row (`makuru_state`, id = 1) holding one JSON
document plus a `version` counter.

## Environment

| Key | Required | Purpose |
| :--- | :--- | :--- |
| `MAKURU_PIN` | yes | PIN everyone types to get in |
| `DATABASE_URL` | yes for `vercel/` | Postgres connection string (`POSTGRES_URL` also accepted) |
| `MAKURU_SECRET` | no | signing key for sessions; defaults to a `MAKURU_PIN`-derived value |
| `TOKEN_DAYS` | no | session length in days (default 30) |

Driver choice is automatic: hosts ending in `.neon.tech` use `@neondatabase/serverless` over
HTTP (right fit for serverless), anything else uses a small `pg` pool (local dev, VPS).

## Tests

```bash
node server/test-api.mjs      # 21  API + auth + storage (file backend)
node vercel/test-vercel.mjs   # 16  Postgres backend, incl. two browsers on one DB
node ops-simple/tests/smoke.mjs    # 33
node ops-simple/tests/cloud.mjs    # 19  two devices, sync, conflict merge
node ops-simple/tests/mascot.mjs   # 18
node ops-simple/tests/anim.mjs     # 19
```

`vercel/test-vercel.mjs` and the UI suites need a Chromium installed via Playwright, plus the
Node deps in `package.json` at the repo root.

## Docs

- [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) — hosted deployment, step by step
- [README-backend.md](README-backend.md) — self-hosted server, env, backups, limits
- [DEPLOY.md](DEPLOY.md) — static deployment
- [README-ops.md](README-ops.md) — what the ops app does, field by field

Brand: colours `#9E2A2B` / `#FAF5EB` / `#DDA15E` / `#4A6B53` / `#241E1E`, Fraunces + Plus Jakarta
Sans, wordmark always lowercase `makuru.`
