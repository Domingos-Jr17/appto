import { describe, expect, test } from "bun:test";

import { getSectionsForEducationLevel } from "@/lib/project-templates";

describe("project templates", () => {
  test("returns normalized secondary section titles", () => {
    const sections = getSectionsForEducationLevel("SECONDARY", "SECONDARY_WORK");

    expect(sections.map((section) => section.title)).toContain("Índice");
    expect(sections.map((section) => section.title)).toContain("1. Introdução");
    expect(sections.map((section) => section.title)).toContain("3. Conclusão");
    expect(sections.some((section) => /Ã|Â|�/.test(section.title))).toBe(false);
  });

  test("returns normalized higher education section titles", () => {
    const sections = getSectionsForEducationLevel("HIGHER_EDUCATION", "HIGHER_EDUCATION_WORK");

    expect(sections.map((section) => section.title)).toContain("Índice");
    expect(sections.map((section) => section.title)).toContain("2. Revisão da Literatura");
    expect(sections.map((section) => section.title)).toContain("6. Recomendações");
    expect(sections.some((section) => /Ã|Â|�/.test(section.title))).toBe(false);
  });
});
