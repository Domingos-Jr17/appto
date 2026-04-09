import type {
  AcademicEducationLevel,
  CoverTemplate,
  WorkBriefInput,
} from "@/types/editor";

export type CanonicalProjectType =
  | "SECONDARY_WORK"
  | "TECHNICAL_WORK"
  | "HIGHER_EDUCATION_WORK";

export interface DocumentSectionTemplate {
  title: string;
  order: number;
  isFrontMatter: boolean;
  isPrimaryEditable: boolean;
}

export interface DocumentProfileInput {
  type?: string | null;
  educationLevel?: string | null;
  institutionName?: string | null;
  coverTemplate?: string | null;
}

export interface DocumentProfile {
  educationLevel: AcademicEducationLevel;
  projectType: CanonicalProjectType;
  displayTypeLabel: string;
  coverTemplate: CoverTemplate;
  sections: DocumentSectionTemplate[];
  frontMatterSections: DocumentSectionTemplate[];
  bodySections: DocumentSectionTemplate[];
  referenceSection: DocumentSectionTemplate;
  frontMatterPolicy: {
    includeTitlePage: boolean;
    includeSummary: boolean;
    includeAutomaticTableOfContents: boolean;
  };
  referencePolicy: {
    required: boolean;
    formatted: boolean;
    allowPlaceholder: boolean;
  };
  citationPolicy: "OPTIONAL" | "REQUIRED";
  coverFieldPolicy: {
    institutionFallback: string;
    courseFallback: string;
    advisorLabel: string;
    metaMode: "SECONDARY" | "TECHNICAL" | "HIGHER_EDUCATION";
  };
}

export interface NormalizedWorkDocumentInput {
  type: CanonicalProjectType;
  brief: WorkBriefInput;
  profile: DocumentProfile;
}

const TYPE_BY_EDUCATION: Record<AcademicEducationLevel, CanonicalProjectType> = {
  SECONDARY: "SECONDARY_WORK",
  TECHNICAL: "TECHNICAL_WORK",
  HIGHER_EDUCATION: "HIGHER_EDUCATION_WORK",
};

const EDUCATION_BY_TYPE: Record<CanonicalProjectType, AcademicEducationLevel> = {
  SECONDARY_WORK: "SECONDARY",
  TECHNICAL_WORK: "TECHNICAL",
  HIGHER_EDUCATION_WORK: "HIGHER_EDUCATION",
};

const HIGHER_EDUCATION_TEMPLATES: CoverTemplate[] = [
  "UEM_STANDARD",
  "UP",
  "UDM",
  "ABNT_GENERIC",
];

const TECHNICAL_TEMPLATES: CoverTemplate[] = [
  "DISCIPLINARY_MOZ",
  "ABNT_GENERIC",
];

const _SECONDARY_TEMPLATES: CoverTemplate[] = ["SCHOOL_MOZ"];

