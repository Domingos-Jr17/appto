"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkSection } from "@/types/workspace";

interface DocumentPreviewProps {
  sections: WorkSection[];
  isGenerating: boolean;
  onGenerate: () => void;
}

export function DocumentPreview({
  sections,
  isGenerating,
  onGenerate,
}: DocumentPreviewProps) {
  const hasContent = sections.some(
    (s) => s.status === "done" && s.content.trim().length > 0
  );

  if (!hasContent && !isGenerating) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-8 py-12">
          <p className="text-sm font-medium text-foreground">
            O teu trabalho vai aparecer aqui
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Clica em &quot;Gerar tudo&quot; para criar o conteúdo automaticamente.
          </p>
          <Button
            size="sm"
            className="mt-6 rounded-full"
            onClick={onGenerate}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Gerar tudo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <article className="space-y-8">
        {sections.map((section) => (
          <DocumentSection key={section.id} section={section} />
        ))}
      </article>
    </div>
  );
}

function DocumentSection({ section }: { section: WorkSection }) {
  const isCapa = section.title === "Capa";

  if (section.status === "done" && section.content.trim()) {
    if (isCapa) {
      return (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {section.title}
          </h2>
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-6 py-10 text-center">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground/85">
              {section.content}
            </pre>
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          {section.title}
        </h2>
        <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/85">
          {section.content}
        </div>
      </section>
    );
  }

  if (section.status === "generating") {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-muted-foreground">
          {section.title}
        </h2>
        <div className="flex items-center gap-3 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-xs text-muted-foreground">A gerar...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-muted-foreground/50">
        {section.title}
      </h2>
      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/10" />
    </section>
  );
}
