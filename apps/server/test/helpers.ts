import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Hono } from 'hono';
import { buildApp, type AppHandle } from '../src/app';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'db', 'migrations');

export function createTestDb(): Database {
  const db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
  return db;
}

export function createTestApp(opts?: { generousLimits?: boolean }): AppHandle {
  return buildApp({
    db: createTestDb(),
    rateLimit: opts?.generousLimits === false
      ? { perIp: { capacity: 3, refillPerSecond: 0.001 } }
      : { perIp: { capacity: 10000, refillPerSecond: 1000 }, perShare: { capacity: 10000, refillPerSecond: 1000 } },
  });
}

export interface FetchJsonInit {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export async function fetchJson<T = unknown>(
  app: Hono,
  url: string,
  init?: FetchJsonInit,
): Promise<{ status: number; body: T; headers: Headers }> {
  const reqInit: RequestInit = {
    method: init?.method,
    headers: init?.headers,
  };
  if (init?.body !== undefined) {
    reqInit.body = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
    reqInit.headers = { 'content-type': 'application/json', ...(init.headers ?? {}) };
  }
  const res = await app.fetch(new Request(`http://test${url}`, reqInit));
  const text = await res.text();
  let body: unknown = text;
  if (text && res.headers.get('content-type')?.includes('application/json')) {
    body = JSON.parse(text);
  }
  return { status: res.status, body: body as T, headers: res.headers };
}

export const VALID_SHARE_ID = 'a'.repeat(32);
export const VALID_SHARE_ID_2 = 'b'.repeat(32);
export const VALID_DEVICE_ID = '11111111-1111-4111-8111-111111111111';
export const VALID_DEVICE_ID_2 = '22222222-2222-4222-8222-222222222222';

export function b64(s: string): string {
  return Buffer.from(s).toString('base64');
}
