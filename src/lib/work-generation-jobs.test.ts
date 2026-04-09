import { describe, expect, mock, test } from "bun:test";

import type { SectionValidationIssue } from "@/lib/work-generation-prompts";
import type {
  SectionAttemptDiagnostics,
  SectionGenerationOutcome,
} from "@/lib/work-generation-jobs";

mock.module("server-only", () => ({}));

const {
  createSectionAttemptDiagnostics,
  getPendingGenerationTemplates,
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
});
