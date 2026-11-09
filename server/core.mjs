/**
 * makuru. core — auth + API routes, independent of where the data lives.
 * Used by server/server.mjs (file storage) and vercel/api/server.mjs (Postgres).
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const BACKUP_KEEP = 20;

export function emptyState() {
  return {
    version: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: { products: [], materials: [], shops: [], orders: [], sales: [], seq: { order: 1 } }
  };
}

export function normalizeData(d) {
  const base = emptyState().data;
  const out = {};
  for (const k of ['products', 'materials', 'shops', 'orders', 'sales']) {
    out[k] = Array.isArray(d && d[k]) ? d[k] : base[k];
  }
  out.seq = (d && d.seq && typeof d.seq === 'object') ? d.seq : base.seq;
  if (!Number.isFinite(Number(out.seq.order))) out.seq.order = 1;
  return out;
}

export function sha(s) {
  return createHash('sha256').update(String(s)).digest();
}

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * @param {object} opts
 * @param {{read:Function, write:Function}} opts.storage
 * @param {string} opts.pin
 * @param {string} opts.secret
 * @param {number} [opts.tokenDays]
 * @param {Function} [opts.log]
 */
export function createApp({ storage, pin, secret, tokenDays = 30, log = () => {} }) {
  const PIN = String(pin || '');
  const SECRET = String(secret || '');
  if (!PIN) throw new Error('PIN is required');
  if (!SECRET || SECRET.length < 16) throw new Error('signing secret is required');

  const attempts = new Map();

  function tooMany(ip) {
    const a = attempts.get(ip);
    if (!a) return false;
    if (Date.now() > a.until) { attempts.delete(ip); return false; }
    return a.count >= 8;
  }
  function noteFail(ip) {
    const a = attempts.get(ip) || { count: 0, until: 0 };
    a.count += 1;
    a.until = Date.now() + 10 * 60 * 1000;
    attempts.set(ip, a);
  }

  function makeToken() {
    const exp = Date.now() + tokenDays * 864e5;
    const body = 'v1.' + exp;
    const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
    return body + '.' + sig;
  }

  function tokenOk(token) {
    if (!token) return false;
    const parts = String(token).split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') return false;
    const body = parts[0] + '.' + parts[1];
    const want = createHmac('sha256', SECRET).update(body).digest('base64url');
    if (!safeEqual(parts[2], want)) return false;
    return Number(parts[1]) > Date.now();
  }

  function bearer(headers) {
    const h = (headers && (headers.authorization || headers.Authorization)) || '';
    const m = /^Bearer\s+(.+)$/i.exec(String(h));
    return m ? m[1] : '';
  }

  /**
   * @param {{method:string, path:string, body?:object, ip?:string, headers?:object}} req
   * @returns {Promise<{status:number, body:object}>}
   */
  async function handle(req) {
    const method = (req.method || 'GET').toUpperCase();
    const path = req.path || '/';
    const ip = req.ip || 'unknown';

    if (path === '/api/health') {
      const s = await storage.read();
      return {
        status: 200,
        body: {
          ok: true, app: 'makuru', mode: 'cloud',
          version: s ? s.version : 0,
          updatedAt: s ? s.updatedAt : null
        }
      };
    }

    if (path === '/api/login' && method === 'POST') {
      if (tooMany(ip)) return { status: 429, body: { error: 'Too many tries. Wait 10 minutes.' } };
      const given = String((req.body && req.body.pin) || '').trim();
      if (!given) return { status: 400, body: { error: 'PIN required' } };
      if (!safeEqual(sha(given).toString('hex'), sha(PIN).toString('hex'))) {
        noteFail(ip);
        log('wrong PIN from ' + ip);
        return { status: 401, body: { error: 'Wrong PIN' } };
      }
      attempts.delete(ip);
      log('login ok from ' + ip);
      return { status: 200, body: { token: makeToken(), expiresInDays: tokenDays } };
    }

    if (path === '/api/state' && method === 'GET') {
      if (!tokenOk(bearer(req.headers))) return { status: 401, body: { error: 'Sign in first' } };
      const s = await storage.read();
      const base = s || emptyState();
      return { status: 200, body: { version: base.version, updatedAt: base.updatedAt, createdAt: base.createdAt, data: base.data } };
    }

    if (path === '/api/state' && method === 'PUT') {
      if (!tokenOk(bearer(req.headers))) return { status: 401, body: { error: 'Sign in first' } };
      const body = req.body || {};
      if (!body.data || typeof body.data !== 'object') return { status: 400, body: { error: 'data missing' } };
      const baseVersion = Number(body.baseVersion);
      if (!Number.isFinite(baseVersion)) return { status: 400, body: { error: 'baseVersion missing' } };

      const res = await storage.write(normalizeData(body.data), baseVersion);
      if (!res.ok) {
        const cur = res.current || emptyState();
        return { status: 409, body: { error: 'conflict', version: cur.version, updatedAt: cur.updatedAt, data: cur.data } };
      }
      return { status: 200, body: { version: res.version, updatedAt: res.updatedAt } };
    }

    return { status: 404, body: { error: 'no such endpoint' } };
  }

  return { handle, makeToken, tokenOk };
}

/** a signing secret that survives cold starts when MAKURU_SECRET is not set */
export function deriveSecret(parts) {
  return createHash('sha256').update('makuru|' + parts.join('|')).digest('hex');
}
