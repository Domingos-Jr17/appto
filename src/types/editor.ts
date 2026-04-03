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

export type CitationStyle = "ABNT" | "APA" | "Vancouver";

export type WorkGenerationStatus =
  | "BRIEFING"
  | "GENERATING"
  | "READY"
  | "NEEDS_REVIEW"
  | "FAILED";

export type AcademicEducationLevel = "SECONDARY" | "TECHNICAL" | "HIGHER_EDUCATION";

export type CoverTemplate =
  | "UEM_STANDARD"
  | "UP"
  | "UDM"
  | "ABNT_GENERIC"
  | "SCHOOL_MOZ"
  | "DISCIPLINARY_MOZ";

export interface ProjectBrief {
  workType: string;
  generationStatus: WorkGenerationStatus;
  institutionName: string | null;
  courseName: string | null;
  subjectName: string | null;
  educationLevel: AcademicEducationLevel | null;
  advisorName: string | null;
  studentName: string | null;
  city: string | null;
  academicYear: number | null;
  dueDate: string | null;
  theme: string | null;
  subtitle: string | null;
  objective: string | null;
  researchQuestion: string | null;
  methodology: string | null;
  keywords: string | null;
  referencesSeed: string | null;
  citationStyle: CitationStyle;
  language: string;
  additionalInstructions: string | null;
  coverTemplate: CoverTemplate;
  // Education-level specific fields
  className: string | null;
  turma: string | null;
  facultyName: string | null;
  departmentName: string | null;
  studentNumber: string | null;
  semester: string | null;
}

export interface WorkBriefInput {
  institutionName?: string;
  courseName?: string;
  subjectName?: string;
  educationLevel?: AcademicEducationLevel;
  advisorName?: string;
  studentName?: string;
  city?: string;
  academicYear?: number;
  dueDate?: string;
  theme?: string;
  subtitle?: string;
  objective?: string;
  researchQuestion?: string;
  methodology?: string;
  keywords?: string;
  referencesSeed?: string;
  citationStyle?: CitationStyle;
  language?: string;
  additionalInstructions?: string;
  coverTemplate?: CoverTemplate;
  // Education-level specific fields
  className?: string;
  turma?: string;
  facultyName?: string;
  departmentName?: string;
  studentNumber?: string;
  semester?: string;
}

export interface CreateWorkPayload {
  title: string;
  type: string;
  description?: string;
  brief: WorkBriefInput;
  coverTemplate?: CoverTemplate;
  generateContent: boolean;
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  generationStatus?: WorkGenerationStatus;
  generationProgress?: number;
  generationStep?: string | null;
  wordCount: number;
  resumeMode: "chat" | "document" | "structure";
  lastEditedSection: LastEditedSection | null;
  sectionSummary: SectionSummary;
  brief?: ProjectBrief | null;
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
