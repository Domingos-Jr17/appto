"use client";

import { DocumentTree } from "@/components/editor/DocumentTree";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Section } from "@/types/editor";

type WorkspaceMode = "chat" | "document" | "structure" | "preview";

interface MobileSheetsProps {
  projectTitle: string;
  sections: Section[];
  activeSectionId: string | null;
  workspaceMode: WorkspaceMode;
  mobileStructureOpen: boolean;
  mobileContextOpen: boolean;
  onMobileStructureOpenChange: (open: boolean) => void;
  onMobileContextOpenChange: (open: boolean) => void;
  onSectionSelect: (sectionId: string) => void;
  onSectionAdd: (parentId?: string) => void;
  onSectionRename: (sectionId: string, newTitle: string) => void;
  onSectionDelete: (sectionId: string) => void;
  onSectionReorder: (sections: Section[]) => void;
  contextPanel: React.ReactNode;
}

export function MobileSheets({
  projectTitle,
  sections,
  activeSectionId,
  workspaceMode,
  mobileStructureOpen,
  mobileContextOpen,
  onMobileStructureOpenChange,
  onMobileContextOpenChange,
  onSectionSelect,
  onSectionAdd,
  onSectionRename,
  onSectionDelete,
  onSectionReorder,
  contextPanel,
}: MobileSheetsProps) {
  const structurePanel = (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background/80 shadow-sm">
      <DocumentTree
        projectTitle={projectTitle}
        sections={sections}
        activeSectionId={activeSectionId}
        onSectionSelect={(id) => {
          onSectionSelect(id);
          onMobileStructureOpenChange(false);
        }}
        onSectionAdd={onSectionAdd}
        onSectionRename={onSectionRename}
        onSectionDelete={onSectionDelete}
        onSectionReorder={onSectionReorder}
      />
    </div>
  );

  return (
    <>
      <Sheet open={mobileStructureOpen} onOpenChange={onMobileStructureOpenChange}>
        <SheetContent side="left" className="w-[340px] max-w-[92vw] p-0">
          <SheetHeader className="border-b border-border/50 px-4 py-4">
            <SheetTitle>Estrutura do projecto</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-72px)] overflow-hidden">{structurePanel}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileContextOpen} onOpenChange={onMobileContextOpenChange}>
        <SheetContent side="right" className="w-[360px] max-w-[92vw] p-0">
          <SheetHeader className="border-b border-border/50 px-4 py-4">
            <SheetTitle>
              {workspaceMode === "document"
                ? "Apoio tactico"
                : workspaceMode === "structure"
                  ? "Leitura editorial"
                  : "Contexto de trabalho"}
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-72px)] overflow-auto">{contextPanel}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
