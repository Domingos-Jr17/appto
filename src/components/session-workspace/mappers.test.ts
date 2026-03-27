import { describe, expect, test } from "bun:test";
import { getPreferredSectionId } from "@/components/session-workspace/mappers";
import type { Project, Section } from "@/types/editor";

const now = new Date("2026-03-27T10:00:00.000Z");

const project: Project = {
  id: "p1",
  title: "Test Project",
  description: "Desc",
  type: "MONOGRAPHY",
  status: "IN_PROGRESS",
  wordCount: 340,
  resumeMode: "document",
  lastEditedSection: {
    id: "s2",
    title: "3. Metodologia",
    updatedAt: now.toISOString(),
  },
  sectionSummary: { empty: 1, started: 1, drafting: 1, review: 0, stale: 0 },
  sections: [],
};

const sections: Section[] = [
  {
    id: "s1",
    title: "Capa",
    type: "chapter",
    parentId: null,
    order: 0,
    updatedAt: now.toISOString(),
    wordCount: 0,
    editorialStatus: "empty",
    content: "",
    children: [],
  },
  {
    id: "s2",
    title: "1. Introdução",
    type: "chapter",
    parentId: null,
    order: 1,
    updatedAt: now.toISOString(),
    wordCount: 120,
    editorialStatus: "drafting",
    content: "intro text",
    children: [],
  },
  {
    id: "s3",
    title: "2. Revisão da Literatura",
    type: "chapter",
    parentId: null,
    order: 2,
    updatedAt: now.toISOString(),
    wordCount: 0,
    editorialStatus: "empty",
    content: "",
    children: [],
  },
];

describe("session-workspace mappers", () => {
  test("prefers last edited section when it still exists", () => {
    const projectWithExistingSection: Project = {
      ...project,
      lastEditedSection: {
        id: "s2",
        title: "1. Introdução",
        updatedAt: now.toISOString(),
      },
    };

    expect(getPreferredSectionId(projectWithExistingSection, sections)).toBe("s2");
  });

  test("falls back to first editable section when lastEditedSection does not exist", () => {
    const projectWithMissingSection: Project = {
      ...project,
      lastEditedSection: {
        id: "non-existent",
        title: "Missing",
        updatedAt: now.toISOString(),
      },
    };

    expect(getPreferredSectionId(projectWithMissingSection, sections)).toBe("s2");
  });

  test("skips front matter sections when no lastEditedSection", () => {
    const freshProject: Project = {
      ...project,
      lastEditedSection: null,
    };

    expect(getPreferredSectionId(freshProject, sections)).toBe("s2");
  });

  test("returns first section if no editable sections exist", () => {
    const nonEditableSections: Section[] = [
      { ...sections[0], title: "Capa" },
      { ...sections[1], title: "Referências" },
    ];

    const freshProject: Project = {
      ...project,
      lastEditedSection: null,
    };

    expect(getPreferredSectionId(freshProject, nonEditableSections)).toBe("s1");
  });

  test("returns null for empty sections", () => {
    expect(getPreferredSectionId(null, [])).toBeNull();
  });
});
