import "server-only";

import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";
import { logOperationalEvent } from "@/lib/observability";
import { MemoryRateLimiter, RateLimitError, type RateLimitResult, type RateLimiter } from "@/lib/rate-limit-core";

class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = "rl",
  ) {}

  async limit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const namespacedKey = `${this.prefix}:${key}`;
    const count = await this.redis.incr(namespacedKey);

    if (count === 1) {
      await this.redis.expire(namespacedKey, Math.max(Math.ceil(windowMs / 1000), 1));
    }

    const ttlSeconds = await this.redis.ttl(namespacedKey);
    const resetAt = Date.now() + Math.max(ttlSeconds, 0) * 1000;

    return {
      allowed: count <= limit,
      current: count,
      remaining: Math.max(limit - count, 0),
      resetAt,
    };
  }
}

let cachedRateLimiter: RateLimiter | null = null;

function createRateLimiter(): RateLimiter {
  if (env.RATE_LIMIT_PROVIDER === "UPSTASH") {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });

    return new UpstashRateLimiter(redis);
  }

  return new MemoryRateLimiter();
}

export function getRateLimiter(): RateLimiter {
  if (!cachedRateLimiter) {
    cachedRateLimiter = createRateLimiter();
  }

  return cachedRateLimiter;
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const result = await getRateLimiter().limit(key, limit, windowMs);

  if (!result.allowed) {
    logOperationalEvent("rate_limit_blocked", { key, limit, windowMs, current: result.current }, "warn");
    throw new RateLimitError();
  }

  logOperationalEvent("rate_limit_allowed", {
    key,
    limit,
    windowMs,
    current: result.current,
    remaining: result.remaining,
    provider: env.RATE_LIMIT_PROVIDER,
  });

  return result;
}
