import { describe, expect, test } from "bun:test";

import {
  buildReferenceReviewNotice,
  extractInlineCitationKeys,
  hasReferenceSensitiveSignals,
  isReferenceReviewNotice,
  normalizeReferenceEntries,
  resolveReferenceSectionData,
} from "@/lib/reference-section";

describe("reference section", () => {
  test("deduplicates and sanitizes assisted references", () => {
    const entries = normalizeReferenceEntries(`
      Fontes académicas encontradas automaticamente:
      1. COUTO, 2020. Título Um.
      2. COUTO, 2020. Título Um.
      - SANTOS, 2021. Título Dois.
    `);

    expect(entries).toEqual([
      "COUTO, 2020. Título Um.",
      "SANTOS, 2021. Título Dois.",
    ]);
  });

  test("preserves user references and appends unique assisted references", () => {
    const resolved = resolveReferenceSectionData({
      educationLevel: "SECONDARY",
      userReferences: "COUTO, 2020. Título Um.",
      assistedReferences: "1. COUTO, 2020. Título Um.\n2. SANTOS, 2021. Título Dois.",
    });

    expect(resolved.status).toBe("USER_PROVIDED");
    expect(resolved.entries).toEqual([
      "COUTO, 2020. Título Um.",
      "SANTOS, 2021. Título Dois.",
    ]);
  });

  test("uses assisted references when user did not provide sources", () => {
    const resolved = resolveReferenceSectionData({
      educationLevel: "TECHNICAL",
      assistedReferences: "SANTOS, 2021. Título Dois.\nLOPES, 2024. Título Três.",
    });

    expect(resolved.status).toBe("AUTO_FILLED");
    expect(resolved.content).toContain("SANTOS, 2021. Título Dois.");
    expect(resolved.content).toContain("LOPES, 2024. Título Três.");
  });

  test("creates explicit review notice when no references are available", () => {
    const resolved = resolveReferenceSectionData({
      educationLevel: "SECONDARY",
      generatedSections: [
        {
          title: "2. Desenvolvimento",
          content:
            "Segundo a Teoria Nebular, a Terra formou-se há cerca de 4,6 mil milhões de anos. A experiência de Miller-Urey, em 1953, mostrou a formação de aminoácidos.",
        },
      ],
    });

    expect(resolved.status).toBe("NEEDS_REVIEW");
    expect(isReferenceReviewNotice(resolved.content)).toBe(true);
    expect(resolved.message).toContain("afirmações factuais");
  });

  test("extracts inline citations and includes them in the review notice", () => {
    const citations = extractInlineCitationKeys([
      {
        title: "4. Discussão",
        content:
          "A análise confirma a tendência descrita por Matusse (2022) e reforça a leitura de (Cossa; Tembe, 2021) e (Mondlane, 2022a).",
      },
    ]);

    expect(citations).toEqual([
      "Cossa; Tembe, 2021",
      "Matusse, 2022",
      "Mondlane, 2022a",
    ]);

    const resolved = resolveReferenceSectionData({
      educationLevel: "HIGHER_EDUCATION",
      generatedSections: [
        {
          title: "4. Discussão",
          content:
            "A análise confirma a tendência descrita por Matusse (2022) e reforça a leitura de (Cossa; Tembe, 2021).",
        },
      ],
    });

    expect(resolved.status).toBe("NEEDS_REVIEW");
    expect(resolved.content).toContain("Citações detectadas no texto");
    expect(resolved.content).toContain("Matusse, 2022");
  });

  test("detects factual sensitivity in generated content", () => {
    expect(
      hasReferenceSensitiveSignals(
        "Segundo a teoria da evolução química, em 1953 a experiência de Miller-Urey produziu aminoácidos.",
      ),
    ).toBe(true);

    expect(
      hasReferenceSensitiveSignals(
        "O tema é importante para os estudantes porque melhora a compreensão da realidade escolar.",
      ),
    ).toBe(false);
  });

  test("builds stable explicit manual review notice", () => {
    const message = buildReferenceReviewNotice();

    expect(message).toContain("Pendência de revisão manual");
    expect(isReferenceReviewNotice(message)).toBe(true);
  });
});
