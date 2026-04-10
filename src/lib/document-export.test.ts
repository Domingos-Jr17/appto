import { describe, expect, test } from "bun:test";

import {
  DocumentExportService,
  formatReferenceEntry,
  getAbntChecklist,
  parseReferenceEntries,
  stripLeadingDuplicateHeading,
} from "@/lib/document-export";
import { buildReferenceReviewNotice } from "@/lib/reference-section";

describe("document export references", () => {
  test("formats book references in ABNT-like style", () => {
    const formatted = formatReferenceEntry({
      type: "book",
      authors: "Mia Couto",
      title: "Terra sonâmbula",
      year: "1992",
      publisher: "Ndjira",
    });

    expect(formatted).toContain("Mia Couto");
    expect(formatted).toContain("Terra sonâmbula");
    expect(formatted).toContain("1992");
  });

  test("parses JSON references and sorts them alphabetically", () => {
    const entries = parseReferenceEntries(
      JSON.stringify([
        { type: "book", authors: "Zeta Autor", title: "Livro B", year: "2020" },
        { type: "book", authors: "Ana Autor", title: "Livro A", year: "2021" },
      ]),
    );

    expect(entries[0]).toContain("Ana Autor");
    expect(entries[1]).toContain("Zeta Autor");
  });

  test("ignores explicit manual-review notices when parsing references", () => {
    expect(parseReferenceEntries(buildReferenceReviewNotice(true))).toEqual([]);
  });

  test("exposes template-specific ABNT checklist items", () => {
    const checklist = getAbntChecklist("UEM_STANDARD");

    expect(checklist.template).toBe("UEM_STANDARD");
    expect(checklist.items.some((item) => item.includes("Universidade Eduardo Mondlane"))).toBe(true);
  });

  test("filters front matter and humanizes project type in the export model", () => {
    const model = DocumentExportService.createModel({
      title: "A teoria da vida",
      description: null,
      type: "SECONDARY_WORK",
      brief: {
        educationLevel: "SECONDARY",
        coverTemplate: "SCHOOL_MOZ",
      },
      sections: [
        {
          id: "cover",
          title: "Capa",
          content: "<style>*{box-sizing:border-box;}</style>",
          order: 1,
        },
        {
          id: "title-page",
          title: "Folha de Rosto",
          content: "<div>Folha</div>",
          order: 2,
        },
        {
          id: "toc",
          title: "Índice",
          content: "",
          order: 3,
        },
        {
          id: "intro",
          title: "1. Introdução",
          content: "Conteúdo",
          order: 4,
        },
      ],
    });

    expect(model.type).toBe("Trabalho Escolar");
    expect(model.profile.coverTemplate).toBe("SCHOOL_MOZ");
    expect(model.frontMatterSections).toHaveLength(0);
    expect(model.sections.map((section) => section.title)).toEqual(["1. Introdução"]);
  });

  test("preserves front matter summaries separately from body sections", () => {
    const model = DocumentExportService.createModel({
      title: "Tema",
      description: null,
      type: "HIGHER_EDUCATION_WORK",
      brief: {
        educationLevel: "HIGHER_EDUCATION",
        institutionName: "Universidade Eduardo Mondlane",
      },
      sections: [
        { id: "cover", title: "Capa", content: "", order: 1 },
        { id: "summary", title: "Resumo", content: "Resumo formal.", order: 3 },
        { id: "intro", title: "1. Introdução", content: "Conteúdo", order: 6 },
      ],
    });

    expect(model.frontMatterSections.map((section) => section.title)).toEqual(["Resumo"]);
    expect(model.sections.map((section) => section.title)).toEqual(["1. Introdução"]);
  });

  test("strips a repeated heading from the beginning of exported section content", () => {
    const content = stripLeadingDuplicateHeading(
      "1. Introdução\n\nTexto final da introdução.",
      "1. Introdução",
    );

    expect(content).toBe("Texto final da introdução.");
  });

  test("strips a semantic duplicate heading even when numbering differs", () => {
    const content = stripLeadingDuplicateHeading(
      "Conclusão\n\nTexto final da conclusão.",
      "3. Conclusão",
    );

    expect(content).toBe("Texto final da conclusão.");
  });

  test("marks references as pending review when the section contains an explicit notice", () => {
    const reviewNotice = buildReferenceReviewNotice(true);
    const model = DocumentExportService.createModel({
      title: "Tema",
      description: null,
      type: "SECONDARY_WORK",
      brief: {
        educationLevel: "SECONDARY",
      },
      sections: [
        { id: "intro", title: "1. Introdução", content: "Conteúdo", order: 1 },
        { id: "refs", title: "Referências", content: reviewNotice, order: 2 },
      ],
    });

    expect(model.references.status).toBe("NEEDS_REVIEW");
    expect(model.references.content).toContain("Pendência");
  });
});
