import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("@/lib/env", () => ({
  env: { isDevelopment: true },
}));
mock.module("@/lib/logger", () => ({
  logger: { warn: () => {}, info: () => {} },
}));

async function loadAiPrompts() {
  const mod = await import("@/lib/ai-prompts");
  return mod;
}

describe("ai prompts", () => {
  test("exposes a versioned prompt set", async () => {
    const { PROMPT_VERSION } = await loadAiPrompts();
    expect(PROMPT_VERSION).toBe("v3.1");
  });

  test("includes anti-fabrication rules for references", async () => {
    const { buildSystemPrompt, buildActionPrompt } = await loadAiPrompts();
    const systemPrompt = buildSystemPrompt("PRO", "HIGHER_EDUCATION");
    const prompt = buildActionPrompt({
      action: "references",
      text: "desemprego juvenil em Moçambique",
      mergedContext: "Curso: Economia",
      citationStyle: "ABNT",
    });

    expect(systemPrompt).toContain("Nunca invente dados");
    expect(prompt).toContain("Se não tiver dados suficientes");
  });

  test("uses package-specific guidance for free users", async () => {
    const { buildSystemPrompt } = await loadAiPrompts();
    const prompt = buildSystemPrompt("FREE", undefined);

    expect(prompt).toContain("assistente educacional básico");
    expect(prompt).toContain("PROMPT_VERSION=v3.1");
  });
});
