import { describe, it, expect } from 'bun:test';
import { createTestApp, fetchJson } from './helpers';

describe('healthz', () => {
  it('returns ok with uptime', async () => {
    const { app } = createTestApp();
    const res = await fetchJson<{ status: string; uptimeSec: number }>(app, '/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptimeSec).toBeGreaterThanOrEqual(0);
  });
});
