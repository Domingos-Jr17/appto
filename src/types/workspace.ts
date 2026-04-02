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
  institutionName?: string;
  courseName?: string;
  subjectName?: string;
  advisorName?: string;
  studentName?: string;
  city?: string;
  year?: string;
  coverTemplate?: string;
  // Education-level specific fields
  className?: string;
  turma?: string;
  facultyName?: string;
  departmentName?: string;
  studentNumber?: string;
  semester?: string;
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
