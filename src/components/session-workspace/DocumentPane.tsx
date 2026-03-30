"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Section } from "@/types/editor";

interface DocumentPaneProps {
  activeSection: Section | null;
  documentTitle: string;
  documentContent: string;
  onDocumentTitleChange: (title: string) => void;
  onDocumentContentChange: (content: string) => void;
}

export function DocumentPane({
  activeSection,
  documentTitle,
  documentContent,
  onDocumentTitleChange,
  onDocumentContentChange,
}: DocumentPaneProps) {
  return (
    <div className="flex h-full flex-col bg-card text-card-foreground">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          <div className="glass glass-border rounded-2xl p-4">
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
              placeholder="A secção activa aparece aqui. Use o assistente para gerar e refine o texto directamente neste painel."
              disabled={!activeSection}
              className="min-h-[420px] resize-none rounded-2xl border-border/70 bg-background/70 p-4 text-sm leading-7"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
