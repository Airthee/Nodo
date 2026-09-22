import { describe, it, expect } from 'bun:test';
import {
  createTestApp,
  fetchJson,
  VALID_SHARE_ID,
  VALID_DEVICE_ID,
  VALID_DEVICE_ID_2,
  b64,
} from './helpers';
import type { OperationsPageDto, OperationBatchAckDto } from '@nodo/shared';

function buildBatch(deviceId: string, count: number, ciphertextPrefix = 'cipher') {
  return {
    operations: Array.from({ length: count }, (_, i) => ({
      deviceId,
      nonce: b64(`nonce${i}`),
      ciphertext: b64(`${ciphertextPrefix}-${i}`),
      clientTs: 1_700_000_000 + i,
    })),
  };
}

describe('POST /shares/:shareId/ops', () => {
  it('round-trips a single op', async () => {
    const { app } = createTestApp();
    const post = await fetchJson<OperationBatchAckDto>(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: buildBatch(VALID_DEVICE_ID, 1),
    });
    expect(post.status).toBe(200);
    expect(post.body.accepted).toEqual([{ seq: 1, clientTs: 1_700_000_000 }]);

    const get = await fetchJson<OperationsPageDto>(app, `/shares/${VALID_SHARE_ID}/ops?since=0`);
    expect(get.status).toBe(200);
    expect(get.body.operations).toHaveLength(1);
    expect(get.body.operations[0]!.seq).toBe(1);
    expect(get.body.operations[0]!.deviceId).toBe(VALID_DEVICE_ID);
    expect(get.body.highestSeq).toBe(1);
    expect(get.body.hasMore).toBe(false);
  });

  it('assigns monotonic seq for multiple ops in one batch', async () => {
    const { app } = createTestApp();
    const post = await fetchJson<OperationBatchAckDto>(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: buildBatch(VALID_DEVICE_ID, 5),
    });
    expect(post.status).toBe(200);
    expect(post.body.accepted.map((a) => a.seq)).toEqual([1, 2, 3, 4, 5]);
  });

  it('continues seq across batches and devices', async () => {
    const { app } = createTestApp();
    await fetchJson(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: buildBatch(VALID_DEVICE_ID, 3),
    });
    const second = await fetchJson<OperationBatchAckDto>(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: buildBatch(VALID_DEVICE_ID_2, 2, 'other'),
    });
    expect(second.body.accepted.map((a) => a.seq)).toEqual([4, 5]);
  });

  it('rejects malformed body', async () => {
    const { app } = createTestApp();
    const res = await fetchJson<{ code: string }>(app, `/shares/${VALID_SHARE_ID}/ops`, {
      method: 'POST',
      body: { wrong: true },
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_body');
  });

  it('returns empty page on unknown share', async () => {
    const { app } = createTestApp();
    const res = await fetchJson<OperationsPageDto>(app, `/shares/${'9'.repeat(32)}/ops?since=0`);
    expect(res.status).toBe(200);
    expect(res.body.operations).toHaveLength(0);
    expect(res.body.hasMore).toBe(false);
  });
});

describe('GET /shares/:shareId/ops?since= pagination', () => {
  it('caps the page at 1000 ops and signals hasMore', async () => {
    const { app } = createTestApp();
    // push in 4 batches of 500 = 2000 ops total
    for (let i = 0; i < 4; i += 1) {
      await fetchJson(app, `/shares/${VALID_SHARE_ID}/ops`, {
        method: 'POST',
        body: buildBatch(VALID_DEVICE_ID, 500, `batch-${i}`),
      });
    }

    const first = await fetchJson<OperationsPageDto>(app, `/shares/${VALID_SHARE_ID}/ops?since=0`);
    expect(first.status).toBe(200);
    expect(first.body.operations).toHaveLength(1000);
    expect(first.body.operations[0]!.seq).toBe(1);
    expect(first.body.operations[999]!.seq).toBe(1000);
    expect(first.body.highestSeq).toBe(1000);
    expect(first.body.hasMore).toBe(true);

    const next = await fetchJson<OperationsPageDto>(
      app,
      `/shares/${VALID_SHARE_ID}/ops?since=${first.body.highestSeq}`,
    );
    expect(next.body.operations).toHaveLength(1000);
    expect(next.body.operations[0]!.seq).toBe(1001);
    expect(next.body.operations[999]!.seq).toBe(2000);
    expect(next.body.hasMore).toBe(false);
  });
});
