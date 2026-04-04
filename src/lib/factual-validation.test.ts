import { describe, expect, test } from "bun:test";

import { evaluateFactualValidation } from "@/lib/factual-validation";

describe("factual validation", () => {
  test("blocks unsupported reference generation without sources", () => {
    const result = evaluateFactualValidation({
      action: "references",
      text: "desemprego juvenil em moçambique",
      hasGroundedSources: false,
      hasReferenceSeed: false,
    });

    expect(result.blocked).toBe(true);
  });

  test("warns on factual claims without grounded sources", () => {
    const result = evaluateFactualValidation({
      action: "generate",
      text: "Quais são os dados estatísticos do INE sobre pobreza em Moçambique?",
      hasGroundedSources: false,
      hasReferenceSeed: false,
    });

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
