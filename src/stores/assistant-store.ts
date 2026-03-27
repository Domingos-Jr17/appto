import { create } from "zustand";
import type { AssistantMessage, ChatAction, ChatSuggestion } from "@/types/editor";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";

interface AssistantStoreState {
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  chatAction: ChatAction;
  isChatLoading: boolean;
  activeProjectId: string | null;
  requestVersion: number;

  setChatPrompt: (prompt: string) => void;
  setChatAction: (action: ChatAction) => void;
  addMessage: (message: AssistantMessage) => void;
  clearChat: (projectId?: string | null) => void;

  sendMessage: (
    prompt: string,
    action: ChatAction,
    projectTitle: string,
    sectionTitle: string,
    projectId: string | null,
    credits: number,
    onCreditsUpdate: (balance: number) => void
  ) => Promise<string>;
}

export const useAssistantStore = create<AssistantStoreState>((set, get) => ({
  chatMessages: [],
  chatPrompt: "",
  chatAction: "brainstorm",
  isChatLoading: false,
  activeProjectId: null,
  requestVersion: 0,

  setChatPrompt: (chatPrompt) => set({ chatPrompt }),
  setChatAction: (chatAction) => set({ chatAction }),

  addMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  clearChat: (projectId = null) =>
    set((state) => ({
      chatMessages: [],
      chatPrompt: "",
      chatAction: "brainstorm",
      isChatLoading: false,
      activeProjectId: projectId,
      requestVersion: state.requestVersion + 1,
    })),

  sendMessage: async (
    prompt,
    action,
    projectTitle,
    sectionTitle,
    projectId,
    credits,
    onCreditsUpdate
  ) => {
    if (!prompt.trim() || get().isChatLoading) return "";

    const cost =
      action === "rewrite"
        ? AI_ACTION_CREDIT_COSTS.improve
        : AI_ACTION_CREDIT_COSTS.generate;

    if (credits < cost) return "";

    const requestVersion = get().requestVersion + 1;

    const label =
      action === "outline"
        ? "Gerar outline"
        : action === "section"
          ? "Gerar secao"
          : action === "rewrite"
            ? "Reformular"
            : "Explorar";

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `[${label}] ${prompt}`,
      createdAt: new Date(),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
      isChatLoading: true,
      activeProjectId: projectId,
      requestVersion,
    }));

    try {
      const composedPrompt =
        action === "outline"
          ? `Crie um outline academico para o projecto "${projectTitle}" com base no pedido: ${prompt}`
          : action === "section"
            ? `Gere conteudo para a secao "${sectionTitle}" no projecto "${projectTitle}": ${prompt}`
            : action === "rewrite"
              ? `Reescreva o conteudo desta secao com melhor clareza academica. Contexto: ${sectionTitle}. Pedido: ${prompt}`
              : `Ajude-me a desenvolver este trabalho academico. Projecto: ${projectTitle}. Pedido: ${prompt}`;

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          text: composedPrompt,
          context: sectionTitle,
          projectId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar conteudo.");
      }

      const currentState = get();
      if (currentState.requestVersion !== requestVersion || currentState.activeProjectId !== projectId) {
        return "";
      }

      onCreditsUpdate(data.remainingCredits);

      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        createdAt: new Date(),
      };

      set((state) => {
        if (state.requestVersion !== requestVersion || state.activeProjectId !== projectId) {
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
      const currentState = get();
      if (currentState.requestVersion !== requestVersion || currentState.activeProjectId !== projectId) {
        return "";
      }

      set({ isChatLoading: false });
      throw error;
    }
  },
}));

export function getChatSuggestions(
  project: { title: string; sections: unknown[]; wordCount: number } | null,
  activeSection: { title: string; wordCount: number } | null,
  sectionTitle: string
): ChatSuggestion[] {
  if (!project) return [];

  if (!project.sections.length) {
    return [
      {
        label: "Gerar outline base",
        prompt:
          "Cria um outline academico com capitulos principais, subtitulos e ordem de desenvolvimento.",
        action: "outline",
      },
      {
        label: "Definir problema",
        prompt: `Ajuda-me a formular o problema central, objectivos e perguntas de investigacao para "${project.title}".`,
        action: "brainstorm",
      },
      {
        label: "Abrir primeira secao",
        prompt:
          "Depois do outline, sugere qual deve ser a primeira secao a escrever e como a iniciar.",
        action: "section",
      },
    ];
  }

  if (activeSection && activeSection.wordCount === 0) {
    return [
      {
        label: "Escrever secao activa",
        prompt: `Escreve um primeiro rascunho para a secao "${activeSection.title}" com tom academico e estrutura clara.`,
        action: "section",
      },
      {
        label: "Quebrar em argumentos",
        prompt: `Divide a secao "${activeSection.title}" em 3 a 5 argumentos ou subtitulos para orientar a escrita.`,
        action: "brainstorm",
      },
      {
        label: "Referencias provaveis",
        prompt: `Que tipos de referencias devo procurar para sustentar a secao "${activeSection.title}"?`,
        action: "brainstorm",
      },
    ];
  }

  return [
    {
      label: "Melhorar argumento",
      prompt: `Analisa a secao "${sectionTitle || "actual"}" e diz-me como reforcar a argumentacao sem perder clareza.`,
      action: "rewrite",
    },
    {
      label: "Criar proxima secao",
      prompt:
        "Sugere qual deve ser a proxima secao do trabalho e justifica a ordem.",
      action: "brainstorm",
    },
    {
      label: "Outline final",
      prompt:
        "Revise a estrutura actual e proponha um outline final pronto para revisao.",
      action: "outline",
    },
  ];
}
