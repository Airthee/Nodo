import { describe, it, expect } from 'bun:test';
import { buildApp } from '../src/app';
import { createTestDb, VALID_SHARE_ID } from './helpers';

describe('rate limiting', () => {
  it('returns 429 with Retry-After when per-IP budget exceeded', async () => {
    const now = { value: 0 };
    const { app } = buildApp({
      db: createTestDb(),
      rateLimit: {
        perIp: { capacity: 2, refillPerSecond: 0.1 },
        perShare: { capacity: 1000, refillPerSecond: 1000 },
      },
    });

    const url = `http://test/shares/${VALID_SHARE_ID}/ops`;
    const a = await app.fetch(new Request(url));
    const b = await app.fetch(new Request(url));
    const c = await app.fetch(new Request(url));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(429);
    expect(c.headers.get('Retry-After')).not.toBeNull();
    void now;
  });
});
