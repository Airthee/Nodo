import { describe, it, expect } from 'bun:test';
import { createTestApp, fetchJson, VALID_SHARE_ID } from './helpers';

describe('shareId validation', () => {
  it('rejects non-hex shareId on every endpoint', async () => {
    const { app } = createTestApp();
    const bad = 'not-a-hex-id';
    for (const path of [
      `/shares/${bad}/ops`,
      `/shares/${bad}/snapshot`,
      `/shares/${bad}/stream`,
      `/shares/${bad}`,
    ]) {
      const res = await fetchJson<{ code: string }>(app, path);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_share_id');
    }
  });

  it('accepts a valid 32-hex shareId', async () => {
    const { app } = createTestApp();
    const res = await fetchJson(app, `/shares/${VALID_SHARE_ID}/ops`);
    expect(res.status).toBe(200);
  });

  it('rejects too-short hex', async () => {
    const { app } = createTestApp();
    const res = await fetchJson(app, `/shares/${'a'.repeat(16)}/ops`);
    expect(res.status).toBe(400);
  });

  it('rejects uppercase hex', async () => {
    const { app } = createTestApp();
    const res = await fetchJson(app, `/shares/${'A'.repeat(32)}/ops`);
    expect(res.status).toBe(400);
  });
});
