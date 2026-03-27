import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  PersistedWorkspaceConversation,
  WorkspaceConversationItem,
} from "@/components/session-workspace/types";

interface ProjectConversationState {
  items: PersistedWorkspaceConversation[];
  activeConversationId: string;
}

interface WorkspaceConversationsState {
  projects: Record<string, ProjectConversationState>;
  syncDerivedConversations: (projectId: string, derivedItems: WorkspaceConversationItem[]) => void;
  setActiveConversation: (projectId: string, conversationId: string) => void;
  renameConversation: (projectId: string, conversationId: string, title: string) => void;
  togglePinConversation: (projectId: string, conversationId: string) => void;
  hideConversation: (projectId: string, conversationId: string) => void;
  clearProjectConversations: (projectId: string) => void;
}

function normalizeDate(value?: string) {
  if (!value) return new Date(0).toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function sortConversations(conversations: PersistedWorkspaceConversation[]) {
  return [...conversations].sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function mergeProjectConversations(
  existingItems: PersistedWorkspaceConversation[],
  derivedItems: WorkspaceConversationItem[]
) {
  const merged = new Map<string, PersistedWorkspaceConversation>();
  const derivedIds = new Set(derivedItems.map((item) => item.id));

  for (const existing of existingItems) {
    if (!existing.hidden && !derivedIds.has(existing.id)) {
      continue;
    }

    merged.set(existing.id, {
      ...existing,
      updatedAt: normalizeDate(existing.updatedAt),
    });
  }

  for (const derived of derivedItems) {
    const previous = merged.get(derived.id);
    merged.set(derived.id, {
      id: derived.id,
      kind: derived.kind,
      sectionId: derived.sectionId,
      title: previous?.customTitle ? previous.title : derived.title,
      customTitle: previous?.customTitle,
      subtitle: derived.subtitle,
      updatedAt: normalizeDate(derived.updatedAt),
      pinned: previous?.pinned ?? derived.pinned ?? false,
      hidden: previous?.hidden ?? false,
    });
  }

  return sortConversations([...merged.values()]);
}

export function renameProjectConversation(
  items: PersistedWorkspaceConversation[],
  conversationId: string,
  title: string
) {
  return items.map((item) =>
    item.id === conversationId
      ? {
          ...item,
          title,
          customTitle: title,
        }
      : item
  );
}

export function toggleProjectConversationPin(
  items: PersistedWorkspaceConversation[],
  conversationId: string
) {
  return sortConversations(
    items.map((item) =>
      item.id === conversationId
        ? {
            ...item,
            pinned: !item.pinned,
          }
        : item
    )
  );
}

export function hideProjectConversation(
  items: PersistedWorkspaceConversation[],
  conversationId: string
) {
  return items.map((item) =>
    item.id === conversationId
      ? {
          ...item,
          hidden: true,
        }
      : item
  );
}

export const useWorkspaceConversationsStore = create<WorkspaceConversationsState>()(
  persist(
    (set) => ({
      projects: {},

      syncDerivedConversations: (projectId, derivedItems) => {
        set((state) => {
          const current = state.projects[projectId] ?? {
            items: [],
            activeConversationId: derivedItems[0]?.id || "",
          };
          const items = mergeProjectConversations(current.items, derivedItems);
          const visibleItems = items.filter((item) => !item.hidden);
          const activeConversationId = visibleItems.some(
            (item) => item.id === current.activeConversationId
          )
            ? current.activeConversationId
            : visibleItems[0]?.id || "";

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                items,
                activeConversationId,
              },
            },
          };
        });
      },

      setActiveConversation: (projectId, conversationId) => {
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              items: state.projects[projectId]?.items || [],
              activeConversationId: conversationId,
            },
          },
        }));
      },

      renameConversation: (projectId, conversationId, title) => {
        set((state) => {
          const current = state.projects[projectId];
          if (!current) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...current,
                items: renameProjectConversation(current.items, conversationId, title.trim()),
              },
            },
          };
        });
      },

      togglePinConversation: (projectId, conversationId) => {
        set((state) => {
          const current = state.projects[projectId];
          if (!current) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...current,
                items: toggleProjectConversationPin(current.items, conversationId),
              },
            },
          };
        });
      },

      hideConversation: (projectId, conversationId) => {
        set((state) => {
          const current = state.projects[projectId];
          if (!current) return state;

          const items = hideProjectConversation(current.items, conversationId);
          const visibleItems = items.filter((item) => !item.hidden);
          const activeConversationId =
            current.activeConversationId === conversationId
              ? visibleItems[0]?.id || ""
              : current.activeConversationId;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                items,
                activeConversationId,
              },
            },
          };
        });
      },

      clearProjectConversations: (projectId) => {
        set((state) => {
          const nextProjects = { ...state.projects };
          delete nextProjects[projectId];
          return { projects: nextProjects };
        });
      },
    }),
    {
      name: "workspace-conversations-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ projects: state.projects }),
    }
  )
);
