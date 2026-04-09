import { describe, expect, test } from "bun:test";

import { shouldRefetchProjectOnGenerationEvent } from "@/lib/generation-stream-events";

describe("generation stream event policy", () => {
  test("refetches only on milestone events", () => {
    expect(shouldRefetchProjectOnGenerationEvent("progress")).toBe(false);
    expect(shouldRefetchProjectOnGenerationEvent("content-chunk")).toBe(false);
    expect(shouldRefetchProjectOnGenerationEvent("section-complete")).toBe(true);
    expect(shouldRefetchProjectOnGenerationEvent("complete")).toBe(true);
  });
});