const SECONDARY_SECTIONS: DocumentSectionTemplate[] = [
  { title: "Capa", order: 1, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Índice", order: 2, isFrontMatter: true, isPrimaryEditable: false },
  { title: "1. Introdução", order: 3, isFrontMatter: false, isPrimaryEditable: true },
  { title: "2. Desenvolvimento", order: 4, isFrontMatter: false, isPrimaryEditable: true },
  { title: "3. Conclusão", order: 5, isFrontMatter: false, isPrimaryEditable: true },
  { title: "Referências", order: 6, isFrontMatter: false, isPrimaryEditable: false },
];

const TECHNICAL_SECTIONS: DocumentSectionTemplate[] = [
  { title: "Capa", order: 1, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Índice", order: 2, isFrontMatter: true, isPrimaryEditable: false },
  { title: "1. Introdução", order: 3, isFrontMatter: false, isPrimaryEditable: true },
  { title: "2. Fundamentação Teórica", order: 4, isFrontMatter: false, isPrimaryEditable: true },
  { title: "3. Metodologia", order: 5, isFrontMatter: false, isPrimaryEditable: true },
  { title: "4. Análise Prática", order: 6, isFrontMatter: false, isPrimaryEditable: true },
  { title: "5. Conclusão", order: 7, isFrontMatter: false, isPrimaryEditable: true },
  { title: "6. Recomendações", order: 8, isFrontMatter: false, isPrimaryEditable: true },
  { title: "Referências", order: 9, isFrontMatter: false, isPrimaryEditable: false },
];

const HIGHER_EDUCATION_SECTIONS: DocumentSectionTemplate[] = [
  { title: "Capa", order: 1, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Folha de Rosto", order: 2, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Resumo", order: 3, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Índice", order: 5, isFrontMatter: true, isPrimaryEditable: false },
  { title: "1. Introdução", order: 6, isFrontMatter: false, isPrimaryEditable: true },
  { title: "2. Revisão da Literatura", order: 7, isFrontMatter: false, isPrimaryEditable: true },
  { title: "3. Metodologia", order: 8, isFrontMatter: false, isPrimaryEditable: true },
  { title: "4. Análise e Discussão", order: 9, isFrontMatter: false, isPrimaryEditable: true },
  { title: "5. Conclusão", order: 10, isFrontMatter: false, isPrimaryEditable: true },
  { title: "6. Recomendações", order: 11, isFrontMatter: false, isPrimaryEditable: true },
  { title: "Referências", order: 12, isFrontMatter: false, isPrimaryEditable: false },
];

function normalizeInstitutionName(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferInstitutionTemplate(institutionName?: string | null): CoverTemplate | null {
  const institution = normalizeInstitutionName(institutionName);

  if (!institution) {
    return null;
  }

  if (
    institution.includes("eduardo mondlane") ||
    institution.includes("eduardo mondlan") ||
    institution.includes(" uem")
  ) {
    return "UEM_STANDARD";
  }

  if (
    institution.includes("universidade pedagogica") ||
    institution.includes("pedagogica")
  ) {
    return "UP";
  }

  if (
    institution.includes("universidade de mocambique") ||
    institution.includes("universidade de moçambique") ||
    institution.includes(" udm")
  ) {
    return "UDM";
  }

  return null;
}

function resolveEducationLevel(input: DocumentProfileInput): AcademicEducationLevel {
  if (
    input.educationLevel === "SECONDARY" ||
    input.educationLevel === "TECHNICAL" ||
    input.educationLevel === "HIGHER_EDUCATION"
  ) {
    return input.educationLevel;
  }

  if (
    input.type === "SECONDARY_WORK" ||
    input.type === "TECHNICAL_WORK" ||
    input.type === "HIGHER_EDUCATION_WORK"
  ) {
    return EDUCATION_BY_TYPE[input.type];
  }

  return "HIGHER_EDUCATION";
}

function resolveCoverTemplate(
  educationLevel: AcademicEducationLevel,
  explicitCoverTemplate?: string | null,
  institutionName?: string | null,
): CoverTemplate {
  if (educationLevel === "SECONDARY") {
    return "SCHOOL_MOZ";
  }

  if (educationLevel === "TECHNICAL") {
    if (explicitCoverTemplate && TECHNICAL_TEMPLATES.includes(explicitCoverTemplate as CoverTemplate)) {
      return explicitCoverTemplate as CoverTemplate;
    }
    return "DISCIPLINARY_MOZ";
  }

  if (
    explicitCoverTemplate &&
    HIGHER_EDUCATION_TEMPLATES.includes(explicitCoverTemplate as CoverTemplate)
  ) {
    return explicitCoverTemplate as CoverTemplate;
  }

  return inferInstitutionTemplate(institutionName) || "ABNT_GENERIC";
}

function getSectionsForResolvedEducationLevel(
  educationLevel: AcademicEducationLevel,
): DocumentSectionTemplate[] {
  if (educationLevel === "SECONDARY") {
    return SECONDARY_SECTIONS;
  }

  if (educationLevel === "TECHNICAL") {
    return TECHNICAL_SECTIONS;
  }

  return HIGHER_EDUCATION_SECTIONS;
}

export function formatCanonicalProjectType(type?: string | null) {
  if (type === "SECONDARY_WORK") return "Trabalho Escolar";
  if (type === "TECHNICAL_WORK") return "Trabalho Técnico";
  return "Trabalho Académico";
}

export function resolveDocumentProfile(input: DocumentProfileInput): DocumentProfile {
  const educationLevel = resolveEducationLevel(input);
  const projectType = TYPE_BY_EDUCATION[educationLevel];
  const coverTemplate = resolveCoverTemplate(
    educationLevel,
    input.coverTemplate,
    input.institutionName,
  );
  const sections = getSectionsForResolvedEducationLevel(educationLevel);
  const frontMatterSections = sections.filter((section) => section.isFrontMatter);
  const bodySections = sections.filter(
    (section) => !section.isFrontMatter && section.title !== "Referências",
  );
  const referenceSection = sections.find((section) => section.title === "Referências")!;

  if (educationLevel === "SECONDARY") {
    return {
      educationLevel,
      projectType,
      displayTypeLabel: formatCanonicalProjectType(projectType),
      coverTemplate,
      sections,
      frontMatterSections,
      bodySections,
      referenceSection,
      frontMatterPolicy: {
        includeTitlePage: false,
        includeSummary: false,
        includeAutomaticTableOfContents: true,
      },
      referencePolicy: {
        required: false,
        formatted: false,
        allowPlaceholder: false,
      },
      citationPolicy: "OPTIONAL",
      coverFieldPolicy: {
        institutionFallback: "Escola Secundária",
        courseFallback: "Disciplina",
        advisorLabel: "Professor/Orientador",
        metaMode: "SECONDARY",
      },
    };
  }

  if (educationLevel === "TECHNICAL") {
    return {
      educationLevel,
      projectType,
      displayTypeLabel: formatCanonicalProjectType(projectType),
      coverTemplate,
      sections,
      frontMatterSections,
      bodySections,
      referenceSection,
      frontMatterPolicy: {
        includeTitlePage: false,
        includeSummary: false,
        includeAutomaticTableOfContents: true,
      },
      referencePolicy: {
        required: true,
        formatted: true,
        allowPlaceholder: false,
      },
      citationPolicy: "REQUIRED",
      coverFieldPolicy: {
        institutionFallback: "Instituto Técnico",
        courseFallback: "Curso técnico",
        advisorLabel: "Orientador",
        metaMode: "TECHNICAL",
      },
    };
  }

  return {
    educationLevel,
    projectType,
    displayTypeLabel: formatCanonicalProjectType(projectType),
    coverTemplate,
    sections,
    frontMatterSections,
    bodySections,
    referenceSection,
    frontMatterPolicy: {
      includeTitlePage: true,
      includeSummary: true,
      includeAutomaticTableOfContents: true,
    },
    referencePolicy: {
      required: true,
      formatted: true,
      allowPlaceholder: false,
    },
    citationPolicy: "REQUIRED",
    coverFieldPolicy: {
      institutionFallback: "Instituição Académica",
      courseFallback: "Curso",
      advisorLabel: "Orientador",
      metaMode: "HIGHER_EDUCATION",
    },
  };
}

export function normalizeWorkDocumentInput(input: {
  type?: string | null;
  brief?: WorkBriefInput | null;
}): NormalizedWorkDocumentInput {
  const profile = resolveDocumentProfile({
    type: input.type,
    educationLevel: input.brief?.educationLevel,
    institutionName: input.brief?.institutionName,
    coverTemplate: input.brief?.coverTemplate,
  });

  return {
    type: profile.projectType,
    profile,
    brief: {
      ...input.brief,
      educationLevel: profile.educationLevel,
      coverTemplate: profile.coverTemplate,
    },
  };
}

export function isFrontMatterDocumentSectionTitle(title?: string | null) {
  if (!title) {
    return false;
  }

  return [
    "Capa",
    "Folha de Rosto",
    "Resumo",
    "Abstract",
    "Índice",
    "Sumário",
  ].includes(title.trim());
}

export function resolveDocumentInstitutionName(
  profile: DocumentProfile,
  brief?: { institutionName?: string | null } | null,
) {
  return brief?.institutionName || profile.coverFieldPolicy.institutionFallback;
}

export function resolveDocumentCourseLabel(
  profile: DocumentProfile,
  brief?: {
    educationLevel?: string | null;
    courseName?: string | null;
    subjectName?: string | null;
    className?: string | null;
    facultyName?: string | null;
  } | null,
) {
  if (profile.educationLevel === "SECONDARY") {
    return brief?.subjectName || brief?.className || profile.coverFieldPolicy.courseFallback;
  }

  if (profile.educationLevel === "TECHNICAL") {
    return brief?.courseName || brief?.subjectName || profile.coverFieldPolicy.courseFallback;
  }

  return (
    brief?.courseName ||
    brief?.facultyName ||
    brief?.subjectName ||
    profile.coverFieldPolicy.courseFallback
  );
}

export function resolveDocumentReferenceMeta(
  profile: DocumentProfile,
  brief?: {
    className?: string | null;
    turma?: string | null;
    studentNumber?: string | null;
    courseName?: string | null;
    semester?: string | null;
    facultyName?: string | null;
    departmentName?: string | null;
  } | null,
) {
  if (profile.coverFieldPolicy.metaMode === "SECONDARY") {
    return (
      [
        brief?.className,
        brief?.turma ? `Turma ${brief.turma}` : null,
        brief?.studentNumber,
      ]
        .filter(Boolean)
        .join(" • ") || null
    );
  }

  if (profile.coverFieldPolicy.metaMode === "TECHNICAL") {
    return (
      [
        brief?.courseName,
        brief?.semester ? `${brief.semester} Semestre` : null,
        brief?.studentNumber,
      ]
        .filter(Boolean)
        .join(" • ") || null
    );
  }

  return (
    [brief?.facultyName, brief?.departmentName, brief?.studentNumber]
      .filter(Boolean)
      .join(" • ") || null
  );
}
