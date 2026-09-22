import { Hono } from 'hono';
import { SnapshotPutDtoSchema, type SnapshotDto } from '@nodo/shared';
import type { ShareStore } from '../db/share-store';
import { errorResponse } from './errors';

export function snapshotRoutes(store: ShareStore) {
  const app = new Hono();

  app.get('/:shareId/snapshot', (c) => {
    const shareId = c.req.param('shareId');
    const state = store.getShareState(shareId);
    if (state.kind === 'deleted') {
      return errorResponse(c, 410, 'share_deleted', 'share has been deleted');
    }

    const snapshot = store.getSnapshot(shareId);
    if (!snapshot) {
      return errorResponse(c, 404, 'invalid_body', 'no snapshot uploaded yet');
    }

    const body: SnapshotDto = {
      seq: snapshot.seq,
      nonce: Buffer.from(snapshot.nonce).toString('base64'),
      ciphertext: Buffer.from(snapshot.ciphertext).toString('base64'),
      uploadedBy: snapshot.uploaded_by,
      uploadedAt: snapshot.uploaded_at,
    };
    return c.json(body, 200);
  });

  app.put('/:shareId/snapshot', async (c) => {
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

    const parsed = SnapshotPutDtoSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(c, 400, 'invalid_body', 'invalid snapshot body', {
        issues: parsed.error.issues,
      });
    }

    const ciphertext = new Uint8Array(Buffer.from(parsed.data.ciphertext, 'base64'));
    const nonce = new Uint8Array(Buffer.from(parsed.data.nonce, 'base64'));

    const result = store.putSnapshot(
      shareId,
      parsed.data.expectedSeq,
      ciphertext,
      nonce,
      parsed.data.uploadedBy,
    );

    if (!result.ok) {
      if (result.reason === 'deleted') {
        return errorResponse(c, 410, 'share_deleted', 'share has been deleted');
      }
      return errorResponse(c, 409, 'snapshot_conflict', 'snapshot expectedSeq does not match', {
        currentSeq: result.currentSeq,
      });
    }

    return c.json({ ok: true }, 200);
  });

  return app;
}
