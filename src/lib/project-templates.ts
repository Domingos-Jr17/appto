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


