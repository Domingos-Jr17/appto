export type EditorialStatus = "empty" | "started" | "drafting" | "review" | "stale";

export interface Section {
  id: string;
  title: string;
  type: "chapter" | "section";
  parentId: string | null;
  order: number;
  updatedAt: string;
  wordCount: number;
  editorialStatus: EditorialStatus;
  content: string;
  children: Section[];
}

export interface FlatSection {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount: number;
  parentId: string | null;
  updatedAt: string;
}

export interface ProjectSection {
  id: string;
  title: string;
  content: string | null;
  order: number;
  wordCount: number;
  parentId: string | null;
  updatedAt: string;
}

export interface LastEditedSection {
  id: string;
  title: string;
  updatedAt: string;
}

export interface SectionSummary {
  empty: number;
  started: number;
  drafting: number;
  review: number;
  stale: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  wordCount: number;
  resumeMode: "chat" | "document" | "structure";
  lastEditedSection: LastEditedSection | null;
  sectionSummary: SectionSummary;
  sections: ProjectSection[];
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface SavedExport {
  id: string;
  format: "DOCX" | "PDF";
  createdAt: string;
  file: {
    id: string;
    originalName: string;
    downloadUrl: string;
    contentUrl: string;
  };
}

export interface CreateSectionOptions {
  title: string;
  content?: string;
  parentId?: string | null;
  selectAfterCreate?: boolean;
}

export type AutoSaveStatus = "saving" | "saved" | "error" | "idle";

export type WorkspaceMode = "chat" | "document" | "structure";

export interface ReferenceData {
  type: "book" | "article" | "website" | "thesis";
  authors: string;
  title: string;
  year: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  pages?: string;
  url?: string;
  accessDate?: string;
}
