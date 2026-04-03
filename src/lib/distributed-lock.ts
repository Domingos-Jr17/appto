import "server-only";

import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

export interface LockHandle {
  acquired: boolean;
  release: () => Promise<void>;
}

export interface DistributedLockManager {
  acquire(key: string, ttlMs: number): Promise<LockHandle>;
}

const memoryLocks = new Map<string, { token: string; expiresAt: number }>();

export class MemoryDistributedLockManager implements DistributedLockManager {
  constructor(private readonly locks = memoryLocks) {}

  async acquire(key: string, ttlMs: number): Promise<LockHandle> {
    const now = Date.now();
    const current = this.locks.get(key);

    if (current && current.expiresAt > now) {
      return {
        acquired: false,
        release: async () => {},
      };
    }

    const token = randomUUID();
    this.locks.set(key, { token, expiresAt: now + ttlMs });

    return {
      acquired: true,
      release: async () => {
        const latest = this.locks.get(key);
        if (latest?.token === token) {
          this.locks.delete(key);
        }
      },
    };
  }
}

class UpstashDistributedLockManager implements DistributedLockManager {
  private readonly releaseScript;

  constructor(
    private readonly redis: Redis,
    private readonly prefix = "lock",
  ) {
    this.releaseScript = this.redis.createScript<number>(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    );
  }

  async acquire(key: string, ttlMs: number): Promise<LockHandle> {
    const namespacedKey = `${this.prefix}:${key}`;
    const token = randomUUID();
    const acquired = await this.redis.set(namespacedKey, token, {
      nx: true,
      px: ttlMs,
    });

    if (acquired !== "OK") {
      return {
        acquired: false,
        release: async () => {},
      };
    }

    return {
      acquired: true,
      release: async () => {
        await this.releaseScript.exec([namespacedKey], [token]);
      },
    };
  }
}

let cachedLockManager: DistributedLockManager | null = null;

function createDistributedLockManager(): DistributedLockManager {
  if (env.RATE_LIMIT_PROVIDER === "UPSTASH") {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });

    return new UpstashDistributedLockManager(redis);
  }

  return new MemoryDistributedLockManager();
}

export function getDistributedLockManager(): DistributedLockManager {
  if (!cachedLockManager) {
    cachedLockManager = createDistributedLockManager();
  }

  return cachedLockManager;
}

export async function withDistributedLock<T>(
  key: string,
  ttlMs: number,
  action: () => Promise<T>,
  errorMessage = "Operação já em curso. Aguarde alguns instantes.",
): Promise<T> {
  const handle = await getDistributedLockManager().acquire(key, ttlMs);

  if (!handle.acquired) {
    throw new Error(errorMessage);
  }

  try {
    return await action();
  } finally {
    await handle.release();
  }
}
