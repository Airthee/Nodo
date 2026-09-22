import { Hono } from 'hono';
import {
  OperationBatchDtoSchema,
  type OperationBatchAckDto,
  type OperationsPageDto,
  type StoredOperationDto,
} from '@nodo/shared';
import type { ShareStore, StoredOpRow } from '../db/share-store';
import type { SseHub } from '../services/sse-hub';
import { errorResponse } from './errors';

const MAX_PAGE = 1000;

export function opsRoutes(store: ShareStore, hub: SseHub) {
  const app = new Hono();

  app.post('/:shareId/ops', async (c) => {
    const shareId = c.req.param('shareId');
    const state = store.getShareState(shareId);
    if (state.kind === 'deleted') {
      return errorResponse(c, 410, 'share_deleted', 'share has been deleted');
    }

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return errorResponse(c, 400, 'invalid_body', 'body must be valid JSON');
    }

    const parsed = OperationBatchDtoSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(c, 400, 'invalid_body', 'invalid operation batch', {
        issues: parsed.error.issues,
      });
    }

    const ops = parsed.data.operations.map((op) => ({
      deviceId: op.deviceId,
      nonce: base64ToBytes(op.nonce),
      ciphertext: base64ToBytes(op.ciphertext),
      clientTs: op.clientTs,
    }));

    const { accepted, serverOps } = store.appendOps(shareId, ops);

    void Promise.all(
      serverOps.map((row) => hub.publish(shareId, { type: 'op', op: rowToDto(row) })),
    );

    const ack: OperationBatchAckDto = { accepted };
    return c.json(ack, 200);
  });

  app.get('/:shareId/ops', (c) => {
    const shareId = c.req.param('shareId');
    const state = store.getShareState(shareId);
    if (state.kind === 'deleted') {
      return errorResponse(c, 410, 'share_deleted', 'share has been deleted');
    }

    const sinceParam = c.req.query('since') ?? '0';
    const since = Number.parseInt(sinceParam, 10);
    if (!Number.isFinite(since) || since < 0) {
      return errorResponse(c, 400, 'invalid_body', 'since must be a non-negative integer');
    }

    const rows = store.getOpsSince(shareId, since, MAX_PAGE);
    const operations = rows.map(rowToDto);
    const highestSeq = operations.length > 0 ? operations[operations.length - 1]!.seq : since;
    const hasMore = operations.length === MAX_PAGE && store.getMaxSeq(shareId) > highestSeq;

    const body: OperationsPageDto = { operations, highestSeq, hasMore };
    return c.json(body, 200);
  });

  return app;
}

export function rowToDto(row: StoredOpRow): StoredOperationDto {
  return {
    seq: row.seq,
    deviceId: row.device_id,
    nonce: bytesToBase64(row.nonce),
    ciphertext: bytesToBase64(row.ciphertext),
    clientTs: row.client_ts,
    serverTs: row.server_ts,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}
