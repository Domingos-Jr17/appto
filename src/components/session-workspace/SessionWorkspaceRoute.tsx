"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { FolderTree } from "lucide-react";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";
import { DocumentPane } from "@/components/session-workspace/DocumentPane";
import { ChatPane } from "@/components/session-workspace/ChatPane";
import { SessionWorkspaceLayout } from "@/components/session-workspace/SessionWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceLoadingSkeleton } from "@/components/skeletons/WorkspaceLoadingSkeleton";
import { useToast } from "@/hooks/use-toast";
import { countWordsInMarkdown } from "@/lib/content";
import {
  findSectionById,
} from "@/lib/editor-helpers";
import {
  useAssistantStore,
} from "@/stores/assistant-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import {
  buildArtifactSource,
  getPreferredSectionId,
} from "./mappers";
import { SessionWorkspaceErrorBoundary } from "./SessionWorkspaceErrorBoundary";

interface SessionWorkspaceRouteProps {
  projectId: string;
}

export function SessionWorkspaceRoute({ projectId }: SessionWorkspaceRouteProps) {
  const { toast } = useToast();
  const { setCredits: setAppCredits } = useAppShellData();
  const initializedProjectId = useRef<string | null>(null);

  const project = useProjectStore((state) => state.project);
  const sections = useProjectStore((state) => state.sections);
  const credits = useProjectStore((state) => state.credits);
  const isLoading = useProjectStore((state) => state.isLoading);
  const activeProjectStoreId = useProjectStore((state) => state.activeProjectId);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const createSection = useProjectStore((state) => state.createSection);
  const updateSectionTree = useProjectStore((state) => state.updateSectionTree);
  const setCredits = useProjectStore((state) => state.setCredits);
  const exportDocument = useProjectStore((state) => state.exportDocument);
  const isSavingExport = useProjectStore((state) => state.isSavingExport);

  const activeSectionId = useEditorStore((state) => state.activeSectionId);
  const sectionTitle = useEditorStore((state) => state.sectionTitle);
  const content = useEditorStore((state) => state.content);
  const wordCount = useEditorStore((state) => state.wordCount);
  const autoSaveStatus = useEditorStore((state) => state.autoSaveStatus);
  const lastSaved = useEditorStore((state) => state.lastSaved);
  const selectSection = useEditorStore((state) => state.selectSection);
  const updateTitle = useEditorStore((state) => state.updateTitle);
  const updateContent = useEditorStore((state) => state.updateContent);
  const replaceContent = useEditorStore((state) => state.replaceContent);
  const resetEditor = useEditorStore((state) => state.resetEditor);

  const chatMessages = useAssistantStore((state) => state.chatMessages);
  const chatPrompt = useAssistantStore((state) => state.chatPrompt);
  const isChatLoading = useAssistantStore((state) => state.isChatLoading);
  const setChatPrompt = useAssistantStore((state) => state.setChatPrompt);
  const sendMessage = useAssistantStore((state) => state.sendMessage);
  const clearChat = useAssistantStore((state) => state.clearChat);

  useEffect(() => {
    void fetchProject(projectId);
  }, [fetchProject, projectId]);

  useEffect(() => {
    setAppCredits(credits);
  }, [credits, setAppCredits]);

  useEffect(() => {
    clearChat(projectId);
    resetEditor();
    initializedProjectId.current = null;
  }, [projectId, clearChat, resetEditor]);

  useEffect(() => {
    if (!project || project.id !== projectId || initializedProjectId.current === projectId) return;

    const preferredSectionId = getPreferredSectionId(project, sections);
    if (preferredSectionId) {
      const preferredSection = findSectionById(preferredSectionId, sections);
      if (preferredSection) {
        selectSection(preferredSection);
      }
    }

    initializedProjectId.current = projectId;
  }, [project, projectId, sections, selectSection]);

  const activeSection = useMemo(
    () => (activeSectionId ? findSectionById(activeSectionId, sections) : null),
    [activeSectionId, sections]
  );

  const artifact = useMemo(() => {
    if (!project) return null;
    return buildArtifactSource(project, activeSection, chatMessages);
  }, [activeSection, chatMessages, project]);

  const documentTitle = activeSection ? sectionTitle : artifact?.title || project?.title || "";
  const documentContent = activeSection ? content : artifact?.content || "";
  const documentWordCount = activeSection ? wordCount : artifact?.content ? countWordsInMarkdown(artifact.content) : 0;

  const handleChatSubmit = useCallback(async () => {
    if (!chatPrompt.trim() || isChatLoading || !project) return;
    try {
      await sendMessage(chatPrompt, projectId, credits, setCredits);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Não foi possível gerar a resposta.",
        variant: "destructive",
      });
    }
  }, [chatPrompt, credits, isChatLoading, project, projectId, sendMessage, setCredits, toast]);

  const handleApplyContent = useCallback(
    async (messageContent: string) => {
      if (activeSectionId) {
        replaceContent(messageContent, projectId);
        updateSectionTree(activeSectionId, (section) => ({
          ...section,
          content: messageContent,
          wordCount: countWordsInMarkdown(messageContent),
        }));
      } else {
        try {
          const newSection = await createSection(projectId, {
            title: sectionTitle || "Nova secção",
            content: messageContent,
            selectAfterCreate: true,
          });
          if (newSection) {
            selectSection(newSection);
          }
        } catch {
          toast({ title: "Erro", description: "Não foi possível criar a nova secção.", variant: "destructive" });
        }
      }
    },
    [activeSectionId, createSection, projectId, replaceContent, sectionTitle, selectSection, toast, updateSectionTree]
  );

  const handleDocumentTitleChange = useCallback(
    (title: string) => {
      if (!activeSectionId) return;
      updateTitle(title, projectId);
      updateSectionTree(activeSectionId, (section) => ({ ...section, title }));
    },
    [activeSectionId, projectId, updateSectionTree, updateTitle]
  );

  const handleDocumentContentChange = useCallback(
    (nextContent: string) => {
      if (!activeSectionId) return;
      updateContent(nextContent, projectId);
      updateSectionTree(activeSectionId, (section) => ({
        ...section,
        content: nextContent,
        wordCount: countWordsInMarkdown(nextContent),
      }));
    },
    [activeSectionId, projectId, updateContent, updateSectionTree]
  );

  const handleExport = useCallback(() => {
    try {
      exportDocument(projectId, "docx");
    } catch {
      toast({ title: "Erro", description: "Não foi possível exportar o documento.", variant: "destructive" });
    }
  }, [exportDocument, projectId, toast]);

  if (isLoading || activeProjectStoreId !== projectId || (project && project.id !== projectId)) {
    return <WorkspaceLoadingSkeleton />;
  }

  if (!project || !artifact) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-6">
        <Card className="w-full max-w-xl border-border/60 bg-background/80 text-center shadow-sm">
          <CardContent className="p-10">
            <EmptyState
              icon={FolderTree}
              title="Sessão não encontrada"
              description="Não foi possível abrir esta sessão. Volte à biblioteca e tente novamente."
              action={
                <Button asChild className="rounded-full">
                  <Link href="/app/sessoes">Ver sessões</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <SessionWorkspaceLayout
        chat={
          <SessionWorkspaceErrorBoundary label="chat">
            <ChatPane
              activeSection={activeSection}
              chatMessages={chatMessages}
              chatPrompt={chatPrompt}
              isChatLoading={isChatLoading}
              isSavingExport={isSavingExport}
              onChatPromptChange={setChatPrompt}
              onChatSubmit={handleChatSubmit}
              onApplyContent={handleApplyContent}
              onExport={handleExport}
            />
          </SessionWorkspaceErrorBoundary>
        }
        document={
          <SessionWorkspaceErrorBoundary label="document">
            <DocumentPane
              activeSection={activeSection}
              documentTitle={documentTitle}
              documentContent={documentContent}
              documentWordCount={documentWordCount}
              saveStatus={autoSaveStatus}
              lastSaved={lastSaved}
              onDocumentTitleChange={handleDocumentTitleChange}
              onDocumentContentChange={handleDocumentContentChange}
            />
          </SessionWorkspaceErrorBoundary>
        }
      />
    </div>
  );
}
