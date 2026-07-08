import fs from 'node:fs';
import path from 'node:path';
import { DB_FILE, rawDb } from '../db';

// Monthly SQLite backup: one file per calendar month in ./backups next to the
// database. Cheap because SQLite is a single file — checkpoint the WAL so the
// main file is complete, then copy it.
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_FILE), 'backups');

function monthTag(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function runBackupIfDue(): void {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const dest = path.join(BACKUP_DIR, `gym-${monthTag()}.db`);
    if (fs.existsSync(dest)) return; // already backed up this month
    rawDb.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(DB_FILE, dest);
    console.log(`Backup written: ${dest}`);
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

// Run at startup, then re-check daily so a machine left running for weeks still
// produces a backup when the month rolls over.
export function startBackups(): void {
  runBackupIfDue();
  setInterval(runBackupIfDue, 24 * 60 * 60 * 1000).unref();
}
