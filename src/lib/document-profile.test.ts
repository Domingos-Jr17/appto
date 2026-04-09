import { describe, expect, test } from "bun:test";

import {
  normalizeWorkDocumentInput,
  resolveDocumentProfile,
  resolveDocumentReferenceMeta,
} from "@/lib/document-profile";

describe("document profile", () => {
  test("keeps secondary profile consistent even for university institution names", () => {
    const profile = resolveDocumentProfile({
      type: "HIGHER_EDUCATION_WORK",
      educationLevel: "SECONDARY",
      institutionName: "Universidade Eduardo Mondlane",
      coverTemplate: "UEM_STANDARD",
    });

    expect(profile.educationLevel).toBe("SECONDARY");
    expect(profile.projectType).toBe("SECONDARY_WORK");
    expect(profile.coverTemplate).toBe("SCHOOL_MOZ");
    expect(profile.frontMatterSections.map((section) => section.title)).toEqual([
      "Capa",
      "Índice",
    ]);
  });

  test("recognizes institutional higher-education templates when compatible", () => {
    const profile = resolveDocumentProfile({
      type: "HIGHER_EDUCATION_WORK",
      institutionName: "Universidade Eduardo Mondlane",
    });

    expect(profile.educationLevel).toBe("HIGHER_EDUCATION");
    expect(profile.coverTemplate).toBe("UEM_STANDARD");
    expect(profile.frontMatterPolicy.includeTitlePage).toBe(true);
    expect(profile.frontMatterPolicy.includeSummary).toBe(true);
  });

  test("normalizes inconsistent work input before persistence", () => {
    const normalized = normalizeWorkDocumentInput({
      type: "HIGHER_EDUCATION_WORK",
      brief: {
        educationLevel: "TECHNICAL",
        institutionName: "Instituto Industrial de Maputo",
        coverTemplate: "UEM_STANDARD",
      },
    });

    expect(normalized.type).toBe("TECHNICAL_WORK");
    expect(normalized.brief.educationLevel).toBe("TECHNICAL");
    expect(normalized.brief.coverTemplate).toBe("DISCIPLINARY_MOZ");
  });

  test("builds profile-specific reference metadata", () => {
    expect(
      resolveDocumentReferenceMeta(
        resolveDocumentProfile({ type: "SECONDARY_WORK" }),
        { className: "10ª", turma: "A", studentNumber: "12" },
      ),
    ).toBe("10ª • Turma A • 12");
  });
});
