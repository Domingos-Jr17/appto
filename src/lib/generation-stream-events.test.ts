import { describe, expect, test } from "bun:test";

import {
  classifyGenerationStreamFailure,
  shouldRefetchProjectOnGenerationEvent,
} from "@/lib/generation-stream-events";

describe("generation stream event policy", () => {
  test("refetches only on milestone events", () => {
    expect(shouldRefetchProjectOnGenerationEvent("progress")).toBe(false);
    expect(shouldRefetchProjectOnGenerationEvent("content-chunk")).toBe(false);
    expect(shouldRefetchProjectOnGenerationEvent("section-complete")).toBe(true);
    expect(shouldRefetchProjectOnGenerationEvent("complete")).toBe(true);
  });

  test("treats a long-lived healthy stream closure as rotation instead of failure", () => {
    const decision = classifyGenerationStreamFailure({
      connectionStartedAt: 0,
      lastEventAt: 238_000,
      consecutiveFailures: 1,
      now: 240_000,
    });

    expect(decision.shouldReconnect).toBe(true);
    expect(decision.shouldFallbackToPolling).toBe(false);
    expect(decision.countsAsFailure).toBe(false);
    expect(decision.nextFailureCount).toBe(0);
  });

  test("falls back to polling only after repeated short failures without activity", () => {
    const decision = classifyGenerationStreamFailure({
      connectionStartedAt: 0,
      lastEventAt: 0,
      consecutiveFailures: 1,
      now: 4_000,
    });

    expect(decision.shouldReconnect).toBe(false);
    expect(decision.shouldFallbackToPolling).toBe(true);
    expect(decision.countsAsFailure).toBe(true);
    expect(decision.nextFailureCount).toBe(2);
  });
});
