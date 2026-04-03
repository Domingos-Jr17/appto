import { describe, expect, test } from "bun:test";

import { PROMPT_VERSION, buildActionPrompt, buildSystemPrompt } from "@/lib/ai-prompts";

describe("ai prompts", () => {
  test("exposes a versioned prompt set", () => {
    expect(PROMPT_VERSION).toBe("v3.1");
  });

  test("includes anti-fabrication rules for references", () => {
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

  test("uses package-specific guidance for free users", () => {
    const prompt = buildSystemPrompt("FREE", undefined);

    expect(prompt).toContain("assistente educacional básico");
    expect(prompt).toContain("PROMPT_VERSION=v3.1");
  });
});
