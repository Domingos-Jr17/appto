import type { AcademicEducationLevel } from "@/types/editor";
import type { CoverTemplate } from "@/types/editor";

export interface CoverTemplateConfig {
  id: CoverTemplate;
  name: string;
  description: string;
  educationLevels: AcademicEducationLevel[];
}

export const COVER_TEMPLATES: CoverTemplateConfig[] = [
  {
    id: "UEM_STANDARD",
    name: "UEM",
    description: "Universidade Eduardo Mondlane",
    educationLevels: ["HIGHER_EDUCATION"],
  },
  {
    id: "UCM_STANDARD",
    name: "UCM",
    description: "Universidade Católica",
    educationLevels: ["HIGHER_EDUCATION"],
  },
  {
    id: "ISRI",
    name: "ISRI",
    description: "Relações Internacionais",
    educationLevels: ["TECHNICAL", "HIGHER_EDUCATION"],
  },
  {
    id: "ABNT_GENERIC",
    name: "ABNT",
    description: "Qualquer instituição",
    educationLevels: ["SECONDARY", "TECHNICAL", "HIGHER_EDUCATION"],
  },
  {
    id: "MODERNA",
    name: "Moderna",
    description: "Relatórios e propostas",
    educationLevels: ["SECONDARY", "TECHNICAL", "HIGHER_EDUCATION"],
  },
  {
    id: "CLASSICA",
    name: "Clássica",
    description: "Contextos formais",
    educationLevels: ["SECONDARY", "TECHNICAL", "HIGHER_EDUCATION"],
  },
  {
    id: "SCHOOL_MOZ",
    name: "Escola Moçambique",
    description: "Ensino secundário",
    educationLevels: ["SECONDARY"],
  },
  {
    id: "DISCIPLINARY_MOZ",
    name: "Disciplinar",
    description: "Faculdade e Nº de Estudante",
    educationLevels: ["TECHNICAL", "HIGHER_EDUCATION"],
  },
];

export function getTemplatesForLevel(
  educationLevel?: AcademicEducationLevel
): CoverTemplateConfig[] {
  if (!educationLevel) return COVER_TEMPLATES;
  return COVER_TEMPLATES.filter((t) => t.educationLevels.includes(educationLevel));
}
