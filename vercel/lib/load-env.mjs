/**
 * Minimal .env loader — no dependency.
 *
 * Reads `.env.local` first, then `.env`, both next to the project root.
 * Real environment variables always win, so Vercel-injected vars are never
 * overridden by a stray file. Values may be wrapped in single or double
 * quotes; `#` starts a comment only at the beginning of a line.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function loadEnv(dir, files = ['.env.local', '.env']) {
  const loaded = [];
  for (const name of files) {
    const file = join(dir, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m) continue;
      const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
      if (process.env[m[1]] === undefined) {
        process.env[m[1]] = value;
        loaded.push(m[1]);
      }
    }
  }
  return loaded;
}
