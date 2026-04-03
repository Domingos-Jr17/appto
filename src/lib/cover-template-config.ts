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
    id: "UP",
    name: "UP",
    description: "Universidade Pedagógica",
    educationLevels: ["HIGHER_EDUCATION"],
  },
  {
    id: "UDM",
    name: "UDM",
    description: "Universidade de Moçambique",
    educationLevels: ["HIGHER_EDUCATION"],
  },
  {
    id: "ABNT_GENERIC",
    name: "ABNT",
    description: "Qualquer instituição",
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
    name: "Técnico",
    description: "Ensino técnico e profissional",
    educationLevels: ["TECHNICAL"],
  },
];

export function getTemplatesForLevel(
  educationLevel?: AcademicEducationLevel
): CoverTemplateConfig[] {
  if (!educationLevel) return COVER_TEMPLATES;
  return COVER_TEMPLATES.filter((t) => t.educationLevels.includes(educationLevel));
}

export function getTemplateLabel(id: string): string {
  const tpl = COVER_TEMPLATES.find(t => t.id === id);
  return tpl ? tpl.name : id;
}
