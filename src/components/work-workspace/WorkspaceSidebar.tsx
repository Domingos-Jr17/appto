"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WorkOutline } from "@/components/work-workspace/WorkOutline";
import { WorkspaceOnboardingTooltip } from "@/components/work-workspace/WorkspaceOnboardingTooltip";
import { cn } from "@/lib/utils";
import type { Project, Section } from "@/types/editor";

interface WorkspaceSidebarProps {
  project: Project;
  sections: Section[];
  activeSectionId: string | null;
  onSectionSelect: (section: Section) => void;
  footer?: ReactNode;
}

export function WorkspaceSidebar({
  project,
  sections,
  activeSectionId,
  onSectionSelect,
  footer,
}: WorkspaceSidebarProps) {
  const institutionLine = [project.brief?.institutionName, project.brief?.courseName]
    .filter(Boolean)
    .join(" · ");

  const totalSections = sections.length;
  const completedSections = sections.filter((section) => section.wordCount >= 180).length;
  const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col rounded-[24px] border border-border/60 bg-background lg:w-[320px] lg:rounded-none lg:border-0 lg:border-r">
      <div className="shrink-0 border-b border-border/60 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full text-xs">
            {formatProjectType(project.type)}
          </Badge>
          {institutionLine ? (
            <span className="text-xs text-muted-foreground">{institutionLine}</span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-tight tracking-tight text-foreground">
          {project.title}
        </h3>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso: {completedSections}/{totalSections} secções</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/40">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPercent >= 100 ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent >= 100 ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Todos os capítulos completos!
            </div>
          ) : null}
        </div>
      </div>

      <WorkspaceOnboardingTooltip />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        <WorkOutline
          sections={sections}
          activeSectionId={activeSectionId}
          onSelectSection={onSectionSelect}
        />
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-border/60 px-3 py-3">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}

function formatProjectType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
