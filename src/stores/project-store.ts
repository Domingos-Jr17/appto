import { create } from "zustand";
import type {
  CreateSectionOptions,
  Project,
  Section,
} from "@/types/editor";
import {
  buildSectionTree,
  deriveSection,
  findSectionById,
  insertTree,
  normalizeSectionTree,
  removeTree,
  syncProjectWithTree,
  updateTree,
} from "@/lib/editor-helpers";
import { logger } from "@/lib/logger";

interface ProjectStoreState {
  project: Project | null;
  sections: Section[];
  isSavingExport: "docx" | "pdf" | null;
  isLoading: boolean;
  activeProjectId: string | null;
  activeProjectVersion: number;

  fetchProject: (projectId: string) => Promise<void>;
  createSection: (
    projectId: string,
    options: CreateSectionOptions
  ) => Promise<Section | null>;
  renameSection: (sectionId: string, newTitle: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  exportDocument: (projectId: string, format: "docx") => Promise<void>;

  updateSectionTree: (
    sectionId: string,
    updater: (section: Section) => Section
  ) => void;
  findSection: (sectionId: string) => Section | null;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  project: null,
  sections: [],
  isSavingExport: null,
  isLoading: true,
  activeProjectId: null,
  activeProjectVersion: 0,

  updateSectionTree: (sectionId, updater) => {
    set((state) => {
      const nextTree = normalizeSectionTree(
        updateTree(state.sections, sectionId, updater)
      );
      const project = state.project
        ? syncProjectWithTree(state.project, nextTree)
        : state.project;
      return { sections: nextTree, project };
    });
  },

  findSection: (sectionId) => {
    return findSectionById(sectionId, get().sections);
  },

  fetchProject: async (projectId) => {
    const projectVersion = get().activeProjectVersion + 1;
    set({
      isLoading: true,
      isSavingExport: null,
      activeProjectId: projectId,
      activeProjectVersion: projectVersion,
    });
    try {
      const projectResponse = await fetch(`/api/projects/${projectId}`);

      if (!projectResponse.ok) throw new Error("Projecto não encontrado");

      const projectData = (await projectResponse.json()) as Project;

      const currentState = get();
      if (currentState.activeProjectVersion !== projectVersion || currentState.activeProjectId !== projectId) {
        return;
      }

      const tree = buildSectionTree(projectData.sections);

      set({
        project: projectData,
        sections: tree,
        activeProjectId: projectId,
        activeProjectVersion: projectVersion,
        isLoading: false,
      });
    } catch (error) {
      const currentState = get();
      if (currentState.activeProjectVersion !== projectVersion || currentState.activeProjectId !== projectId) {
        return;
      }

      logger.error("Fetch project failed", { projectId, error: String(error) });
      set({ project: null, sections: [], isLoading: false });
    }
  },

  createSection: async (projectId, options) => {
    const { activeProjectId, activeProjectVersion } = get();
    if (activeProjectId !== projectId) return null;

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        parentId: options.parentId,
        title: options.title,
        content: options.content || "",
        order: get().sections.length,
      }),
    });

    if (!response.ok) throw new Error();

    const newSection = await response.json();
    const currentState = get();
    if (currentState.activeProjectId !== projectId || currentState.activeProjectVersion !== activeProjectVersion) {
      return null;
    }

    const mappedSection = deriveSection({
      id: newSection.id,
      title: newSection.title,
      type: options.parentId ? "section" : "chapter",
      parentId: options.parentId ?? null,
      order: newSection.order,
      updatedAt: newSection.updatedAt,
      wordCount: newSection.wordCount,
      content: newSection.content || "",
      children: [],
    });

    set((state) => {
      if (state.activeProjectId !== projectId || state.activeProjectVersion !== activeProjectVersion) {
        return state;
      }

      const nextTree = insertTree(
        state.sections,
        mappedSection,
        options.parentId
      );
      const project = state.project
        ? syncProjectWithTree(state.project, nextTree)
        : state.project;
      return { sections: nextTree, project };
    });

    return mappedSection;
  },

  renameSection: async (sectionId, newTitle) => {
    const state = get();
    const activeProjectId = state.activeProjectId;
    const activeProjectVersion = state.activeProjectVersion;
    const existing = findSectionById(sectionId, state.sections);
    const response = await fetch(`/api/documents/${sectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        content: existing?.content || "",
      }),
    });

    if (!response.ok) throw new Error();
    const savedSection = await response.json();
    const currentState = get();
    if (
      currentState.activeProjectId !== activeProjectId ||
      currentState.activeProjectVersion !== activeProjectVersion
    ) {
      return;
    }

    set((state) => {
      if (state.activeProjectId !== activeProjectId || state.activeProjectVersion !== activeProjectVersion) {
        return state;
      }

      const nextTree = normalizeSectionTree(
        updateTree(state.sections, sectionId, (section) => ({
          ...section,
          title: savedSection.title,
          updatedAt: savedSection.updatedAt,
          content: savedSection.content || section.content,
          wordCount: savedSection.wordCount ?? section.wordCount,
        }))
      );
      const project = state.project
        ? syncProjectWithTree(state.project, nextTree)
        : state.project;
      return { sections: nextTree, project };
    });
  },

  deleteSection: async (sectionId) => {
    const { activeProjectId, activeProjectVersion } = get();
    const response = await fetch(`/api/documents/${sectionId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error();

    set((state) => {
      if (state.activeProjectId !== activeProjectId || state.activeProjectVersion !== activeProjectVersion) {
        return state;
      }

      const nextTree = normalizeSectionTree(
        removeTree(state.sections, sectionId)
      );
      const project = state.project
        ? syncProjectWithTree(state.project, nextTree)
        : state.project;
      return { sections: nextTree, project };
    });
  },

  exportDocument: async (projectId, format) => {
    set({ isSavingExport: format });
    try {
      const response = await fetch(`/api/export?projectId=${projectId}`);
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${get().project?.title || "documento"}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      set({ isSavingExport: null });
    }
  },
}));
