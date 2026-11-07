/**
 * src/world-aethelgrad/server/security/rate-limiter.ts
 * Sliding-Window Rate Limiter untuk melindungi Endpoint Auth & Gacha Aethelgrad.
 */

interface WindowBucket {
  timestamps: number[];
}

const buckets = new Map<string, WindowBucket>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
  nowMs: number = Date.now()
): {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterMs: number;
} {
  const safeKey = String(key || 'anonymous').slice(0, 140);
  let bucket = buckets.get(safeKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(safeKey, bucket);
  }

  const cutoff = nowMs - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] ?? nowMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(100, oldest + windowMs - nowMs),
    };
  }

  bucket.timestamps.push(nowMs);
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - bucket.timestamps.length),
    retryAfterMs: 0,
  };
}

export function resetRateLimiter(): void {
  buckets.clear();
}
