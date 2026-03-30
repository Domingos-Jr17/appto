import { create } from "zustand";
import type { AssistantMessage } from "@/types/editor";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";

interface AssistantStoreState {
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  isChatLoading: boolean;
  activeProjectId: string | null;

  setChatPrompt: (prompt: string) => void;
  clearChat: (projectId?: string | null) => void;

  sendMessage: (
    prompt: string,
    projectId: string | null,
    credits: number,
    onCreditsUpdate: (balance: number) => void,
    context?: string
  ) => Promise<string>;
}

export const useAssistantStore = create<AssistantStoreState>((set, get) => ({
  chatMessages: [],
  chatPrompt: "",
  isChatLoading: false,
  activeProjectId: null,

  setChatPrompt: (chatPrompt) => set({ chatPrompt }),

  clearChat: (projectId = null) =>
    set({
      chatMessages: [],
      chatPrompt: "",
      isChatLoading: false,
      activeProjectId: projectId,
    }),

  sendMessage: async (prompt, projectId, credits, onCreditsUpdate, context) => {
    if (!prompt.trim() || get().isChatLoading) return "";

    if (credits < AI_ACTION_CREDIT_COSTS.generate) return "";

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date(),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
      isChatLoading: true,
      activeProjectId: projectId,
    }));

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          text: prompt,
          context,
          projectId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar conteúdo.");
      }

      onCreditsUpdate(data.remainingCredits);

      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        createdAt: new Date(),
      };

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }

        return {
          chatMessages: [...state.chatMessages, assistantMessage],
          isChatLoading: false,
          chatPrompt: "",
        };
      });

      return data.response;
    } catch (error) {
      set({ isChatLoading: false });
      throw error;
    }
  },
}));
