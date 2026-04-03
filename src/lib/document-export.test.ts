import { describe, expect, test } from "bun:test";

import { formatReferenceEntry, getAbntChecklist, parseReferenceEntries } from "@/lib/document-export";

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
});
