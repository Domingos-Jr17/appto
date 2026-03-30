"use client";

import { Download, FileText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkOutline } from "@/components/work-workspace/WorkOutline";
import { EditWorkBriefDialog } from "@/components/work-workspace/EditWorkBriefDialog";
import type { AcademicEducationLevel, CitationStyle, Project, Section } from "@/types/editor";

interface DocumentPaneProps {
  project: Project;
  sections: Section[];
  activeSection: Section | null;
  activeSectionId: string | null;
  documentTitle: string;
  documentContent: string;
  isSavingExport: boolean;
  onSectionSelect: (section: Section) => void;
  onDocumentTitleChange: (title: string) => void;
  onDocumentContentChange: (content: string) => void;
  onExport: () => void;
  onRegenerateWork: () => void;
  onRegenerateSection: () => void;
  onBriefSave: (payload: {
    institutionName?: string;
    courseName?: string;
    subjectName?: string;
    advisorName?: string;
    studentName?: string;
    city?: string;
    academicYear?: number;
    educationLevel?: AcademicEducationLevel;
    objective?: string;
    methodology?: string;
    citationStyle?: CitationStyle;
  }) => Promise<void>;
}

export function DocumentPane({
  project,
  sections,
  activeSection,
  activeSectionId,
  documentTitle,
  documentContent,
  isSavingExport,
  onSectionSelect,
  onDocumentTitleChange,
  onDocumentContentChange,
  onExport,
  onRegenerateWork,
  onRegenerateSection,
  onBriefSave,
}: DocumentPaneProps) {
  const institutionLine = [project.brief?.institutionName, project.brief?.courseName].filter(Boolean).join(" · ");

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-card-foreground">
      <div className="glass-header border-b border-border/60 px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full">
                {formatProjectType(project.type)}
              </Badge>
              {institutionLine ? <span className="text-xs text-muted-foreground">{institutionLine}</span> : null}
            </div>
            <div>
              <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-foreground">{project.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeSection
                  ? `Secção activa: ${activeSection.title}`
                  : "Escolha uma secção da estrutura para rever o trabalho gerado."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <EditWorkBriefDialog brief={project.brief} onSave={onBriefSave} />
            <Button variant="outline" onClick={onRegenerateWork} className="rounded-2xl px-4">
              <RotateCcw className="mr-2 h-4 w-4" />
              Regenerar trabalho
            </Button>
            <Button onClick={onExport} className="rounded-2xl px-4" disabled={isSavingExport}>
              <Download className="mr-2 h-4 w-4" />
              {isSavingExport ? "A preparar DOCX..." : "Descarregar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="glass glass-border rounded-[24px] p-4">
            <WorkOutline
              sections={sections}
              activeSectionId={activeSectionId}
              onSelectSection={onSectionSelect}
            />
          </div>

          <div className="glass glass-border min-w-0 rounded-[24px] p-4 lg:p-5">
            {project.brief ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {project.brief.advisorName ? (
                  <Badge variant="secondary" className="rounded-full">Orientador: {project.brief.advisorName}</Badge>
                ) : null}
                {project.brief.studentName ? (
                  <Badge variant="secondary" className="rounded-full">Estudante: {project.brief.studentName}</Badge>
                ) : null}
                {project.brief.citationStyle ? (
                  <Badge variant="secondary" className="rounded-full">Norma: {project.brief.citationStyle}</Badge>
                ) : null}
              </div>
            ) : null}

            {project.generationStatus === "GENERATING" ? (
              <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground">
                <p className="font-medium">A aptto está a regenerar o trabalho</p>
                <p className="mt-1 text-muted-foreground">
                  {project.generationStep || "A reconstruir as secções com base no briefing actual."}
                  {typeof project.generationProgress === "number" ? ` (${project.generationProgress}%)` : ""}
                </p>
              </div>
            ) : null}

            <Input
              value={documentTitle}
              onChange={(event) => onDocumentTitleChange(event.target.value)}
              placeholder="Título da secção"
              disabled={!activeSection}
              className="mb-3 h-11 rounded-2xl border-border/70 bg-background/70 text-base font-semibold"
            />
            <Textarea
              value={documentContent}
              onChange={(event) => onDocumentContentChange(event.target.value)}
              placeholder="O conteúdo gerado do trabalho aparece aqui. Escolha uma secção para rever, corrigir e complementar o texto."
              disabled={!activeSection}
              className="min-h-[520px] resize-none rounded-2xl border-border/70 bg-background/70 p-4 text-sm leading-7"
            />

            {activeSection ? (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={onRegenerateSection} className="rounded-2xl px-4">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Regenerar secção activa
                </Button>
              </div>
            ) : null}

            {!activeSection ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Escolhe uma secção da estrutura para abrir o conteúdo do trabalho.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatProjectType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
