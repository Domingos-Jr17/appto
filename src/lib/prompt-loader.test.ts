import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("@/lib/env", () => ({
  env: { isDevelopment: true },
}));
mock.module("@/lib/logger", () => ({
  logger: { warn: () => {}, info: () => {} },
}));

async function loadPromptLoader() {
  const module = await import("@/lib/prompt-loader");
  return module;
}

describe("prompt loader", () => {
  test("returns null for non-existent files without throwing", async () => {
    const { getEducationPromptMarkdown } = await loadPromptLoader();
    const result = getEducationPromptMarkdown("NON_EXISTENT");
    expect(result).toBeNull();
  });

  test("clearPromptCache does not throw", async () => {
    const { clearPromptCache } = await loadPromptLoader();
    expect(() => clearPromptCache()).not.toThrow();
  });
});
