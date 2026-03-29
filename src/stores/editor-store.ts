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
  replaceContent: (content: string, projectId: string | null) => void;
  resetEditor: () => void;
}

function triggerScheduleSave(
  get: () => EditorStoreState,
  set: (partial: Partial<EditorStoreState>) => void,
  projectId: string | null
) {
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

      if (get().activeSectionId === currentSectionId) {
        set({
          wordCount: savedSection.wordCount,
          lastSaved: new Date(),
          autoSaveStatus: "saved",
        });
      }
    } catch {
      if (get().activeSectionId === currentSectionId) {
        set({ autoSaveStatus: "error" });
      }
    }
  }, 850);
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
    triggerScheduleSave(get, set, projectId);
  },

  updateContent: (nextContent, projectId) => {
    set({
      content: nextContent,
      wordCount: countWordsInMarkdown(nextContent),
    });
    triggerScheduleSave(get, set, projectId);
  },

  replaceContent: (nextContent, projectId) => {
    set({
      content: nextContent,
      wordCount: countWordsInMarkdown(nextContent),
    });
    triggerScheduleSave(get, set, projectId);
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
}));
