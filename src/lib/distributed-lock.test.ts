import { describe, expect, test } from "bun:test";

import { mock } from "bun:test";

mock.module("server-only", () => ({}));

async function loadMemoryLockManager() {
  const locksModule = await import("@/lib/distributed-lock");
  return locksModule.MemoryDistributedLockManager;
}

describe("MemoryDistributedLockManager", () => {
  test("prevents concurrent acquisition for the same key", async () => {
    const MemoryDistributedLockManager = await loadMemoryLockManager();
    const manager = new MemoryDistributedLockManager();

    const first = await manager.acquire("payment:1", 5_000);
    const second = await manager.acquire("payment:1", 5_000);

    expect(first.acquired).toBe(true);
    expect(second.acquired).toBe(false);

    await first.release();
  });

  test("allows reacquisition after release", async () => {
    const MemoryDistributedLockManager = await loadMemoryLockManager();
    const manager = new MemoryDistributedLockManager();

    const first = await manager.acquire("payment:1", 5_000);
    await first.release();
    const second = await manager.acquire("payment:1", 5_000);

    expect(second.acquired).toBe(true);

    await second.release();
  });
});
