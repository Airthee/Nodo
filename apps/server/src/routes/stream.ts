import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Subscriber } from '../services/sse-hub';
import type { SseHub } from '../services/sse-hub';
import type { ShareStore } from '../db/share-store';
import { errorResponse } from './errors';

const HEARTBEAT_MS = 15_000;

export function streamRoutes(store: ShareStore, hub: SseHub) {
  const app = new Hono();

  app.get('/:shareId/stream', (c) => {
    const shareId = c.req.param('shareId');
    const state = store.getShareState(shareId);
    if (state.kind === 'deleted') {
      return errorResponse(c, 410, 'share_deleted', 'share has been deleted');
    }

    return streamSSE(c, async (stream) => {
      let unsubscribe = () => {};
      let id = 0;
      let resolveDone: () => void = () => {};
      const done = new Promise<void>((resolve) => {
        resolveDone = resolve;
      });

      const sub: Subscriber = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        send: async (event) => {
          id += 1;
          if (event.type === 'op') {
            await stream.writeSSE({
              event: 'message',
              data: JSON.stringify(event.op),
              id: String(id),
            });
          } else {
            await stream.writeSSE({
              event: 'shareDeleted',
              data: JSON.stringify({ shareId }),
              id: String(id),
            });
          }
        },
        close: () => {
          unsubscribe();
          resolveDone();
        },
      };

      unsubscribe = hub.subscribe(shareId, sub);

      stream.onAbort(() => {
        unsubscribe();
        resolveDone();
      });

      await stream.writeSSE({ event: 'ready', data: JSON.stringify({ shareId }), id: '0' });

      while (!stream.aborted && !stream.closed) {
        const tick = new Promise<'tick'>((resolve) => setTimeout(() => resolve('tick'), HEARTBEAT_MS));
        const winner = await Promise.race([tick, done.then(() => 'done' as const)]);
        if (winner === 'done' || stream.aborted || stream.closed) break;
        try {
          await stream.writeSSE({ event: 'ping', data: '{}', id: String(++id) });
        } catch {
          break;
        }
      }

      unsubscribe();
    });
  });

  return app;
}
