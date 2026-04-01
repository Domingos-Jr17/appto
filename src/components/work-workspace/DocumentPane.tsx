"use client";

import { Download, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EditWorkBriefDialog } from "@/components/work-workspace/EditWorkBriefDialog";
import type { AcademicEducationLevel, CitationStyle, Project, Section } from "@/types/editor";

interface DocumentPaneProps {
  project: Project;
  sections: Section[];
  activeSection: Section | null;
  isSavingExport: boolean;
  onExport: () => void;
  onGenerateSection: (sectionTitle: string) => void;
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
  isSavingExport,
  onExport,
  onGenerateSection,
  onBriefSave,
}: DocumentPaneProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-card-foreground">
      <div className="glass-header shrink-0 border-b border-border/60 px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {activeSection
                ? activeSection.title
                : project.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeSection
                ? "Preview da secção"
                : "Escolhe uma secção da estrutura"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <EditWorkBriefDialog brief={project.brief} onSave={onBriefSave} />
            <Button onClick={onExport} className="rounded-2xl px-4 text-xs" disabled={isSavingExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {isSavingExport ? "A preparar..." : "Descarregar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6 lg:py-8">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection?.id ?? "overview"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection ? (
                <DocumentPreview section={activeSection} onGenerateSection={onGenerateSection} />
              ) : sections.length > 0 ? (
                <DocumentFullPreview sections={sections} projectTitle={project.title} onGenerateSection={onGenerateSection} />
              ) : (
                <EmptyPreview onGenerateSection={onGenerateSection} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function DocumentPreview({ section, onGenerateSection }: { section: Section; onGenerateSection: (title: string) => void }) {
  if (!section.content && section.wordCount <= 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-8">
          <p className="text-sm font-medium text-foreground">{section.title}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Esta secção ainda não tem conteúdo.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => onGenerateSection(section.title)}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Escrever com IA
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
      <div className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap">
        {section.content}
      </div>
      <p className="text-xs text-muted-foreground">
        {section.wordCount.toLocaleString("pt-MZ")} palavras
      </p>
    </article>
  );
}

function DocumentFullPreview({ sections, projectTitle, onGenerateSection }: { sections: Section[]; projectTitle: string; onGenerateSection: (title: string) => void }) {
  return (
    <article className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">{projectTitle}</h1>
      {sections.map((section) => (
        <section key={section.id} className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
          {section.content ? (
            <div className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap">
              {section.content}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onGenerateSection(section.title)}
              className="flex items-center gap-1.5 text-xs italic text-muted-foreground transition-colors hover:text-foreground"
            >
              <Sparkles className="h-3 w-3" />
              Conteúdo pendente — gerar
            </button>
          )}
          {section.children.map((child) => (
            <section key={child.id} className="ml-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground/90">{child.title}</h3>
              {child.content ? (
                <div className="text-sm leading-7 text-foreground/80 whitespace-pre-wrap">
                  {child.content}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onGenerateSection(child.title)}
                  className="flex items-center gap-1.5 text-xs italic text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3" />
                  Conteúdo pendente — gerar
                </button>
              )}
            </section>
          ))}
        </section>
      ))}
    </article>
  );
}

function EmptyPreview({ onGenerateSection }: { onGenerateSection: (title: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <p className="text-sm text-muted-foreground">
        Ainda não há secções para mostrar.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full"
        onClick={() => onGenerateSection("")}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Gerar estrutura do trabalho
      </Button>
    </div>
  );
}
