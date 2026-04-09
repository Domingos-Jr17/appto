import { describe, expect, test } from "bun:test";

import {
  DocumentExportService,
  formatReferenceEntry,
  getAbntChecklist,
  parseReferenceEntries,
  stripLeadingDuplicateHeading,
} from "@/lib/document-export";

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
        coverTemplate: "SCHOOL_MOZ",
      },
      sections: [
        { id: "cover", title: "Capa", content: "<style>*{box-sizing:border-box;}</style>", order: 1 },
        { id: "title-page", title: "Folha de Rosto", content: "<div>Folha</div>", order: 2 },
        { id: "intro", title: "1. Introdução", content: "Conteúdo", order: 3 },
      ],
    });

    expect(model.type).toBe("Trabalho Escolar");
    expect(model.sections.map((section) => section.title)).toEqual(["1. Introdução"]);
  });

  test("strips a repeated heading from the beginning of exported section content", () => {
    const content = stripLeadingDuplicateHeading(
      "1. Introdução\n\nTexto final da introdução.",
      "1. Introdução",
    );

    expect(content).toBe("Texto final da introdução.");
  });
});
