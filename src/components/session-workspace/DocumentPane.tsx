"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { getSaveCopy } from "@/lib/editor-helpers";
import type { AutoSaveStatus, Section } from "@/types/editor";

interface DocumentPaneProps {
  activeSection: Section | null;
  documentTitle: string;
  documentContent: string;
  documentWordCount: number;
  saveStatus: AutoSaveStatus;
  lastSaved: Date | undefined;
  onDocumentTitleChange: (title: string) => void;
  onDocumentContentChange: (content: string) => void;
}

export function DocumentPane({
  activeSection,
  documentTitle,
  documentContent,
  documentWordCount,
  saveStatus,
  lastSaved,
  onDocumentTitleChange,
  onDocumentContentChange,
}: DocumentPaneProps) {
  const saveCopy = getSaveCopy(saveStatus, lastSaved);

  return (
    <div className="flex h-full flex-col bg-card text-card-foreground">
      <div className="glass-header flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Badge variant="outline" className="rounded-full">
          {activeSection ? "Secção activa" : "Resumo"}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          {documentWordCount.toLocaleString("pt-MZ")} palavras
        </Badge>
        {saveStatus === "saving" ? (
          <Badge variant="outline" className="rounded-full gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {saveCopy}
          </Badge>
        ) : saveStatus === "error" ? (
          <Badge variant="outline" className="rounded-full gap-1 text-destructive border-destructive/40">
            <AlertCircle className="h-3 w-3" />
            {saveCopy}
          </Badge>
        ) : lastSaved ? (
          <Badge variant="outline" className="rounded-full gap-1 text-muted-foreground">
            <Check className="h-3 w-3" />
            {saveCopy}
          </Badge>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div className=" glass glass-border rounded-2xl p-4">
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
              className="min-h-[420px] resize-none rounded-xl border-border/70 bg-background/70 p-4 text-sm leading-7"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
