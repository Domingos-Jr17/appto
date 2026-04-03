import { create } from "zustand";
import type { AssistantMessage } from "@/types/editor";
import { isFeatureVisible } from "@/lib/features";
import type { AIAction } from "@/lib/subscription";

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
    context?: string,
    action?: AIAction
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

  sendMessage: async (prompt, projectId, context, action) => {
    const resolvedAction: AIAction = action ?? "generate";

    if (!prompt.trim() || get().isChatLoading) return "";

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date(),
    };

    const assistantMessageId = crypto.randomUUID();
    const initialAssistantMessage: AssistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage, initialAssistantMessage],
      isChatLoading: true,
      activeProjectId: projectId,
    }));

    try {
      const endpoint = isFeatureVisible("realTimeStreaming") ? "/api/ai/stream" : "/api/ai";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resolvedAction,
          text: prompt,
          context,
          projectId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Erro ao gerar conteúdo." }));
        throw new Error(data.error || "Erro ao gerar conteúdo.");
      }

      let assistantContent = "";

      if (endpoint === "/api/ai/stream" && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          assistantContent += decoder.decode(value, { stream: true });
          set((state) => ({
            ...state,
            chatMessages: state.chatMessages.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: assistantContent }
                : message,
            ),
          }));
        }
      } else {
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Erro ao gerar conteúdo.");
        }
        assistantContent = data.response;
      }

      if (!assistantContent.trim()) {
        throw new Error("A IA não devolveu conteúdo.");
      }

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }

        return {
          chatMessages: state.chatMessages.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: assistantContent }
              : message,
          ),
          isChatLoading: false,
          chatPrompt: "",
        };
      });

      return assistantContent;
    } catch (error) {
      set((state) => ({
        isChatLoading: false,
        chatMessages: state.chatMessages.filter((message) => message.id !== assistantMessageId),
      }));
      throw error;
    }
  },
}));
