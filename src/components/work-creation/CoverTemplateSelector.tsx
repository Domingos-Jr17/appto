"use client";

import { cn } from "@/lib/utils";
import type { AcademicEducationLevel, CoverTemplate } from "@/types/editor";

interface CoverTemplateOption {
  value: CoverTemplate;
  label: string;
  description: string;
  recommended?: AcademicEducationLevel[];
}

const TEMPLATES: CoverTemplateOption[] = [
  { value: "UEM_STANDARD", label: "UEM Standard", description: "Padrão universitário, layout centrado", recommended: ["HIGHER_EDUCATION"] },
  { value: "UCM_STANDARD", label: "UCM Standard", description: "Padrão UCM, com nota de cumprimento", recommended: ["HIGHER_EDUCATION"] },
  { value: "ISRI", label: "ISRI", description: "Estilo ISRI, com República de Moçambique", recommended: ["TECHNICAL", "HIGHER_EDUCATION"] },
  { value: "ABNT_GENERIC", label: "ABNT Genérica", description: "Norma ABNT pura, margens padrão" },
  { value: "MODERNA", label: "Moderna", description: "Linha verde de destaque, estilo contemporâneo" },
  { value: "CLASSICA", label: "Clássica", description: "Bordas decorativas duplas, estilo formal" },
  { value: "SCHOOL_MOZ", label: "Escola Moçambique", description: "Capa para ensino secundário, com REP DE MOÇAMBIQUE", recommended: ["SECONDARY"] },
  { value: "DISCIPLINARY_MOZ", label: "Disciplinar", description: "Capa universitária com faculdade e Nº de Estudante", recommended: ["TECHNICAL", "HIGHER_EDUCATION"] },
];

function getFilteredTemplates(educationLevel?: AcademicEducationLevel): CoverTemplateOption[] {
  if (!educationLevel) return TEMPLATES;

  const hidden: Record<AcademicEducationLevel, CoverTemplate[]> = {
    SECONDARY: ["UEM_STANDARD", "UCM_STANDARD", "ISRI", "DISCIPLINARY_MOZ"],
    TECHNICAL: ["UEM_STANDARD", "UCM_STANDARD", "SCHOOL_MOZ"],
    HIGHER_EDUCATION: ["SCHOOL_MOZ"],
  };

  const hiddenTemplates = hidden[educationLevel] ?? [];
  return TEMPLATES.filter((t) => !hiddenTemplates.includes(t.value));
}

interface CoverTemplateSelectorProps {
  value: CoverTemplate;
  onChange: (value: CoverTemplate) => void;
  educationLevel?: AcademicEducationLevel;
  className?: string;
}

export function CoverTemplateSelector({ value, onChange, educationLevel, className }: CoverTemplateSelectorProps) {
  const templates = getFilteredTemplates(educationLevel);
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium leading-none">
        Estilo da capa
      </label>
      <p className="text-xs text-muted-foreground">
        Escolhe o layout visual da capa do trabalho. Podes mudar depois.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.value}
            type="button"
            onClick={() => onChange(template.value)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              value === template.value
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-border",
            )}
          >
            <div className="mb-2 flex h-14 items-center justify-center rounded-lg bg-muted/40">
              <CoverPreviewIcon template={template.value} />
            </div>
            <p className="text-xs font-medium leading-tight">{template.label}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CoverPreviewIcon({ template }: { template: CoverTemplate }) {
  const base = "h-[2px] rounded-full";
  switch (template) {
    case "UEM_STANDARD":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-8 bg-border")} />
          <div className={cn(base, "w-10 bg-foreground/30")} />
          <div className={cn(base, "w-6 bg-border")} />
        </div>
      );
    case "UCM_STANDARD":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-8 bg-border")} />
          <div className={cn(base, "w-6 bg-border")} />
          <div className={cn(base, "w-10 bg-foreground/30")} />
        </div>
      );
    case "ISRI":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-12 bg-border")} />
          <div className={cn(base, "w-8 bg-border")} />
          <div className={cn(base, "w-10 bg-foreground/30")} />
        </div>
      );
    case "ABNT_GENERIC":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-10 bg-foreground/30")} />
          <div className="h-3" />
          <div className={cn(base, "w-8 bg-border")} />
        </div>
      );
    case "MODERNA":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="h-[3px] w-14 rounded-full bg-primary" />
          <div className={cn(base, "w-10 bg-foreground/30")} />
          <div className={cn(base, "w-4 bg-primary/50")} />
        </div>
      );
    case "CLASSICA":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="h-10 w-12 rounded border border-dashed border-border" />
        </div>
      );
    case "SCHOOL_MOZ":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-6 bg-border")} />
          <div className={cn(base, "w-10 bg-foreground/20")} />
          <div className={cn(base, "w-8 bg-foreground/30")} />
        </div>
      );
    case "DISCIPLINARY_MOZ":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-10 bg-foreground/20")} />
          <div className={cn(base, "w-7 bg-border")} />
          <div className={cn(base, "w-10 bg-foreground/30")} />
        </div>
      );
    default:
      return null;
  }
}
