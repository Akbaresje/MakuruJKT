/**
 * Postgres storage for serverless hosts.
 *
 * Driver choice:
 *  - Neon (host ends in .neon.tech) -> @neondatabase/serverless HTTP driver.
 *    On Vercel every request may be a fresh lambda; TCP pools from `pg` burn
 *    through Neon's connection limit. The HTTP driver sends each statement as
 *    one fetch, so there is nothing to leak between invocations.
 *  - anything else (local Postgres, self-hosted) -> `pg` Pool, so the same
 *    code runs in development and in tests.
 *
 * Storage model: one row, one json document, optimistic locking on `version`.
 */
import pg from 'pg';

const TABLE = 'makuru_state';

const DDL = `
  CREATE TABLE IF NOT EXISTS ${TABLE} (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    data jsonb NOT NULL DEFAULT '{"products":[],"materials":[],"shops":[],"orders":[],"sales":[],"seq":{"order":1}}'::jsonb
  )`;
const SEED = `INSERT INTO ${TABLE} (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;

let pool = null;
let neonSql = null;
let schemaReady = null;

export function connectionString() {
  return process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || '';
}

function isNeon(url) {
  return /\.neon\.tech\b/i.test(url);
}

function isLocal(url) {
  return /(^|@)(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
}

function getPool(url) {
  if (pool) return pool;
  pool = new pg.Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: isLocal(url) || /sslmode=/.test(url) ? undefined : { rejectUnauthorized: false }
  });
  pool.on('error', (e) => console.error('pg pool error:', e.message));
  return pool;
}

async function driver(url) {
  if (isNeon(url)) {
    if (!neonSql) {
      const { neon } = await import('@neondatabase/serverless');
      neonSql = neon(url, { fullResults: true });
    }
    return {
      kind: 'neon-http',
      run: async (text, params) => {
        const r = await neonSql.query(text, params || []);
        return { rows: r.rows, rowCount: r.rowCount };
      }
    };
  }
  const db = getPool(url);
  return {
    kind: 'pg',
    run: async (text, params) => {
      const r = await db.query(text, params || []);
      return { rows: r.rows, rowCount: r.rowCount };
    }
  };
}

function map(row) {
  return {
    version: Number(row.version),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    data: row.data
  };
}

export function createPgStorage({ url = connectionString() } = {}) {
  let handle = null;
  async function db() {
    if (!url) throw new Error('DATABASE_URL is not set');
    if (!handle) handle = await driver(url);
    return handle;
  }

  async function ensureSchema() {
    if (schemaReady) return schemaReady;
    schemaReady = (async () => {
      const d = await db();
      await d.run(DDL);
      await d.run(SEED);
    })().catch((e) => {
      schemaReady = null; // retry on the next request
      throw e;
    });
    return schemaReady;
  }

  async function read() {
    await ensureSchema();
    const d = await db();
    const r = await d.run(`SELECT version, created_at, updated_at, data FROM ${TABLE} WHERE id = 1`);
    return r.rows.length ? map(r.rows[0]) : null;
  }

  async function write(data, baseVersion) {
    await ensureSchema();
    const d = await db();
    const upd = await d.run(
      `UPDATE ${TABLE}
          SET version = version + 1,
              updated_at = now(),
              data = $1::jsonb
        WHERE id = 1 AND version = $2
        RETURNING version, updated_at`,
      [JSON.stringify(data), Number(baseVersion)]
    );

    if (!upd.rowCount) return { ok: false, current: await read() };
    return {
      ok: true,
      version: Number(upd.rows[0].version),
      updatedAt: new Date(upd.rows[0].updated_at).toISOString()
    };
  }

  return { read, write, driverKind: async () => (await db()).kind };
}
