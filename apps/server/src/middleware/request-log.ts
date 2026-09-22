import type { Context, Next } from 'hono';
import { log } from '../services/logger';

export async function requestLog(c: Context, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const shareId = c.req.param('shareId');
  try {
    await next();
  } finally {
    log({
      level: 'info',
      msg: 'request',
      method,
      path,
      shareIdHash: shareId ? shareId.slice(0, 8) : undefined,
      status: c.res.status,
      durationMs: Date.now() - start,
    });
  }
}
