import { describe, expect, test } from "bun:test";

import {
  getGenerationPollingIntervalMs,
  shouldUseFastGenerationPolling,
} from "@/lib/generation-client-progress";

describe("generation client progress policy", () => {
  test("uses faster polling while the job is still in the initial queue or claim phase", () => {
    expect(shouldUseFastGenerationPolling("Na fila do worker")).toBe(true);
    expect(shouldUseFastGenerationPolling("Worker assumiu a geração")).toBe(true);
    expect(getGenerationPollingIntervalMs("Na fila do worker")).toBe(1000);
    expect(getGenerationPollingIntervalMs("Worker assumiu a geração")).toBe(1000);
  });

  test("uses regular polling once generation is already progressing", () => {
    expect(shouldUseFastGenerationPolling("A gerar 1. Introdução")).toBe(false);
    expect(getGenerationPollingIntervalMs("A gerar 1. Introdução")).toBe(3000);
    expect(getGenerationPollingIntervalMs("Trabalho pronto para revisão")).toBe(3000);
  });
});
