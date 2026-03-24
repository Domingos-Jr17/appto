"use client";

import { Check, Copy, Eye, FileText, GitBranch, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DocumentTree } from "@/components/editor/DocumentTree";
import { PreviewPane } from "@/components/editor/PreviewPane";
import type { Project, Section } from "@/types/editor";
import type { WorkspaceArtifactSource, WorkspaceDocumentTab } from "./workspace-types";

interface WorkspaceDocumentPanelProps {
  project: Project;
  sections: Section[];
  activeSection: Section | null;
  documentTitle: string;
  documentContent: string;
  documentWordCount: number;
  artifact: WorkspaceArtifactSource;
  tab: WorkspaceDocumentTab;
  copied: boolean;
  collapsed: boolean;
  onTabChange: (tab: WorkspaceDocumentTab) => void;
  onCopy: () => void;
  onToggleCollapsed: () => void;
  onDocumentTitleChange: (title: string) => void;
  onDocumentContentChange: (content: string) => void;
  onSectionSelect: (sectionId: string) => void;
  onSectionAdd: (parentId?: string) => void;
  onSectionRename: (sectionId: string, title: string) => void;
  onSectionDelete: (sectionId: string) => void;
  onSectionReorder: (sections: Section[]) => void;
}

export function WorkspaceDocumentPanel({
  project,
  sections,
  activeSection,
  documentTitle,
  documentContent,
  documentWordCount,
  artifact,
  tab,
  copied,
  collapsed,
  onTabChange,
  onCopy,
  onToggleCollapsed,
  onDocumentTitleChange,
  onDocumentContentChange,
  onSectionSelect,
  onSectionAdd,
  onSectionRename,
  onSectionDelete,
  onSectionReorder,
}: WorkspaceDocumentPanelProps) {
  if (collapsed) {
    return (
      <div className="flex h-full items-start justify-center border-l border-border/60 bg-card p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="focus-ring rounded-full"
          onClick={onToggleCollapsed}
          aria-label="Expandir painel do documento"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as WorkspaceDocumentTab)} className="h-full gap-0">
      <aside className="flex h-full flex-col border-l border-border/60 bg-card text-card-foreground">
        <div className="glass-header flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <TabsList className="h-10 rounded-full border border-border/60 bg-background/80 p-1">
            <TabsTrigger value="document" className="rounded-full px-3 text-xs">
              <FileText className="h-3.5 w-3.5" /> Documento
            </TabsTrigger>
            <TabsTrigger value="structure" className="rounded-full px-3 text-xs">
              <GitBranch className="h-3.5 w-3.5" /> Estrutura
            </TabsTrigger>
            <TabsTrigger value="preview" className="rounded-full px-3 text-xs">
              <Eye className="h-3.5 w-3.5" /> Preview
            </TabsTrigger>
          </TabsList>
          

          <Button
            type="button"
            variant="ghost"
            className="focus-ring rounded-full px-3 text-xs"
            onClick={onCopy}
          >
            {copied ? <Check className="mr-1 h-3.5 w-3.5 text-success" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="focus-ring rounded-full"
            onClick={onToggleCollapsed}
            aria-label="Recolher painel do documento"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>

        <TabsContent value="document" className="min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  {activeSection ? "Secção activa" : "Resumo do projecto"}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {documentWordCount.toLocaleString("pt-MZ")} palavras
                </Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {activeSection
                  ? "Edite a secção activa com apoio do assistente. As alterações continuam ligadas ao documento real."
                  : artifact.subtitle}
              </p>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                <div className="glass glass-border rounded-3xl p-4">
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
                    className="min-h-[420px] resize-none rounded-3xl border-border/70 bg-background/70 p-4 text-sm leading-7"
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="structure" className="min-h-0 flex-1 data-[state=inactive]:hidden">
          <DocumentTree
            projectTitle={project.title}
            sections={sections}
            activeSectionId={activeSection?.id || null}
            onSectionSelect={onSectionSelect}
            onSectionAdd={onSectionAdd}
            onSectionRename={onSectionRename}
            onSectionDelete={onSectionDelete}
            onSectionReorder={onSectionReorder}
          />
        </TabsContent>

        <TabsContent value="preview" className="min-h-0 flex-1 data-[state=inactive]:hidden">
          <PreviewPane project={project} sections={sections} />
        </TabsContent>
      </aside>
    </Tabs>
  );
}
