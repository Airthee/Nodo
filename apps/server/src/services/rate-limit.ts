export interface TokenBucketConfig {
  capacity: number;
  refillPerSecond: number;
}

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

export class TokenBucketLimiter {
  private buckets = new Map<string, BucketState>();

  constructor(private readonly config: TokenBucketConfig, private readonly now: () => number = Date.now) {}

  consume(key: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
    const t = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.config.capacity, lastRefillMs: t };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = (t - bucket.lastRefillMs) / 1000;
      bucket.tokens = Math.min(this.config.capacity, bucket.tokens + elapsed * this.config.refillPerSecond);
      bucket.lastRefillMs = t;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { ok: true };
    }

    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterSeconds = Math.max(1, Math.ceil(tokensNeeded / this.config.refillPerSecond));
    return { ok: false, retryAfterSeconds };
  }

  reset(): void {
    this.buckets.clear();
  }
}
