import { describe, it, expect } from 'bun:test';
import {
  createTestApp,
  fetchJson,
  VALID_SHARE_ID,
  VALID_DEVICE_ID,
  b64,
} from './helpers';
import type { SnapshotDto } from '@nodo/shared';

describe('snapshot CAS', () => {
  it('returns 404 when no snapshot uploaded', async () => {
    const { app } = createTestApp();
    const res = await fetchJson(app, `/shares/${VALID_SHARE_ID}/snapshot`);
    expect(res.status).toBe(404);
  });

  it('accepts a fresh snapshot at expectedSeq=0', async () => {
    const { app } = createTestApp();
    const put = await fetchJson(app, `/shares/${VALID_SHARE_ID}/snapshot`, {
      method: 'PUT',
      body: {
        expectedSeq: 0,
        nonce: b64('snap-nonce'),
        ciphertext: b64('snap-cipher'),
        uploadedBy: VALID_DEVICE_ID,
      },
    });
    expect(put.status).toBe(200);

    const get = await fetchJson<SnapshotDto>(app, `/shares/${VALID_SHARE_ID}/snapshot`);
    expect(get.status).toBe(200);
    expect(get.body.seq).toBe(0);
    expect(Buffer.from(get.body.ciphertext, 'base64').toString()).toBe('snap-cipher');
    expect(get.body.uploadedBy).toBe(VALID_DEVICE_ID);
  });

  it('returns 409 when expectedSeq does not match', async () => {
    const { app } = createTestApp();
    // Push 2 ops so maxSeq becomes 2
    await fetchJson(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: {
        operations: [
          { deviceId: VALID_DEVICE_ID, nonce: b64('n1'), ciphertext: b64('c1'), clientTs: 1 },
          { deviceId: VALID_DEVICE_ID, nonce: b64('n2'), ciphertext: b64('c2'), clientTs: 2 },
        ],
      },
    });

    const put = await fetchJson<{ code: string; details: { currentSeq: number } }>(
      app,
      `/shares/${VALID_SHARE_ID}/snapshot`,
      {
        method: 'PUT',
        body: {
          expectedSeq: 1,
          nonce: b64('snap-nonce'),
          ciphertext: b64('snap-cipher'),
          uploadedBy: VALID_DEVICE_ID,
        },
      },
    );
    expect(put.status).toBe(409);
    expect(put.body.code).toBe('snapshot_conflict');
    expect(put.body.details.currentSeq).toBe(2);
  });

  it('only first concurrent CAS write wins', async () => {
    const { app } = createTestApp();
    const body = {
      expectedSeq: 0,
      nonce: b64('snap-nonce'),
      ciphertext: b64('snap-cipher'),
      uploadedBy: VALID_DEVICE_ID,
    };
    const a = await fetchJson(app, `/shares/${VALID_SHARE_ID}/snapshot`, { method: 'PUT', body });
    expect(a.status).toBe(200);

    // Push an op so maxSeq becomes 1, breaking expectedSeq=0
    await fetchJson(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: {
        operations: [
          { deviceId: VALID_DEVICE_ID, nonce: b64('n1'), ciphertext: b64('c1'), clientTs: 1 },
        ],
      },
    });

    const b = await fetchJson(app, `/shares/${VALID_SHARE_ID}/snapshot`, { method: 'PUT', body });
    expect(b.status).toBe(409);
  });
});
