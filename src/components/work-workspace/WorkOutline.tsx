"use client";

import { CheckCircle2, Circle, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section } from "@/types/editor";

interface WorkOutlineProps {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (section: Section) => void;
}

export function WorkOutline({ sections, activeSectionId, onSelectSection }: WorkOutlineProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Estrutura do trabalho
      </p>
      <div className="space-y-2">
        {sections.map((section) => (
          <OutlineRow
            key={section.id}
            section={section}
            depth={0}
            activeSectionId={activeSectionId}
            onSelectSection={onSelectSection}
          />
        ))}
      </div>
    </div>
  );
}

function OutlineRow({
  section,
  depth,
  activeSectionId,
  onSelectSection,
}: {
  section: Section;
  depth: number;
  activeSectionId: string | null;
  onSelectSection: (section: Section) => void;
}) {
  const active = section.id === activeSectionId;
  const status = getSectionState(section.wordCount);
  const StatusIcon = status.icon;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSelectSection(section)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
          active
            ? "border-primary/30 bg-primary/10"
            : status.tone === "done"
              ? "border-border/60 bg-background/70 hover:bg-background"
              : status.tone === "editing"
                ? "border-warning/40 bg-warning/10 hover:bg-warning/15"
                : "border-border/60 bg-muted/20 hover:bg-muted/35"
        )}
        style={{ marginLeft: depth * 10 }}
      >
        <StatusIcon className={cn("h-4 w-4 shrink-0", status.iconClass)} />
        <span className={cn("flex-1 text-sm", active ? "font-semibold text-foreground" : "text-foreground/90")}>{section.title}</span>
        <span className={cn("text-[11px] font-medium", status.textClass)}>{status.label}</span>
      </button>

      {section.children.length > 0 ? (
        <div className="space-y-2">
          {section.children.map((child) => (
            <OutlineRow
              key={child.id}
              section={child}
              depth={depth + 1}
              activeSectionId={activeSectionId}
              onSelectSection={onSelectSection}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getSectionState(wordCount: number) {
  if (wordCount <= 0) {
    return {
      label: "Pendente",
      icon: Circle,
      tone: "pending" as const,
      iconClass: "text-muted-foreground",
      textClass: "text-muted-foreground",
    };
  }

  if (wordCount < 180) {
    return {
      label: "A editar",
      icon: PencilLine,
      tone: "editing" as const,
      iconClass: "text-warning",
      textClass: "text-warning",
    };
  }

  return {
    label: "Pronto",
    icon: CheckCircle2,
    tone: "done" as const,
    iconClass: "text-success",
    textClass: "text-success",
  };
}
