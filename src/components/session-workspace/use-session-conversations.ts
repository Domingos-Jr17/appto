"use client";

import { useEffect, useMemo, useRef } from "react";
import { formatRelativeTime } from "./mappers";
import type { WorkspaceConversationItem } from "./types";
import { useWorkspaceConversationsStore } from "@/stores/workspace-conversations-store";

interface UseSessionConversationsOptions {
  projectId: string;
  derivedConversations: WorkspaceConversationItem[];
  search: string;
}

export function useSessionConversations({
  projectId,
  derivedConversations,
  search,
}: UseSessionConversationsOptions) {
  const store = useWorkspaceConversationsStore();

  const projectState = useMemo(
    () => store.projects[projectId] ?? { items: [], activeConversationId: "" },
    [store.projects, projectId]
  );

  const allConversations = useMemo(
    () =>
      projectState.items
        .filter((item) => !item.hidden)
        .map((item) => ({
          ...item,
          title: item.customTitle || item.title,
          updatedLabel: formatRelativeTime(item.updatedAt),
        })),
    [projectState.items]
  );

  const normalizedSearch = search.trim().toLowerCase();
  const conversations = useMemo(() => {
    if (!normalizedSearch) return allConversations;

    return allConversations.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.subtitle.toLowerCase().includes(normalizedSearch)
    );
  }, [allConversations, normalizedSearch]);

  const activeConversationId =
    conversations.some((item) => item.id === projectState.activeConversationId)
      ? projectState.activeConversationId
      : conversations[0]?.id || "";

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) || null;

  const prevDerivedRef = useRef<string>("");

  useEffect(() => {
    if (!projectId || derivedConversations.length === 0) return;
    const currentKey = derivedConversations
      .map((item) => `${item.id}:${item.updatedAt}`)
      .join(",");
    if (currentKey === prevDerivedRef.current) return;
    prevDerivedRef.current = currentKey;
    store.syncDerivedConversations(projectId, derivedConversations);
  }, [derivedConversations, projectId, store]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversation: (conversationId: string) => store.setActiveConversation(projectId, conversationId),
    renameConversation: (conversationId: string, title: string) =>
      store.renameConversation(projectId, conversationId, title),
    togglePinConversation: (conversationId: string) =>
      store.togglePinConversation(projectId, conversationId),
    hideConversation: (conversationId: string) => store.hideConversation(projectId, conversationId),
  };
}
