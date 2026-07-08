import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import { SCHEMA_SQL } from './schema-sql';

// Runtime uses the built-in node:sqlite driver (no native addon → packages
// cleanly into the single .exe). drizzle-kit (dev only) uses better-sqlite3.
export const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), 'gym.db');

export const rawDb = new DatabaseSync(DB_FILE);
rawDb.exec('PRAGMA journal_mode = WAL');
rawDb.exec('PRAGMA foreign_keys = ON');

// Self-initialize a fresh database file so the client needs no migration tool.
function initSchema(): void {
  const row = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gyms'").get();
  if (!row) rawDb.exec(SCHEMA_SQL);
}
initSchema();

export const db = drizzle(
  async (sql, params, method) => {
    const stmt = rawDb.prepare(sql);
    if (method === 'run') {
      stmt.run(...(params as never[]));
      return { rows: [] };
    }
    const rows = stmt.all(...(params as never[])).map((r) => Object.values(r as object));
    return method === 'get' ? { rows: rows[0] ?? [] } : { rows };
  },
  { schema },
);

// sqlite-proxy has no db.transaction(). node:sqlite is one synchronous
// connection, so BEGIN/COMMIT around drizzle calls is atomic. Serialized via a
// promise chain because a second BEGIN before COMMIT would throw.
// ponytail: serializes ALL transactions globally — fine for a single-gym local
// app; add per-scope locking only if write throughput ever matters.
let txChain: Promise<unknown> = Promise.resolve();

export function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    rawDb.exec('BEGIN');
    try {
      const result = await fn();
      rawDb.exec('COMMIT');
      return result;
    } catch (err) {
      rawDb.exec('ROLLBACK');
      throw err;
    }
  };
  const result = txChain.then(run, run);
  txChain = result.catch(() => {});
  return result;
}
