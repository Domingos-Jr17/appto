"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { WorkOutline } from "@/components/work-workspace/WorkOutline";
import type { Project, Section } from "@/types/editor";

interface WorkspaceSidebarProps {
  project: Project;
  sections: Section[];
  activeSectionId: string | null;
  onSectionSelect: (section: Section) => void;
  assistant?: ReactNode;
}

export function WorkspaceSidebar({
  project,
  sections,
  activeSectionId,
  onSectionSelect,
  assistant,
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
          <Badge variant="outline" className="rounded-full text-[10px]">
            {formatProjectType(project.type)}
          </Badge>
          {institutionLine ? (
            <span className="text-[10px] text-muted-foreground">{institutionLine}</span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-tight tracking-tight text-foreground">
          {project.title}
        </h3>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progresso: {completedSections}/{totalSections} secções</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        <WorkOutline
          sections={sections}
          activeSectionId={activeSectionId}
          onSelectSection={onSectionSelect}
        />
      </div>

      {assistant ? (
        <div className="min-h-0 shrink-0 border-t border-border/60 lg:basis-[42%] lg:shrink lg:grow">
          {assistant}
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
