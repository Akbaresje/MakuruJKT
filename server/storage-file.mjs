/**
 * File storage — for VPS / Railway / Fly / local use.
 * One json document, atomic writes, rolling timestamped backups.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { emptyState, normalizeData, BACKUP_KEEP } from './core.mjs';

export function createFileStorage({ dir, log = () => {}, backupEveryMs = 1000 * 60 * 60 * 6 }) {
  const STATE_FILE = path.join(dir, 'state.json');
  const BACKUP_DIR = path.join(dir, 'backups');

  let state = emptyState();
  let chain = Promise.resolve();
  let lastBackupAt = 0;

  async function init() {
    await fsp.mkdir(dir, { recursive: true });
    await fsp.mkdir(BACKUP_DIR, { recursive: true });
    try {
      const parsed = JSON.parse(await fsp.readFile(STATE_FILE, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || !parsed.data) throw new Error('bad shape');
      state = {
        version: Number(parsed.version) || 0,
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        data: normalizeData(parsed.data)
      };
      log('state loaded, version ' + state.version);
    } catch (e) {
      if (e.code !== 'ENOENT') log('state unreadable (' + e.message + '), starting empty');
      state = emptyState();
    }
  }

  function read() {
    return { version: state.version, createdAt: state.createdAt, updatedAt: state.updatedAt, data: state.data };
  }

  async function backup() {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fsp.writeFile(path.join(BACKUP_DIR, `state-${stamp}-v${state.version}.json`), JSON.stringify(state));
      const files = (await fsp.readdir(BACKUP_DIR)).filter((f) => f.startsWith('state-')).sort();
      while (files.length > BACKUP_KEEP) {
        await fsp.unlink(path.join(BACKUP_DIR, files.shift())).catch(() => {});
      }
    } catch (e) {
      log('backup failed: ' + e.message);
    }
  }

  function flush() {
    chain = chain.then(async () => {
      const tmp = STATE_FILE + '.tmp';
      const fh = await fsp.open(tmp, 'w');
      try {
        await fh.writeFile(JSON.stringify(state), 'utf8');
        await fh.sync();
      } finally {
        await fh.close();
      }
      await fsp.rename(tmp, STATE_FILE);

      const now = Date.now();
      if (state.version > 0 && (now - lastBackupAt > backupEveryMs || state.version % 25 === 0)) {
        lastBackupAt = now;
        await backup();
      }
    }).catch((e) => log('WRITE FAILED ' + e.message));
    return chain;
  }

  async function write(data, baseVersion) {
    if (baseVersion !== state.version) {
      return { ok: false, current: read() };
    }
    state = {
      version: state.version + 1,
      createdAt: state.createdAt,
      updatedAt: new Date().toISOString(),
      data
    };
    await flush();
    return { ok: true, version: state.version, updatedAt: state.updatedAt };
  }

  return { init, read, write, flush, file: STATE_FILE };
}
