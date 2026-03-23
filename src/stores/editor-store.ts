import { create } from "zustand";
import type { AutoSaveStatus, Section } from "@/types/editor";
import { countWordsInMarkdown } from "@/lib/content";

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

interface EditorStoreState {
  activeSectionId: string | null;
  sectionTitle: string;
  content: string;
  wordCount: number;
  autoSaveStatus: AutoSaveStatus;
  lastSaved: Date | undefined;

  selectSection: (section: Section) => void;
  updateTitle: (title: string, projectId: string | null) => void;
  updateContent: (content: string, projectId: string | null) => void;
  saveImmediately: (projectId: string | null) => Promise<void>;
  scheduleSave: (projectId: string | null) => void;
  replaceContent: (content: string, projectId: string | null) => void;
  appendContent: (chunk: string, projectId: string | null) => void;
  resetEditor: () => void;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  activeSectionId: null,
  sectionTitle: "",
  content: "",
  wordCount: 0,
  autoSaveStatus: "idle",
  lastSaved: undefined,

  selectSection: (section) => {
    set({
      activeSectionId: section.id,
      sectionTitle: section.title,
      content: section.content,
      wordCount: section.wordCount,
      autoSaveStatus: "idle",
    });
  },

  updateTitle: (title, projectId) => {
    set({ sectionTitle: title });
    get().scheduleSave(projectId);
  },

  updateContent: (content, projectId) => {
    set({
      content,
      wordCount: countWordsInMarkdown(content),
    });
    get().scheduleSave(projectId);
  },

  saveImmediately: async (projectId) => {
    const { activeSectionId, sectionTitle, content } = get();
    if (!activeSectionId || !projectId) return;

    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
      saveTimeoutId = null;
    }

    try {
      const response = await fetch(`/api/documents/${activeSectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sectionTitle, content }),
      });

      if (!response.ok) throw new Error();
      const savedSection = await response.json();

      set({
        wordCount: savedSection.wordCount,
        lastSaved: new Date(),
        autoSaveStatus: "saved",
      });

      return;
    } catch {
      set({ autoSaveStatus: "error" });
    }
  },

  scheduleSave: (projectId) => {
    const { activeSectionId, sectionTitle, content } = get();
    if (!activeSectionId || !projectId) return;

    set({ autoSaveStatus: "saving" });

    if (saveTimeoutId) clearTimeout(saveTimeoutId);

    const currentSectionId = activeSectionId;
    const currentTitle = sectionTitle;
    const currentContent = content;

    saveTimeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/documents/${currentSectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: currentTitle,
            content: currentContent,
          }),
        });

        if (!response.ok) throw new Error();
        const savedSection = await response.json();

        const state = get();
        if (state.activeSectionId === currentSectionId) {
          set({
            wordCount: savedSection.wordCount,
            lastSaved: new Date(),
            autoSaveStatus: "saved",
          });
        }
      } catch {
        const state = get();
        if (state.activeSectionId === currentSectionId) {
          set({ autoSaveStatus: "error" });
        }
      }
    }, 850);
  },

  replaceContent: (content, projectId) => {
    set({
      content,
      wordCount: countWordsInMarkdown(content),
    });
    get().scheduleSave(projectId);
  },

  appendContent: (chunk, projectId) => {
    const { content } = get();
    const nextContent = content.trim() ? `${content}\n\n${chunk}` : chunk;
    set({
      content: nextContent,
      wordCount: countWordsInMarkdown(nextContent),
    });
    get().scheduleSave(projectId);
  },

  resetEditor: () => {
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
      saveTimeoutId = null;
    }
    set({
      activeSectionId: null,
      sectionTitle: "",
      content: "",
      wordCount: 0,
      autoSaveStatus: "idle",
      lastSaved: undefined,
    });
  },

  setAutoSaveStatus: (autoSaveStatus) => set({ autoSaveStatus }),
}));
