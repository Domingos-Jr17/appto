import { describe, expect, test } from "bun:test";
import {
  hideProjectConversation,
  mergeProjectConversations,
  renameProjectConversation,
  toggleProjectConversationPin,
} from "@/stores/workspace-conversations-store";
import type { PersistedWorkspaceConversation, WorkspaceConversationItem } from "@/components/workspace-v2/workspace-types";

const derived: WorkspaceConversationItem[] = [
  {
    id: "project-p1",
    title: "Workspace principal",
    subtitle: "Projecto actual",
    updatedAt: "2026-03-24T10:00:00.000Z",
    updatedLabel: "agora",
    pinned: true,
    kind: "project",
    sectionId: "s1",
  },
  {
    id: "assistant-m1",
    title: "Outline sugerido",
    subtitle: "Resposta recente do assistente",
    updatedAt: "2026-03-24T10:05:00.000Z",
    updatedLabel: "agora",
    kind: "assistant",
  },
];

describe("workspace conversations store helpers", () => {
  test("merges derived items with persisted metadata", () => {
    const existing: PersistedWorkspaceConversation[] = [
      {
        id: "project-p1",
        title: "Workspace principal",
        customTitle: "Meu workspace",
        subtitle: "Projecto actual",
        updatedAt: "2026-03-23T10:00:00.000Z",
        pinned: true,
        kind: "project",
        sectionId: "s1",
      },
    ];

    const merged = mergeProjectConversations(existing, derived);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.customTitle).toBe("Meu workspace");
    expect(merged.some((item) => item.id === "assistant-m1")).toBe(true);
  });

  test("renames a conversation using custom title", () => {
    const renamed = renameProjectConversation(
      mergeProjectConversations([], derived),
      "assistant-m1",
      "Resposta final"
    );
    expect(renamed.find((item) => item.id === "assistant-m1")?.customTitle).toBe("Resposta final");
  });

  test("toggles pin and reorders conversations", () => {
    const toggled = toggleProjectConversationPin(mergeProjectConversations([], derived), "assistant-m1");
    expect(toggled[0]?.id).toBe("assistant-m1");
    expect(toggled[0]?.pinned).toBe(true);
  });

  test("marks a conversation as hidden instead of deleting source metadata", () => {
    const hidden = hideProjectConversation(mergeProjectConversations([], derived), "assistant-m1");
    expect(hidden.find((item) => item.id === "assistant-m1")?.hidden).toBe(true);
  });

  test("prunes stale visible items that disappear from derived conversations", () => {
    const existing: PersistedWorkspaceConversation[] = [
      {
        id: "project-p1",
        title: "Workspace principal",
        subtitle: "Sessão actual",
        updatedAt: "2026-03-24T10:00:00.000Z",
        pinned: true,
        kind: "project",
        sectionId: "s1",
      },
      {
        id: "assistant-old",
        title: "Resposta antiga",
        subtitle: "Resposta recente do assistente",
        updatedAt: "2026-03-24T09:00:00.000Z",
        kind: "assistant",
      },
    ];

    const merged = mergeProjectConversations(existing, derived.filter((item) => item.id === "project-p1"));

    expect(merged.map((item) => item.id)).toEqual(["project-p1"]);
  });

  test("keeps hidden items out of view but preserved in storage metadata", () => {
    const existing: PersistedWorkspaceConversation[] = [
      {
        id: "assistant-hidden",
        title: "Resposta escondida",
        subtitle: "Resposta recente do assistente",
        updatedAt: "2026-03-24T09:00:00.000Z",
        kind: "assistant",
        hidden: true,
      },
    ];

    const merged = mergeProjectConversations(existing, derived.filter((item) => item.id === "project-p1"));

    expect(merged.some((item) => item.id === "assistant-hidden" && item.hidden)).toBe(true);
  });
});
