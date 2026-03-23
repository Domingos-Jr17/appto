"use client";

import { Plus } from "lucide-react";
import { DocumentTree } from "@/components/editor/DocumentTree";
import { ContextRail } from "@/components/workspace/ContextRail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/editor-helpers";
import type { Project, Section } from "@/types/editor";

interface StructureModeProps {
  project: Project;
  sections: Section[];
  activeSection: Section | null;
  activeSectionId: string | null;
  contextRailOpen: boolean;
  onContextRailToggle: () => void;
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
  activeSection,
  activeSectionId,
  contextRailOpen,
  onContextRailToggle,
  onSectionSelect,
  onSectionAdd,
  onSectionRename,
  onSectionDelete,
  onSectionReorder,
  onModeChange,
}: StructureModeProps) {
  const structurePanel = (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background/80 shadow-sm">
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
  );

  const contextPanel = (
    <div className="space-y-4 p-4">
      <Card className="border-border/60 bg-muted/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumo editorial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
            <span>Vazias</span>
            <span className="font-medium text-foreground">{project.sectionSummary.empty}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
            <span>Iniciadas</span>
            <span className="font-medium text-foreground">{project.sectionSummary.started}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
            <span>Em desenvolvimento</span>
            <span className="font-medium text-foreground">{project.sectionSummary.drafting}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
            <span>Prontas para revisao</span>
            <span className="font-medium text-foreground">{project.sectionSummary.review}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
            <span>Paradas</span>
            <span className="font-medium text-foreground">{project.sectionSummary.stale}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-muted/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Secao seleccionada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">
              {activeSection?.title || "Sem seleccao"}
            </p>
            <p className="mt-1">
              {activeSection
                ? `${activeSection.wordCount.toLocaleString("pt-MZ")} palavras`
                : "Escolha uma secao para abrir no editor."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full rounded-2xl"
              onClick={() => onModeChange("document")}
              disabled={!activeSectionId}
            >
              Abrir no documento
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => onSectionAdd(activeSectionId || undefined)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar subtitulo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full flex-col gap-4 overflow-hidden p-4 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-h-0 overflow-hidden">{structurePanel}</div>
            <div className="hidden space-y-4 lg:block">
              <Card className="border-border/60 bg-background/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumo editorial</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                      Vazias
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {project.sectionSummary.empty}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                      Em desenvolvimento
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {project.sectionSummary.drafting}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                      Prontas
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {project.sectionSummary.review}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Secao em foco</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">
                      {activeSection?.title || "Sem seleccao"}
                    </p>
                    <p className="mt-1">
                      {activeSection
                        ? `${activeSection.wordCount.toLocaleString("pt-MZ")} palavras · ${formatRelativeDate(activeSection.updatedAt)}`
                        : "Seleccione uma secao para abrir no documento."}
                    </p>
                  </div>
                  <Button
                    className="w-full rounded-2xl"
                    onClick={() => onModeChange("document")}
                    disabled={!activeSectionId}
                  >
                    Abrir no documento
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <ContextRail
        title="Leitura editorial"
        description="Resumo do plano e accoes para a secao seleccionada."
        open={contextRailOpen}
        onToggle={onContextRailToggle}
      >
        {contextPanel}
      </ContextRail>
    </div>
  );
}
