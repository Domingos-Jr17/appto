"use client";

import { useEffect, useMemo } from "react";
import { formatRelativeTime } from "./workspace-mappers";
import type { WorkspaceConversationItem } from "./workspace-types";
import { useWorkspaceConversationsStore } from "@/stores/workspace-conversations-store";

interface UseWorkspaceConversationsOptions {
  projectId: string;
  derivedConversations: WorkspaceConversationItem[];
  search: string;
}

export function useWorkspaceConversations({
  projectId,
  derivedConversations,
  search,
}: UseWorkspaceConversationsOptions) {
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

  useEffect(() => {
    if (!projectId || derivedConversations.length === 0) return;
    store.syncDerivedConversations(projectId, derivedConversations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedConversations.length, projectId, store.syncDerivedConversations]);

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
