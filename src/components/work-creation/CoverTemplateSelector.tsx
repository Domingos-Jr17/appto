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
  { value: "UEM_STANDARD", label: "UEM", description: "Universidade Eduardo Mondlane", recommended: ["HIGHER_EDUCATION"] },
  { value: "UP", label: "UP", description: "Universidade Pedagógica", recommended: ["HIGHER_EDUCATION"] },
  { value: "UDM", label: "UDM", description: "Universidade de Moçambique", recommended: ["HIGHER_EDUCATION"] },
  { value: "ABNT_GENERIC", label: "ABNT", description: "Qualquer instituição" },
  { value: "SCHOOL_MOZ", label: "Escola Moçambique", description: "Ensino secundário", recommended: ["SECONDARY"] },
  { value: "DISCIPLINARY_MOZ", label: "Técnico", description: "Ensino técnico e profissional", recommended: ["TECHNICAL"] },
];

function getFilteredTemplates(educationLevel?: AcademicEducationLevel): CoverTemplateOption[] {
  if (!educationLevel) return TEMPLATES;

  const hidden: Record<AcademicEducationLevel, CoverTemplate[]> = {
    SECONDARY: ["UEM_STANDARD", "UP", "UDM", "DISCIPLINARY_MOZ"],
    TECHNICAL: ["UEM_STANDARD", "UP", "UDM", "SCHOOL_MOZ"],
    HIGHER_EDUCATION: ["SCHOOL_MOZ", "DISCIPLINARY_MOZ"],
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
    case "UP":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-10 bg-border")} />
          <div className={cn(base, "w-8 bg-foreground/30")} />
          <div className={cn(base, "w-6 bg-border")} />
        </div>
      );
    case "UDM":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn(base, "w-8 bg-border")} />
          <div className={cn(base, "w-6 bg-foreground/30")} />
          <div className={cn(base, "w-10 bg-border")} />
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
