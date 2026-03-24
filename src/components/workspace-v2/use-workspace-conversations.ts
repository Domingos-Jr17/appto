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
  const projectState = useWorkspaceConversationsStore(
    (state) =>
      state.projects[projectId] ?? {
        items: [],
        activeConversationId: "",
      }
  );
  const syncDerivedConversations = useWorkspaceConversationsStore(
    (state) => state.syncDerivedConversations
  );
  const setActiveConversation = useWorkspaceConversationsStore(
    (state) => state.setActiveConversation
  );
  const renameConversation = useWorkspaceConversationsStore(
    (state) => state.renameConversation
  );
  const togglePinConversation = useWorkspaceConversationsStore(
    (state) => state.togglePinConversation
  );
  const hideConversation = useWorkspaceConversationsStore((state) => state.hideConversation);

  useEffect(() => {
    if (!projectId || derivedConversations.length === 0) return;
    syncDerivedConversations(projectId, derivedConversations);
  }, [derivedConversations, projectId, syncDerivedConversations]);

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

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversation: (conversationId: string) => setActiveConversation(projectId, conversationId),
    renameConversation: (conversationId: string, title: string) =>
      renameConversation(projectId, conversationId, title),
    togglePinConversation: (conversationId: string) =>
      togglePinConversation(projectId, conversationId),
    hideConversation: (conversationId: string) => hideConversation(projectId, conversationId),
  };
}
