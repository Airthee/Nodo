import type { Context, Next } from 'hono';
import { TokenBucketLimiter, type TokenBucketConfig } from '../services/rate-limit';
import { errorResponse } from '../routes/errors';

export interface RateLimiters {
  perIp: TokenBucketLimiter;
  perShare: TokenBucketLimiter;
}

export function createRateLimiters(opts?: {
  perIp?: TokenBucketConfig;
  perShare?: TokenBucketConfig;
  now?: () => number;
}): RateLimiters {
  return {
    perIp: new TokenBucketLimiter(opts?.perIp ?? { capacity: 120, refillPerSecond: 2 }, opts?.now),
    perShare: new TokenBucketLimiter(opts?.perShare ?? { capacity: 60, refillPerSecond: 1 }, opts?.now),
  };
}

export function rateLimit(limiters: RateLimiters) {
  return async (c: Context, next: Next) => {
    const ip = clientIp(c);
    const ipResult = limiters.perIp.consume(`ip:${ip}`);
    if (!ipResult.ok) {
      c.header('Retry-After', String(ipResult.retryAfterSeconds));
      return errorResponse(c, 429, 'rate_limited', 'rate limit exceeded for this client');
    }

    const shareId = c.req.param('shareId');
    if (shareId) {
      const shareResult = limiters.perShare.consume(`share:${shareId}`);
      if (!shareResult.ok) {
        c.header('Retry-After', String(shareResult.retryAfterSeconds));
        return errorResponse(c, 429, 'rate_limited', 'rate limit exceeded for this share');
      }
    }

    return next();
  };
}

function clientIp(c: Context): string {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  return c.req.header('x-real-ip') ?? 'unknown';
}
