/**
 * makuru. — Vercel serverless function
 * Handles every /api/* request and serves the app from /index.html.
 *
 * Env vars (Project → Settings → Environment Variables):
 *   MAKURU_PIN      the PIN everyone types            (required)
 *   DATABASE_URL    database connection string        (required — Neon; POSTGRES_URL also accepted)
 *   MAKURU_SECRET   optional, keeps logins valid between cold starts
 *   TOKEN_DAYS      optional, default 30
 */
import { createApp, deriveSecret } from '../lib/core.mjs';
import { createPgStorage } from '../lib/storage-pg.mjs';

let app = null;

function getApp() {
  if (app) return app;

  const pin = (process.env.MAKURU_PIN || '').trim();
  if (!pin) throw new Error('MAKURU_PIN is not set');

  const dbUrl = process.env.POSTGRES_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_PRISMA_URL
    || '';
  if (!dbUrl) throw new Error('DATABASE_URL (or POSTGRES_URL) is not set');

  // deterministic secret: stable across cold starts even without MAKURU_SECRET
  const secret = (process.env.MAKURU_SECRET || '').trim()
    || deriveSecret([pin, dbUrl, 'makuru-vercel']);

  app = createApp({
    storage: createPgStorage(),
    pin,
    secret,
    tokenDays: Math.max(1, Number(process.env.TOKEN_DAYS || 30)),
    log: (...a) => console.log('[makuru]', ...a)
  });
  return app;
}

function pathOf(req) {
  const q = req.query && req.query.path;
  let tail = '';
  if (Array.isArray(q)) tail = q.join('/');
  else if (typeof q === 'string') tail = q;
  if (!tail) {
    const u = new URL(req.url || '/', 'http://local');
    tail = u.pathname.replace(/^\/api\/?/, '');
  }
  return '/api/' + tail.replace(/^\/+/, '');
}

function ipOf(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function bodyOf(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString('utf8')); } catch { body = {}; }
  }
  if (body && typeof body === 'object') return body;

  // very small runtime: read the stream ourselves
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  const path = pathOf(req);

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const body = method === 'POST' || method === 'PUT' || method === 'PATCH' ? await bodyOf(req) : {};
    const out = await getApp().handle({
      method,
      path,
      body,
      ip: ipOf(req),
      headers: req.headers
    });
    res.status(out.status).json(out.body);
  } catch (e) {
    console.error('[makuru] api error:', e);
    const missingConfig = /is not set/.test(e.message);
    res.status(missingConfig ? 500 : 500).json({
      error: missingConfig ? e.message : 'Server error',
      hint: missingConfig ? 'Set this environment variable in Vercel, then redeploy.' : undefined
    });
  }
}
