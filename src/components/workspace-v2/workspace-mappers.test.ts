import { describe, expect, test } from "bun:test";
import { buildArtifactSource, buildCodeLines, buildWorkspaceConversations, getPreferredSectionId } from "@/components/workspace-v2/workspace-mappers";
import type { AssistantMessage, Project, Section } from "@/types/editor";

const now = new Date("2026-03-24T10:00:00.000Z");

const project: Project = {
  id: "p1",
  title: "Analise de UX para o novo workspace academico",
  description: "Projecto para testar o workspace em tres paineis.",
  type: "MONOGRAPHY",
  status: "IN_PROGRESS",
  wordCount: 340,
  resumeMode: "document",
  lastEditedSection: {
    id: "s2",
    title: "Metodologia",
    updatedAt: now.toISOString(),
  },
  sectionSummary: {
    empty: 1,
    started: 1,
    drafting: 1,
    review: 0,
    stale: 0,
  },
  sections: [],
};

const sections: Section[] = [
  {
    id: "s1",
    title: "Introducao",
    type: "chapter",
    parentId: null,
    order: 0,
    updatedAt: now.toISOString(),
    wordCount: 120,
    editorialStatus: "drafting",
    content: "## Introducao\n\nTexto inicial.",
    children: [],
  },
  {
    id: "s2",
    title: "Metodologia",
    type: "chapter",
    parentId: null,
    order: 1,
    updatedAt: now.toISOString(),
    wordCount: 0,
    editorialStatus: "empty",
    content: "",
    children: [],
  },
];

const chatMessages: AssistantMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "Ajuda-me a rever o outline.",
    createdAt: now,
  },
  {
    id: "m2",
    role: "assistant",
    content: "### Outline sugerido\n\n1. Introducao\n2. Metodologia",
    createdAt: now,
  },
];

describe("workspace mappers", () => {
  test("prefers last edited section when available", () => {
    expect(getPreferredSectionId(project, sections)).toBe("s2");
  });

  test("builds workspace conversations from project, sections, and assistant messages", () => {
    const conversations = buildWorkspaceConversations(project, sections, chatMessages);

    expect(conversations[0]?.kind).toBe("project");
    expect(conversations[0]?.updatedAt).toBeTruthy();
    expect(conversations.some((conversation) => conversation.sectionId === "s1")).toBe(true);
    expect(conversations.some((conversation) => conversation.kind === "assistant")).toBe(true);
  });

  test("uses a stable fallback timestamp for a fresh session without last section", () => {
    const freshProject: Project = {
      ...project,
      lastEditedSection: null,
      description: null,
    };

    const conversations = buildWorkspaceConversations(freshProject, [], chatMessages);

    expect(conversations[0]?.updatedAt).toBe(now.toISOString());
    expect(conversations[0]?.subtitle).toBe("Workspace principal da sessão");
  });

  test("handles malformed section timestamps without breaking conversation mapping", () => {
    const malformedSections: Section[] = [
      {
        ...sections[0],
        updatedAt: "not-a-date",
      },
    ];

    const conversations = buildWorkspaceConversations(project, malformedSections, chatMessages);

    expect(conversations.find((conversation) => conversation.kind === "section")?.updatedAt).toBe(
      new Date(0).toISOString()
    );
  });

  test("uses active section as artifact source before falling back to assistant content", () => {
    const fromSection = buildArtifactSource(project, sections[0], null, chatMessages);
    expect(fromSection.source).toBe("section");
    expect(fromSection.title).toBe("Introducao");

    const fromAssistant = buildArtifactSource(project, null, null, chatMessages);
    expect(fromAssistant.source).toBe("assistant");
  });

  test("uses selected assistant conversation as artifact source", () => {
    const conversations = buildWorkspaceConversations(project, sections, chatMessages);
    const assistantConversation = conversations.find((conversation) => conversation.kind === "assistant") || null;

    const artifact = buildArtifactSource(project, null, assistantConversation, chatMessages);

    expect(artifact.source).toBe("assistant");
    expect(artifact.title).toBe("Proposta do assistente");
  });

  test("splits code view into stable numbered lines", () => {
    expect(buildCodeLines("linha 1\r\nlinha 2")).toEqual(["linha 1", "linha 2"]);
  });
});
