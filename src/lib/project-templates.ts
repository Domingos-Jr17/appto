export interface ProjectSectionTemplate {
  title: string;
  order: number;
  isFrontMatter: boolean;
  isPrimaryEditable: boolean;
}

export const DEFAULT_PROJECT_SECTIONS: ProjectSectionTemplate[] = [
  { title: "Capa", order: 1, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Resumo", order: 2, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Abstract", order: 3, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Agradecimentos", order: 4, isFrontMatter: true, isPrimaryEditable: false },
  { title: "Índice", order: 5, isFrontMatter: true, isPrimaryEditable: false },
  { title: "1. Introdução", order: 6, isFrontMatter: false, isPrimaryEditable: true },
  { title: "2. Revisão da Literatura", order: 7, isFrontMatter: false, isPrimaryEditable: true },
  { title: "3. Metodologia", order: 8, isFrontMatter: false, isPrimaryEditable: true },
  { title: "4. Resultados", order: 9, isFrontMatter: false, isPrimaryEditable: true },
  { title: "5. Discussão", order: 10, isFrontMatter: false, isPrimaryEditable: true },
  { title: "6. Conclusão", order: 11, isFrontMatter: false, isPrimaryEditable: true },
  { title: "Referências", order: 12, isFrontMatter: false, isPrimaryEditable: false },
  { title: "Anexos", order: 13, isFrontMatter: false, isPrimaryEditable: false },
];

export function getFirstEditableSection(sections: Array<{ title: string; order?: number; isPrimaryEditable?: boolean }>): string | null {
  const first = sections.find((s) => s.isPrimaryEditable);
  return first?.title ?? null;
}

export function getFirstEditableSectionByTitle(
  sections: Array<{ title: string }>
): { id: string; title: string } | null {
  for (const section of sections) {
    if (DEFAULT_PROJECT_SECTIONS.some(
      (tpl) => tpl.title === section.title && tpl.isPrimaryEditable
    )) {
      return section as { id: string; title: string };
    }
  }
  return sections.length > 0 ? (sections[0] as { id: string; title: string }) : null;
}

export interface SectionForTemplate {
  title: string;
  id: string;
  order: number;
  updatedAt?: string;
}

export function findMeaningfulResumeSection(
  sections: SectionForTemplate[]
): SectionForTemplate | null {
  if (sections.length === 0) return null;

  const now = Date.now();
  const recentThreshold = 1000 * 60 * 60 * 24 * 7;

  let mostRecentEditable: SectionForTemplate | null = null;

  for (const section of sections) {
    const isEditable = DEFAULT_PROJECT_SECTIONS.some(
      (tpl) => tpl.title === section.title && tpl.isPrimaryEditable
    );

    if (isEditable && section.updatedAt) {
      const updatedAt = new Date(section.updatedAt).getTime();
      if (now - updatedAt < recentThreshold) {
        if (!mostRecentEditable || updatedAt > new Date(mostRecentEditable.updatedAt!).getTime()) {
          mostRecentEditable = section;
        }
      }
    }
  }

  if (mostRecentEditable) return mostRecentEditable;

  for (const section of sections) {
    const isEditable = DEFAULT_PROJECT_SECTIONS.some(
      (tpl) => tpl.title === section.title && tpl.isPrimaryEditable
    );
    if (isEditable) return section;
  }

  return sections[0] || null;
}
