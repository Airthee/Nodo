import { describe, it, expect } from 'bun:test';
import { createTestApp, fetchJson, VALID_SHARE_ID, VALID_DEVICE_ID, b64 } from './helpers';

describe('DELETE /shares/:shareId', () => {
  it('subsequent reads return 410', async () => {
    const { app } = createTestApp();
    await fetchJson(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: {
        operations: [
          { deviceId: VALID_DEVICE_ID, nonce: b64('n1'), ciphertext: b64('c1'), clientTs: 1 },
        ],
      },
    });

    const del = await fetchJson(app, `/shares/${VALID_SHARE_ID}`, { method: 'DELETE' });
    expect(del.status).toBe(200);

    for (const path of [`/shares/${VALID_SHARE_ID}/ops`, `/shares/${VALID_SHARE_ID}/snapshot`]) {
      const res = await fetchJson<{ code: string }>(app, path);
      expect(res.status).toBe(410);
      expect(res.body.code).toBe('share_deleted');
    }
  });

  it('subsequent writes return 410', async () => {
    const { app } = createTestApp();
    await fetchJson(app, `/shares/${VALID_SHARE_ID}`, { method: 'DELETE' });

    const post = await fetchJson(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: {
        operations: [
          { deviceId: VALID_DEVICE_ID, nonce: b64('n1'), ciphertext: b64('c1'), clientTs: 1 },
        ],
      },
    });
    expect(post.status).toBe(410);
  });

  it('deleting again returns 410', async () => {
    const { app } = createTestApp();
    const first = await fetchJson(app, `/shares/${VALID_SHARE_ID}`, { method: 'DELETE' });
    expect(first.status).toBe(200);
    const second = await fetchJson(app, `/shares/${VALID_SHARE_ID}`, { method: 'DELETE' });
    expect(second.status).toBe(410);
  });
});
