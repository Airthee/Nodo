import { Hono } from 'hono';
import type { ShareStore } from '../db/share-store';
import type { SseHub } from '../services/sse-hub';
import { errorResponse } from './errors';

export function shareRoutes(store: ShareStore, hub: SseHub) {
  const app = new Hono();

  app.delete('/:shareId', (c) => {
    const shareId = c.req.param('shareId');
    const result = store.deleteShare(shareId);

    if (result.alreadyDeleted) {
      return errorResponse(c, 410, 'share_deleted', 'share has been deleted');
    }

    void (async () => {
      try {
        await hub.publish(shareId, { type: 'shareDeleted' });
      } finally {
        hub.closeAll(shareId);
      }
    })();

    return c.json({ ok: true }, 200);
  });

  return app;
}
