import { Hono } from 'hono';
import type { Database } from 'bun:sqlite';
import { ShareStore } from './db/share-store';
import { SseHub } from './services/sse-hub';
import { requestLog } from './middleware/request-log';
import { validateShareId } from './middleware/share-id';
import { rateLimit, createRateLimiters, type RateLimiters } from './middleware/rate-limit';
import { opsRoutes } from './routes/ops';
import { snapshotRoutes } from './routes/snapshot';
import { shareRoutes } from './routes/share';
import { streamRoutes } from './routes/stream';
import type { TokenBucketConfig } from './services/rate-limit';

export interface AppOptions {
  db: Database;
  rateLimiters?: RateLimiters;
  rateLimit?: { perIp?: TokenBucketConfig; perShare?: TokenBucketConfig };
  startedAt?: number;
  gitSha?: string;
}

export interface AppHandle {
  app: Hono;
  store: ShareStore;
  hub: SseHub;
  limiters: RateLimiters;
}

export function buildApp(options: AppOptions): AppHandle {
  const store = new ShareStore(options.db);
  const hub = new SseHub();
  const limiters =
    options.rateLimiters ??
    createRateLimiters({
      perIp: options.rateLimit?.perIp,
      perShare: options.rateLimit?.perShare,
    });

  const app = new Hono();

  app.use('*', requestLog);

  const startedAt = options.startedAt ?? Date.now();
  app.get('/healthz', (c) => {
    return c.json({
      status: 'ok',
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      gitSha: options.gitSha ?? null,
    });
  });

  const shares = new Hono();
  shares.use('/:shareId', validateShareId);
  shares.use('/:shareId/*', validateShareId);
  shares.use('/:shareId', rateLimit(limiters));
  shares.use('/:shareId/*', rateLimit(limiters));

  shares.route('/', opsRoutes(store, hub));
  shares.route('/', snapshotRoutes(store));
  shares.route('/', shareRoutes(store, hub));
  shares.route('/', streamRoutes(store, hub));

  app.route('/shares', shares);

  return { app, store, hub, limiters };
}
