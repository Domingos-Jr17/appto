export interface ProjectSectionTemplate {
  title: string;
  order: number;
  isFrontMatter: boolean;
  isPrimaryEditable: boolean;
}

export const DEFAULT_PROJECT_SECTIONS: ProjectSectionTemplate[] = [
  { title: "Capa", order: 1, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Folha de Rosto", order: 2, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Resumo", order: 3, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Abstract", order: 4, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Índice", order: 5, isFrontMatter: true, isPrimaryEditable: false },
  { title: "1. Introdução", order: 6, isFrontMatter: false, isPrimaryEditable: true },
  { title: "2. Revisão da Literatura", order: 7, isFrontMatter: false, isPrimaryEditable: true },
  { title: "3. Metodologia", order: 8, isFrontMatter: false, isPrimaryEditable: true },
  { title: "4. Análise e Discussão", order: 9, isFrontMatter: false, isPrimaryEditable: true },
  { title: "5. Conclusão", order: 10, isFrontMatter: false, isPrimaryEditable: true },
  { title: "6. Recomendações", order: 11, isFrontMatter: false, isPrimaryEditable: true },
  { title: "Referências", order: 12, isFrontMatter: false, isPrimaryEditable: false },
  { title: "Anexos", order: 13, isFrontMatter: false, isPrimaryEditable: false },
];

const SECONDARY_PROJECT_SECTIONS: ProjectSectionTemplate[] = [
  { title: "Capa", order: 1, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Índice", order: 2, isFrontMatter: true, isPrimaryEditable: false },
  { title: "1. Introdução", order: 3, isFrontMatter: false, isPrimaryEditable: true },
  { title: "2. Desenvolvimento", order: 4, isFrontMatter: false, isPrimaryEditable: true },
  { title: "3. Conclusão", order: 5, isFrontMatter: false, isPrimaryEditable: true },
  { title: "Referências", order: 6, isFrontMatter: false, isPrimaryEditable: false },
];

const TECHNICAL_PROJECT_SECTIONS: ProjectSectionTemplate[] = [
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

const SECONDARY_TYPES = new Set(["SECONDARY_WORK"]);
const TECHNICAL_TYPES = new Set(["TECHNICAL_WORK"]);

export function getSectionsForEducationLevel(
  educationLevel: string | null | undefined,
  projectType: string,
): ProjectSectionTemplate[] {
  if (educationLevel === "SECONDARY") {
    if (SECONDARY_TYPES.has(projectType)) return SECONDARY_PROJECT_SECTIONS;
  }

  if (educationLevel === "TECHNICAL") {
    if (TECHNICAL_TYPES.has(projectType)) return TECHNICAL_PROJECT_SECTIONS;
    if (SECONDARY_TYPES.has(projectType)) return SECONDARY_PROJECT_SECTIONS;
  }

  return DEFAULT_PROJECT_SECTIONS;
}
