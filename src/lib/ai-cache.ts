import "server-only";

import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

interface CacheEntry {
  response: string;
  timestamp: number;
  hits: number;
}

const aiCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;
const CACHE_PREFIX = "ai-cache";
let redisSingleton: Redis | null = null;

function getRedis() {
  if (env.AI_CACHE_PROVIDER !== "UPSTASH") {
    return null;
  }

  if (!redisSingleton) {
    redisSingleton = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redisSingleton;
}

export function generateCacheKey(action: string, input: string): string {
  const normalizedInput = input.toLowerCase().trim().slice(0, 500);
  return `${action}:${hashString(normalizedInput)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return hash.toString(16);
}

export async function getCachedResponse(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    const entry = await redis.get<CacheEntry>(`${CACHE_PREFIX}:${key}`);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
      await redis.del(`${CACHE_PREFIX}:${key}`);
      return null;
    }

    await redis.set(`${CACHE_PREFIX}:${key}`, { ...entry, hits: entry.hits + 1 }, { px: CACHE_TTL });
    return entry.response;
  }

  const entry = aiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    aiCache.delete(key);
    return null;
  }

  entry.hits += 1;
  return entry.response;
}

export async function setCachedResponse(key: string, response: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(
      `${CACHE_PREFIX}:${key}`,
      { response, timestamp: Date.now(), hits: 0 },
      { px: CACHE_TTL },
    );
    return;
  }

  if (aiCache.size >= MAX_CACHE_SIZE) {
    evictOldEntries();
  }

  aiCache.set(key, {
    response,
    timestamp: Date.now(),
    hits: 0,
  });
}

function evictOldEntries(): void {
  const entries = Array.from(aiCache.entries()).sort((a, b) => a[1].hits - b[1].hits);
  const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);

  for (let i = 0; i < toRemove && i < entries.length; i += 1) {
    aiCache.delete(entries[i][0]);
  }
}

export async function getCacheStats() {
  const redis = getRedis();
  if (redis) {
    const keys = await redis.keys(`${CACHE_PREFIX}:*`);
    return {
      provider: "UPSTASH",
      size: keys.length,
      maxSize: null,
      entries: keys.slice(0, 25).map((key) => ({ key })),
    };
  }

  return {
    provider: "MEMORY",
    size: aiCache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(aiCache.entries()).map(([key, entry]) => ({
      key: key.slice(0, 20) + "...",
      hits: entry.hits,
      age: Math.round((Date.now() - entry.timestamp) / 1000 / 60),
    })),
  };
}

export async function clearCache(): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const keys = await redis.keys(`${CACHE_PREFIX}:*`);
    if (keys.length) {
      await redis.del(...keys);
    }
    return;
  }

  aiCache.clear();
}
