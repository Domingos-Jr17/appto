import { describe, expect, test } from "bun:test";

import { MemoryRateLimiter } from "@/lib/rate-limit-core";

describe("MemoryRateLimiter", () => {
  test("allows requests within the configured window", async () => {
    const limiter = new MemoryRateLimiter(new Map());

    const first = await limiter.limit("demo", 2, 60_000);
    const second = await limiter.limit("demo", 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  test("blocks requests after the limit is exceeded", async () => {
    const limiter = new MemoryRateLimiter(new Map());

    await limiter.limit("demo", 1, 60_000);
    const blocked = await limiter.limit("demo", 1, 60_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  test("resets after the window elapses", async () => {
    const limiter = new MemoryRateLimiter(new Map());

    await limiter.limit("demo", 1, 10);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const next = await limiter.limit("demo", 1, 10);

    expect(next.allowed).toBe(true);
    expect(next.remaining).toBe(0);
  });
});
