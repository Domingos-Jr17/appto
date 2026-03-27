import { create } from "zustand";
import type {
  CreateSectionOptions,
  Project,
  SavedExport,
  Section,
} from "@/types/editor";
import {
  buildSectionTree,
  deriveSection,
  flattenSections,
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
  credits: number;
  savedExports: SavedExport[];
  isSavingExport: "docx" | "pdf" | null;
  isLoading: boolean;
  activeProjectId: string | null;
  activeProjectVersion: number;
  saveExportToken: number;

  setProject: (project: Project) => void;
  setSections: (sections: Section[]) => void;
  setCredits: (credits: number) => void;
  setSavedExports: (exports: SavedExport[]) => void;
  setLoading: (loading: boolean) => void;

  fetchProject: (projectId: string) => Promise<void>;
  createSection: (
    projectId: string,
    options: CreateSectionOptions
  ) => Promise<Section | null>;
  renameSection: (sectionId: string, newTitle: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  reorderSections: (projectId: string, tree: Section[]) => Promise<void>;
  exportDocument: (projectId: string, format: "docx" | "pdf") => Promise<void>;
  saveExport: (projectId: string, format: "docx" | "pdf") => Promise<void>;

  updateSectionTree: (
    sectionId: string,
    updater: (section: Section) => Section
  ) => void;
  syncProject: () => void;
  findSection: (sectionId: string) => Section | null;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  project: null,
  sections: [],
  credits: 0,
  savedExports: [],
  isSavingExport: null,
  isLoading: true,
  activeProjectId: null,
  activeProjectVersion: 0,
  saveExportToken: 0,

  setProject: (project) => set({ project }),
  setSections: (sections) => set({ sections }),
  setCredits: (credits) => set({ credits }),
  setSavedExports: (savedExports) => set({ savedExports }),
  setLoading: (isLoading) => set({ isLoading }),

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

  syncProject: () => {
    set((state) => {
      if (!state.project) return state;
      const project = syncProjectWithTree(state.project, state.sections);
      return { project };
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
      const [projectResponse, creditsResponse, exportsResponse] =
        await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch("/api/credits"),
          fetch(`/api/projects/${projectId}/exports`),
        ]);

      if (!projectResponse.ok) throw new Error("Projecto nao encontrado");

      const projectData = (await projectResponse.json()) as Project;
      const creditsData = await creditsResponse.json();
      const exportsData = exportsResponse.ok
        ? await exportsResponse.json()
        : { exports: [] };

      const currentState = get();
      if (currentState.activeProjectVersion !== projectVersion || currentState.activeProjectId !== projectId) {
        return;
      }

      const tree = buildSectionTree(projectData.sections);

      set({
        project: projectData,
        sections: tree,
        credits: creditsData.balance || 0,
        savedExports: exportsData.exports || [],
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
      set({ project: null, sections: [], savedExports: [], isLoading: false });
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

  reorderSections: async (projectId, tree) => {
    const normalizedTree = normalizeSectionTree(tree);
    const { project, sections: previousSections, activeProjectId, activeProjectVersion } = get();
    if (activeProjectId !== projectId) return;

    const previousProject = project;
    const syncedProject = project
      ? syncProjectWithTree(project, normalizedTree)
      : project;

    set({ sections: normalizedTree, project: syncedProject });

    try {
      const payload = flattenSections(normalizedTree).map((section) => ({
        id: section.id,
        parentId: section.parentId,
        order: section.order,
      }));

      const response = await fetch("/api/documents/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, items: payload }),
      });

      if (!response.ok) throw new Error();
      const reorderedSections = await response.json();
      const currentState = get();
      if (currentState.activeProjectId !== projectId || currentState.activeProjectVersion !== activeProjectVersion) {
        return;
      }

      const nextTree = buildSectionTree(reorderedSections);
      const syncedProject2 = project
        ? syncProjectWithTree(project, nextTree)
        : project;
      set({ sections: nextTree, project: syncedProject2 });
    } catch {
      const currentState = get();
      if (currentState.activeProjectId !== projectId || currentState.activeProjectVersion !== activeProjectVersion) {
        return;
      }

      set({ sections: previousSections, project: previousProject });
    }
  },

  exportDocument: async (projectId, format) => {
    const response = await fetch(
      format === "docx"
        ? `/api/export?projectId=${projectId}`
        : `/api/export/pdf?projectId=${projectId}`
    );
    if (!response.ok) throw new Error();

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${get().project?.title || "documento"}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);

    const creditsResponse = await fetch("/api/credits");
    const creditsData = await creditsResponse.json();
    set({ credits: creditsData.balance || 0 });
  },

  saveExport: async (projectId, format) => {
    const { activeProjectId, activeProjectVersion } = get();
    if (activeProjectId !== projectId) return;

    const saveExportToken = get().saveExportToken + 1;
    set({ isSavingExport: format, saveExportToken });
    try {
      const exportFormat = format === "pdf" ? "PDF" : "DOCX";
      const response = await fetch(
        `/api/projects/${projectId}/export/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: exportFormat }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao guardar exportacao");
      }

      set((state) => {
        if (state.activeProjectId !== projectId || state.activeProjectVersion !== activeProjectVersion) {
          return state;
        }

        return {
          savedExports: [data.export, ...state.savedExports].slice(0, 6),
        };
      });
    } finally {
      set((state) => (state.saveExportToken === saveExportToken ? { isSavingExport: null } : state));
    }
  },
}));
