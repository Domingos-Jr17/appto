import type { CitationStyle } from "@/types/editor";
import type { WorkBriefInput } from "@/types/editor";

export type SerializableProjectBrief = {
  workType: string;
  generationStatus: string;
  institutionName: string | null;
  courseName: string | null;
  subjectName: string | null;
  educationLevel: string | null;
  advisorName: string | null;
  studentName: string | null;
  city: string | null;
  academicYear: number | null;
  dueDate: Date | null;
  theme: string | null;
  subtitle: string | null;
  objective: string | null;
  researchQuestion: string | null;
  methodology: string | null;
  keywords: string | null;
  referencesSeed: string | null;
  citationStyle: CitationStyle | string;
  language: string;
  additionalInstructions: string | null;
  coverTemplate?: string | null;
  className?: string | null;
  turma?: string | null;
  facultyName?: string | null;
  departmentName?: string | null;
  studentNumber?: string | null;
  semester?: string | null;
};

export function serializeProjectBrief(brief: SerializableProjectBrief | null) {
  if (!brief) {
    return null;
  }

  return {
    ...brief,
    dueDate: brief.dueDate?.toISOString() ?? null,
    coverTemplate: brief.coverTemplate ?? undefined,
    className: brief.className ?? undefined,
    turma: brief.turma ?? undefined,
    facultyName: brief.facultyName ?? undefined,
    departmentName: brief.departmentName ?? undefined,
    studentNumber: brief.studentNumber ?? undefined,
    semester: brief.semester ?? undefined,
  };
}

type MutableBriefInput = {
  theme?: string;
  objective?: string;
  additionalInstructions?: string;
};

export function normalizeWorkBriefForGeneration<T extends MutableBriefInput>(brief: T, description?: string) {
  const next = { ...brief };
  const hasFullContext = Boolean(next.objective && next.theme);
  const hasOnlyTheme = Boolean(next.theme && !next.objective);

  if (hasOnlyTheme && description) {
    next.additionalInstructions = `${next.additionalInstructions ? `${next.additionalInstructions}\n` : ""}${description}`;
  } else if (!hasFullContext && description) {
    next.additionalInstructions = description;
  }

  if (hasOnlyTheme && next.theme && next.theme.length > 60 && !next.additionalInstructions) {
    next.additionalInstructions = next.theme;
  }

  return next;
}

export type WorkBriefRecord = {
  institutionName: string | null;
  courseName: string | null;
  subjectName: string | null;
  educationLevel: string | null;
  advisorName: string | null;
  studentName: string | null;
  city: string | null;
  academicYear: number | null;
  dueDate: Date | null;
  theme: string | null;
  subtitle: string | null;
  objective: string | null;
  researchQuestion: string | null;
  methodology: string | null;
  keywords: string | null;
  referencesSeed: string | null;
  citationStyle: CitationStyle | string;
  language: string;
  additionalInstructions: string | null;
  coverTemplate?: string | null;
  className?: string | null;
  turma?: string | null;
  facultyName?: string | null;
  departmentName?: string | null;
  studentNumber?: string | null;
  semester?: string | null;
};

export function toWorkBriefInput(brief: WorkBriefRecord): WorkBriefInput {
  return {
    institutionName: brief.institutionName ?? undefined,
    courseName: brief.courseName ?? undefined,
    subjectName: brief.subjectName ?? undefined,
    educationLevel: (brief.educationLevel as WorkBriefInput["educationLevel"]) ?? undefined,
    advisorName: brief.advisorName ?? undefined,
    studentName: brief.studentName ?? undefined,
    city: brief.city ?? undefined,
    academicYear: brief.academicYear ?? undefined,
    dueDate: brief.dueDate?.toISOString().slice(0, 10),
    theme: brief.theme ?? undefined,
    subtitle: brief.subtitle ?? undefined,
    objective: brief.objective ?? undefined,
    researchQuestion: brief.researchQuestion ?? undefined,
    methodology: brief.methodology ?? undefined,
    keywords: brief.keywords ?? undefined,
    referencesSeed: brief.referencesSeed ?? undefined,
    citationStyle: (brief.citationStyle as WorkBriefInput["citationStyle"]) ?? "ABNT",
    language: brief.language,
    additionalInstructions: brief.additionalInstructions ?? undefined,
    coverTemplate: (brief.coverTemplate as WorkBriefInput["coverTemplate"]) ?? undefined,
    className: brief.className ?? undefined,
    turma: brief.turma ?? undefined,
    facultyName: brief.facultyName ?? undefined,
    departmentName: brief.departmentName ?? undefined,
    studentNumber: brief.studentNumber ?? undefined,
    semester: brief.semester ?? undefined,
  };
}
