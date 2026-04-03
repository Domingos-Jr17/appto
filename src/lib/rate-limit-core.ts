export interface RateLimitResult {
  allowed: boolean;
  current: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  limit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export class RateLimitError extends Error {
  constructor(message = "Demasiadas tentativas. Tente novamente em instantes.") {
    super(message);
    this.name = "RateLimitError";
  }
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export class MemoryRateLimiter implements RateLimiter {
  constructor(private readonly buckets = memoryBuckets) {}

  async limit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        current: 1,
        remaining: Math.max(limit - 1, 0),
        resetAt,
      };
    }

    const nextCount = existing.count + 1;
    existing.count = nextCount;

    return {
      allowed: nextCount <= limit,
      current: nextCount,
      remaining: Math.max(limit - nextCount, 0),
      resetAt: existing.resetAt,
    };
  }
}
