import { describe, expect, test } from "bun:test";

import {
  buildGenerationSectionKey,
  buildTrackedSections,
  isTransientGenerationFailure,
} from "@/lib/generation/run-domain";

describe("generation run domain", () => {
  test("builds stable section keys from order and title", () => {
    expect(buildGenerationSectionKey({ title: "2. Revisão da Literatura", order: 7 })).toBe(
      "007:2-revisao-da-literatura",
    );
  });

  test("sorts tracked sections before assigning stable keys", () => {
    const sections = buildTrackedSections([
      { title: "Conclusão", order: 3 },
      { title: "Introdução", order: 1 },
    ]);

    expect(sections.map((item) => item.title)).toEqual(["Introdução", "Conclusão"]);
    expect(sections[0]?.stableKey).toBe("001:introducao");
  });

  test("classifies transient failures for worker retry model", () => {
    expect(isTransientGenerationFailure("Request timeout from provider")).toBe(true);
    expect(isTransientGenerationFailure("Validation error in prompt")).toBe(false);
  });
});
