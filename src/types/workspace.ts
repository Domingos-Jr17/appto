export type SectionStatus = "done" | "generating" | "pending";

export interface WorkSection {
  id: string;
  title: string;
  status: SectionStatus;
  content: string;
  order: number;
}

export interface WorkBrief {
  title: string;
  workType: string;
  institution?: string;
  course?: string;
  subject?: string;
  advisor?: string;
  studentName?: string;
  city?: string;
  year?: string;
  coverTemplate?: string;
}

export interface WorkspaceData {
  id: string;
  brief: WorkBrief;
  sections: WorkSection[];
  generationStatus: string;
  generationProgress: number;
  generationStep: string | null;
  createdAt: string;
  updatedAt: string;
}
