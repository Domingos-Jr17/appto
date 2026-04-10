import { describe, expect, mock, test } from "bun:test";

import type { SectionValidationIssue } from "@/lib/work-generation-prompts";
import type {
  SectionAttemptDiagnostics,
  SectionGenerationOutcome,
} from "@/lib/work-generation-jobs";

mock.module("server-only", () => ({}));

const {
  buildSectionRepairPrompt,
  createSectionAttemptDiagnostics,
  getPendingGenerationTemplates,
  getSectionTemplates,
  resolveFinalReferenceSectionData,
  resolveReferencesSectionContent,
  shouldPersistStreamingPreview,
  shouldYieldGenerationPass,
  shouldRequireReferenceReview,
  resolveGenerationCompletionDecision,
  summarizeSectionGenerationAttempts,
} = await import("@/lib/work-generation-jobs");

function createValidationIssue(message: string): SectionValidationIssue {
  return {
    sectionTitle: "2. Desenvolvimento",
    message,
  };
}

describe("work generation jobs", () => {
  test("classifies validation rejection as usable degraded content", () => {
    const diagnostics = createSectionAttemptDiagnostics({
      attemptNumber: 1,
      content: "Palavra ".repeat(40).trim(),
      validationIssues: [createValidationIssue("A sec��o ficou curta.")],
    });

    expect(diagnostics.failureReason).toBe("validation_failed");
    expect(diagnostics.hadAnyContent).toBe(true);
    expect(diagnostics.wordCount).toBe(40);
    expect(diagnostics.validationIssues).toHaveLength(1);
  });

  test("distinguishes empty responses from provider errors", () => {
    const emptyResponse = createSectionAttemptDiagnostics({
      attemptNumber: 1,
      content: "",
    });
    const providerError = createSectionAttemptDiagnostics({
      attemptNumber: 1,
      content: "",
      error: new Error("timeout from provider"),
    });

    expect(emptyResponse.failureReason).toBe("empty_response");
    expect(providerError.failureReason).toBe("provider_error");
  });

  test("keeps fallback success from being treated as a full failure", () => {
    const attempts: SectionAttemptDiagnostics[] = [
      createSectionAttemptDiagnostics({
        attemptNumber: 1,
        content: "",
        error: new Error("timeout from provider"),
      }),
      createSectionAttemptDiagnostics({
        attemptNumber: 2,
        content: "Palavra ".repeat(220).trim(),
      }),
    ];

    const result = summarizeSectionGenerationAttempts(attempts);

    expect(result.accepted).toBe(true);
    expect(result.failureReason).toBeNull();
    expect(result.content).toContain("Palavra");
  });

  test("builds a repair prompt with healthy PT-MZ text", () => {
    const prompt = buildSectionRepairPrompt("Prompt base", "1. Introdução");

    expect(prompt).toContain('secção "1. Introdução"');
    expect(prompt).toContain("não cumpriu os requisitos");
    expect(prompt).not.toContain("sec��o");
  });

  test("throttles persisted streaming previews until the interval elapses", () => {
    expect(
      shouldPersistStreamingPreview({
        now: 1_000,
        lastPersistedAt: null,
      }),
    ).toBe(true);

    expect(
      shouldPersistStreamingPreview({
        now: 4_000,
        lastPersistedAt: 2_000,
        minIntervalMs: 3_000,
      }),
    ).toBe(false);

    expect(
      shouldPersistStreamingPreview({
        now: 5_500,
        lastPersistedAt: 2_000,
        minIntervalMs: 3_000,
      }),
    ).toBe(true);
  });

  test("marks all degraded sections as ready with review guidance", () => {
    const outcomes: SectionGenerationOutcome[] = [
      {
        title: "1. Introdu��o",
        accepted: false,
        degraded: true,
        hadAnyContent: true,
        failureReason: "validation_failed",
      },
      {
        title: "2. Desenvolvimento",
        accepted: false,
        degraded: true,
        hadAnyContent: true,
        failureReason: "validation_failed",
      },
    ];

    const decision = resolveGenerationCompletionDecision(outcomes);

    expect(decision.status).toBe("READY");
    expect(decision.shouldRefund).toBe(false);
    expect(decision.step).toContain("precisam");
  });

  test("marks fully unusable generations as failed and refundable", () => {
    const outcomes: SectionGenerationOutcome[] = [
      {
        title: "1. Introdu��o",
        accepted: false,
        degraded: false,
        hadAnyContent: false,
        failureReason: "provider_error",
      },
      {
        title: "2. Desenvolvimento",
        accepted: false,
        degraded: false,
        hadAnyContent: false,
        failureReason: "empty_response",
      },
    ];

    const decision = resolveGenerationCompletionDecision(outcomes);

    expect(decision.status).toBe("FAILED");
    expect(decision.shouldRefund).toBe(true);
    expect(decision.error).toContain("resposta");
  });

  test("keeps mixed usable and failed sections in ready state", () => {
    const outcomes: SectionGenerationOutcome[] = [
      {
        title: "1. Introdu��o",
        accepted: true,
        degraded: false,
        hadAnyContent: true,
        failureReason: null,
      },
      {
        title: "2. Desenvolvimento",
        accepted: false,
        degraded: false,
        hadAnyContent: false,
        failureReason: "provider_error",
      },
    ];

    const decision = resolveGenerationCompletionDecision(outcomes);

    expect(decision.status).toBe("READY");
    expect(decision.shouldRefund).toBe(false);
    expect(decision.step).toContain("conclu");
  });

  test("returns every pending template for a single worker pass", () => {
    const pending = getPendingGenerationTemplates(
      [
        { title: "1. Introdução", order: 1 },
        { title: "2. Desenvolvimento", order: 2 },
        { title: "3. Conclusão", order: 3 },
      ],
      [
        { title: "1. Introdução", content: "Conteúdo já existente" },
        { title: "2. Desenvolvimento", content: null },
        { title: "3. Conclusão", content: "" },
      ],
    );

    expect(pending.map((template) => template.title)).toEqual([
      "2. Desenvolvimento",
      "3. Conclusão",
    ]);
  });

  test("yields the worker before the runtime limit is reached", () => {
    expect(
      shouldYieldGenerationPass({
        passStartedAt: 0,
        now: 250_000,
      }),
    ).toBe(true);
  });

  test("keeps processing when there is still safe runtime budget", () => {
    expect(
      shouldYieldGenerationPass({
        passStartedAt: 0,
        now: 120_000,
      }),
    ).toBe(false);
  });

  test("derives section templates from the canonical secondary document profile", () => {
    const templates = getSectionTemplates("SECONDARY_WORK", "SECONDARY");

    expect(templates.map((template) => template.title)).toEqual([
      "1. Introdução",
      "2. Desenvolvimento",
      "3. Conclusão",
    ]);
  });

  test("uses trimmed references content when seeds are available", () => {
    expect(
      resolveReferencesSectionContent({
        educationLevel: "HIGHER_EDUCATION",
        referencesSeed: "  Autor, 2024. Obra.  ",
      }),
    ).toBe("Autor, 2024. Obra.");
  });

  test("requires manual reference review for non-secondary empty references", () => {
    expect(
      shouldRequireReferenceReview({
        educationLevel: "SECONDARY",
        referencesContent: "",
      }),
    ).toBe(true);

    expect(
      shouldRequireReferenceReview({
        educationLevel: "TECHNICAL",
        referencesContent: "",
      }),
    ).toBe(true);
  });

  test("requires manual reference review when secondary content contains factual signals without references", () => {
    expect(
      shouldRequireReferenceReview({
        educationLevel: "SECONDARY",
        referencesContent: "",
        generatedSections: [
          {
            title: "2. Desenvolvimento",
            content:
              "Segundo a Teoria Nebular, a Terra formou-se há cerca de 4,6 mil milhões de anos. A experiência de Miller-Urey, em 1953, mostrou a formação de aminoácidos em condições laboratoriais.",
          },
        ],
      }),
    ).toBe(true);
  });

  test("does not force manual reference review for descriptive secondary content without factual signals", () => {
    expect(
      shouldRequireReferenceReview({
        educationLevel: "SECONDARY",
        referencesContent: "COUTO, 2020. Título Um.",
        generatedSections: [
          {
            title: "1. Introdução",
            content:
              "O tema é importante para a escola porque ajuda os estudantes a compreender melhor a realidade e a desenvolver pensamento crítico.",
          },
        ],
      }),
    ).toBe(false);
  });

  test("resolves detected citations into real references before falling back to review notice", async () => {
    const resolved = await resolveFinalReferenceSectionData({
      projectTitle: "História da Cidade de Maputo",
      educationLevel: "HIGHER_EDUCATION",
      generatedSections: [
        {
          title: "2. Desenvolvimento",
          content:
            "A análise dialoga com Matusse (2022) e confirma tendências já observadas em (Cossa; Tembe, 2021).",
        },
      ],
      resolveAcademicReferences: async () => [
        {
          type: "article",
          authors: "Paula Cossa; Nelson Tembe",
          title: "Urbanização e memória histórica em Maputo",
          year: "2021",
          journal: "Revista Moçambicana de Estudos Urbanos",
          url: "https://example.com/cossa-tembe",
        },
      ],
    });

    expect(resolved.status).toBe("AUTO_FILLED");
    expect(resolved.content).toContain("Urbanização e memória histórica em Maputo");
    expect(resolved.content).not.toContain("Pendência de revisão manual");
  });

  test("keeps manual review fallback when detected citations cannot be resolved", async () => {
    const resolved = await resolveFinalReferenceSectionData({
      projectTitle: "História da Cidade de Maputo",
      educationLevel: "HIGHER_EDUCATION",
      generatedSections: [
        {
          title: "2. Desenvolvimento",
          content: "A análise dialoga com Matusse (2022).",
        },
      ],
      resolveAcademicReferences: async () => [],
    });

    expect(resolved.status).toBe("NEEDS_REVIEW");
    expect(resolved.content).toContain("Pendência de revisão manual");
    expect(resolved.content).toContain("Matusse, 2022");
  });
});
