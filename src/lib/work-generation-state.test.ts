import { describe, expect, test } from "bun:test";

import {
  createProgressTracker,
  extractActiveSectionTitle,
  normalizeGenerationProgress,
  resolveGenerationSnapshot,
  resolveWorkspaceSectionState,
} from "@/lib/work-generation-state";

describe("work generation state", () => {
  test("clamps generating progress and terminal statuses", () => {
    expect(normalizeGenerationProgress("GENERATING", 2)).toBe(5);
    expect(normalizeGenerationProgress("GENERATING", 140)).toBe(99);
    expect(normalizeGenerationProgress("READY", 40)).toBe(100);
    expect(normalizeGenerationProgress("FAILED", 10)).toBe(100);
  });

  test("extracts active section title from step text", () => {
    expect(extractActiveSectionTitle("A gerar 2. Metodologia")).toBe("2. Metodologia");
    expect(extractActiveSectionTitle("A validar conteúdo")).toBeNull();
  });

  test("keeps progress stable between chunk updates", () => {
    const tracker = createProgressTracker(4);

    const first = tracker.advance();
    expect(first).toBeGreaterThan(10);
    expect(tracker.getCurrentProgress()).toBe(first);
    expect(tracker.getCurrentProgress()).toBe(first);

    const second = tracker.advance();
    expect(second).toBeGreaterThan(first);
  });

  test("derives active section and defaults from generation snapshot", () => {
    const snapshot = resolveGenerationSnapshot({
      liveJob: { status: "GENERATING", progress: 42, step: "A gerar 3. Metodologia" },
      fallbackStatus: "BRIEFING",
    });

    expect(snapshot.status).toBe("GENERATING");
    expect(snapshot.progress).toBe(42);
    expect(snapshot.activeSectionTitle).toBe("3. Metodologia");
  });

  test("derives workspace section state from canonical generation state", () => {
    expect(
      resolveWorkspaceSectionState({
        generationStatus: "GENERATING",
        activeSectionTitle: "2. Desenvolvimento",
        hasPersistedContent: false,
        title: "2. Desenvolvimento",
      }),
    ).toBe("generating");

    expect(
      resolveWorkspaceSectionState({
        generationStatus: "GENERATING",
        activeSectionTitle: "2. Desenvolvimento",
        hasPersistedContent: true,
        title: "2. Desenvolvimento",
      }),
    ).toBe("done");
  });
});
