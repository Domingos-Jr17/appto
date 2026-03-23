"use client";

import { FolderTree, Plus, Sparkles } from "lucide-react";
import { AssistantPane } from "@/components/editor/AssistantPane";
import { WritingArea } from "@/components/editor/WritingArea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSaveCopy } from "@/lib/editor-helpers";
import type {
  AssistantMessage,
  AutoSaveStatus,
  ChatAction,
  ChatSuggestion,
  Project,
  ReferenceData,
  Section,
} from "@/types/editor";

interface DocumentModeProps {
  project: Project;
  sections: Section[];
  activeSection: Section | null;
  activeSectionId: string | null;
  sectionTitle: string;
  content: string;
  wordCount: number;
  autoSaveStatus: AutoSaveStatus;
  lastSaved: Date | undefined;
  credits: number;
  // Chat state
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  chatAction: ChatAction;
  isChatLoading: boolean;
  chatSuggestions: ChatSuggestion[];
  onChatPromptChange: (prompt: string) => void;
  onChatActionChange: (action: ChatAction) => void;
  onChatSubmit: () => void;
  onApplyContent: (content: string, action: "insert" | "replace" | "append" | "outline") => void;
  // Section handlers
  onSectionAdd: (parentId?: string) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  // AI actions
  onImprove: (text: string, type: string) => Promise<string>;
  onGenerateReference: (data: ReferenceData) => Promise<string>;
  onReplaceContent: (content: string) => void;
  onAppendContent: (content: string) => void;
  // Structure drawer
  onStructureDrawerOpen: () => void;
}

export function DocumentMode({
  project,
  activeSection,
  sectionTitle,
  content,
  autoSaveStatus,
  lastSaved,
  credits,
  chatMessages,
  chatPrompt,
  chatAction,
  isChatLoading,
  chatSuggestions,
  onChatPromptChange,
  onChatActionChange,
  onChatSubmit,
  onApplyContent,
  onSectionAdd,
  onTitleChange,
  onContentChange,
  onImprove,
  onGenerateReference,
  onReplaceContent,
  onAppendContent,
  onStructureDrawerOpen,
}: DocumentModeProps) {
  return (
    <div className="flex min-h-0 flex-1">
      {/* Assistant Pane (esquerda) */}
      <AssistantPane
        projectTitle={project.title}
        activeSection={activeSection}
        sectionTitle={sectionTitle}
        content={content}
        credits={credits}
        chatMessages={chatMessages}
        chatPrompt={chatPrompt}
        chatAction={chatAction}
        isChatLoading={isChatLoading}
        chatSuggestions={chatSuggestions}
        onChatPromptChange={onChatPromptChange}
        onChatActionChange={onChatActionChange}
        onChatSubmit={onChatSubmit}
        onApplyContent={onApplyContent}
        onImprove={onImprove}
        onGenerateReference={onGenerateReference}
        onReplaceContent={onReplaceContent}
        onAppendContent={onAppendContent}
      />

      {/* Editor (centro) */}
      <main className="min-w-0 flex-1 overflow-hidden">
        {activeSection ? (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 lg:px-6">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Seccao
                  </p>
                  <h2 className="text-base font-semibold">
                    {sectionTitle || "Seleccione uma secao"}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {getSaveCopy(autoSaveStatus, lastSaved)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={onStructureDrawerOpen}
                >
                  <FolderTree className="mr-1.5 h-3.5 w-3.5" />
                  Estrutura
                </Button>
              </div>
            </div>
            <WritingArea
              sectionTitle={sectionTitle}
              content={content}
              onTitleChange={onTitleChange}
              onContentChange={onContentChange}
              onImproveSelection={async (text) => onImprove(text, "selection")}
              onApplySelection={onReplaceContent}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6 py-8">
            <Card className="w-full max-w-2xl border-border/60 bg-background/80 shadow-sm">
              <CardContent className="space-y-4 p-8 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-primary/70" />
                <h2 className="text-2xl font-semibold">
                  Comece o seu trabalho
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Use o assistente para gerar um outline ou crie um capitulo manualmente.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onSectionAdd(undefined)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar capitulo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
