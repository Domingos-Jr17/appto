"use client";

import { DocumentTree } from "@/components/editor/DocumentTree";
import type { Project, Section } from "@/types/editor";

interface StructureModeProps {
  project: Project;
  sections: Section[];
  activeSection: Section | null;
  activeSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
  onSectionAdd: (parentId?: string) => void;
  onSectionRename: (sectionId: string, newTitle: string) => void;
  onSectionDelete: (sectionId: string) => void;
  onSectionReorder: (sections: Section[]) => void;
  onModeChange: (mode: "chat" | "document" | "structure") => void;
}

export function StructureMode({
  project,
  sections,
  activeSectionId,
  onSectionSelect,
  onSectionAdd,
  onSectionRename,
  onSectionDelete,
  onSectionReorder,
}: StructureModeProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="mx-auto flex min-w-0 max-w-3xl flex-1 flex-col p-4 lg:p-6">
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm">
          <DocumentTree
            projectTitle={project.title}
            sections={sections}
            activeSectionId={activeSectionId}
            onSectionSelect={onSectionSelect}
            onSectionAdd={onSectionAdd}
            onSectionRename={onSectionRename}
            onSectionDelete={onSectionDelete}
            onSectionReorder={onSectionReorder}
          />
        </div>
      </div>
    </div>
  );
}
