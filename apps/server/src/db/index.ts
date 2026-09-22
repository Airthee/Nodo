import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export function openDatabase(path: string): Database {
  const db = new Database(path, { create: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA synchronous = NORMAL');
  runMigrations(db);
  return db;
}

function runMigrations(db: Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  const applied = new Set<string>(
    db
      .query<{ value: string }, []>("SELECT value FROM schema_meta WHERE key = 'applied_migrations'")
      .all()
      .flatMap((row) => row.value.split(',')),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    db.exec(sql);
    applied.add(file);
    newlyApplied.push(file);
  }

  if (newlyApplied.length > 0) {
    db.run(
      "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('applied_migrations', ?)",
      [Array.from(applied).join(',')],
    );
  }
}
