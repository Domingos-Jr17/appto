"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { flattenSections } from "@/lib/editor-helpers";
import type { Project, Section } from "@/types/editor";

interface PreviewPaneProps {
  project: Project;
  sections: Section[];
}

function buildNumberedSections(sections: Section[], prefix = ""): Array<{
  number: string;
  title: string;
  content: string;
  id: string;
  isChapter: boolean;
}> {
  const result: Array<{
    number: string;
    title: string;
    content: string;
    id: string;
    isChapter: boolean;
  }> = [];

  sections.forEach((section, index) => {
    const num = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
    const isChapter = section.parentId === null;
    result.push({
      number: num,
      title: section.title,
      content: section.content,
      id: section.id,
      isChapter,
    });
    if (section.children.length > 0) {
      result.push(...buildNumberedSections(section.children, num));
    }
  });

  return result;
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString("pt-MZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PreviewPane({ project, sections }: PreviewPaneProps) {
  const numberedSections = useMemo(() => buildNumberedSections(sections), [sections]);
  const totalWords = useMemo(
    () => flattenSections(sections).reduce((sum, s) => sum + s.wordCount, 0),
    [sections]
  );

  const hasContent = numberedSections.some((s) => s.content.trim().length > 0);

  return (
    <div className="flex min-h-0 flex-1 justify-center bg-muted/20">
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-[720px] px-6 py-10">
          {/* Capa */}
          <div className="mb-12 flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {project.type.replace(/_/g, " ")}
                </p>
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground">
                  {project.title}
                </h1>
                {project.description ? (
                  <p className="mt-3 text-base text-muted-foreground">
                    {project.description}
                  </p>
                ) : null}
              </div>

              <div className="mx-auto h-px w-16 bg-border" />

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{getTodayFormatted()}</p>
                <p className="text-xs">
                  {numberedSections.length} seccoes · {totalWords.toLocaleString("pt-MZ")} palavras
                </p>
              </div>
            </div>
          </div>

          {/* Indice */}
          {numberedSections.length > 0 ? (
            <div className="mb-12">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Indice</h2>
              <div className="space-y-1.5">
                {numberedSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/40 ${
                      section.isChapter ? "font-semibold" : "ml-4 text-muted-foreground"
                    }`}
                  >
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {section.number}
                    </span>
                    <span className="text-foreground">{section.title}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {/* Seccoes */}
          {hasContent ? (
            <div className="space-y-10">
              {numberedSections.map((section) => (
                <div key={section.id} id={`section-${section.id}`} className="scroll-mt-6">
                  {section.isChapter ? (
                    <h2 className="mb-4 border-b border-border/40 pb-2 text-xl font-bold text-foreground">
                      <span className="mr-2 text-muted-foreground">{section.number}</span>
                      {section.title}
                    </h2>
                  ) : (
                    <h3 className="mb-3 text-lg font-semibold text-foreground">
                      <span className="mr-2 text-muted-foreground">{section.number}</span>
                      {section.title}
                    </h3>
                  )}

                  {section.content.trim() ? (
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none leading-relaxed">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Secção ainda sem conteúdo.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">
                O documento ainda não tem conteúdo escrito.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Escreva nas secções do editor para ver o preview aqui.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
