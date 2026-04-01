"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { FolderTree } from "lucide-react";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";
import { DocumentPane } from "@/components/work-workspace/DocumentPane";
import { ChatPane } from "@/components/work-workspace/ChatPane";
import { WorkWorkspaceLayout } from "@/components/work-workspace/WorkWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceLoadingSkeleton } from "@/components/skeletons/WorkspaceLoadingSkeleton";
import { useToast } from "@/hooks/use-toast";
import { countWordsInMarkdown } from "@/lib/content";
import { fetchWithRetry } from "@/lib/fetch-retry";
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
import { WorkWorkspaceErrorBoundary } from "./WorkWorkspaceErrorBoundary";

interface WorkWorkspaceRouteProps {
  projectId: string;
}

export function WorkWorkspaceRoute({ projectId }: WorkWorkspaceRouteProps) {
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

  useEffect(() => {
    if (!project || project.generationStatus !== "GENERATING") return;

    const intervalId = window.setInterval(() => {
      void fetchProject(projectId);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [fetchProject, project, projectId]);

  const activeSection = useMemo(
    () => (activeSectionId ? findSectionById(activeSectionId, sections) : null),
    [activeSectionId, sections]
  );

  const artifact = useMemo(() => {
    if (!project) return null;
    return buildArtifactSource(project, activeSection, chatMessages);
  }, [activeSection, chatMessages, project]);

  const _documentTitle = activeSection ? sectionTitle : artifact?.title || project?.title || "";
  const _documentContent = activeSection ? content : artifact?.content || "";
  const chatContext = useMemo(() => {
    if (!project) return undefined;

    const brief = project.brief;
    const contextParts = [
      `Trabalho: ${project.title}`,
      `Tipo: ${project.type}`,
      brief?.institutionName ? `Instituição: ${brief.institutionName}` : null,
      brief?.courseName ? `Curso: ${brief.courseName}` : null,
      brief?.subjectName ? `Disciplina: ${brief.subjectName}` : null,
      brief?.advisorName ? `Orientador: ${brief.advisorName}` : null,
      brief?.objective ? `Objetivo: ${brief.objective}` : null,
      activeSection ? `Secção actual: ${activeSection.title}` : null,
    ].filter(Boolean);

    return contextParts.join("\n");
  }, [activeSection, project]);

  const handleChatSubmit = useCallback(async () => {
    if (!chatPrompt.trim() || isChatLoading || !project) return;
    try {
      await sendMessage(chatPrompt, projectId, credits, setCredits, chatContext);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Não foi possível gerar a resposta.",
        variant: "destructive",
      });
    }
  }, [chatContext, chatPrompt, credits, isChatLoading, project, projectId, sendMessage, setCredits, toast]);

  const handleExport = useCallback(async () => {
    try {
      await exportDocument(projectId, "docx");
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível descarregar o trabalho.",
        variant: "destructive",
      });
    }
  }, [exportDocument, projectId, toast]);

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

  const _handleDocumentTitleChange = useCallback(
    (title: string) => {
      if (!activeSectionId) return;
      updateTitle(title, projectId);
      updateSectionTree(activeSectionId, (section) => ({ ...section, title }));
    },
    [activeSectionId, projectId, updateSectionTree, updateTitle]
  );

  const _handleDocumentContentChange = useCallback(
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

  const handleBriefSave = useCallback(
    async (briefPayload: {
      institutionName?: string;
      courseName?: string;
      subjectName?: string;
      advisorName?: string;
      studentName?: string;
      city?: string;
      academicYear?: number;
      educationLevel?: "SECONDARY" | "TECHNICAL" | "HIGHER_EDUCATION";
      objective?: string;
      methodology?: string;
      citationStyle?: "ABNT" | "APA" | "Vancouver";
    }) => {
      const response = await fetchWithRetry(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        retries: 1,
        body: JSON.stringify({ brief: briefPayload }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível actualizar o briefing.");
      }

      await fetchProject(projectId);
      toast({
        title: "Briefing actualizado",
        description: "Os dados da capa e do contexto académico foram actualizados.",
      });
    },
    [fetchProject, projectId, toast]
  );

  const _handleRegenerateWork = useCallback(async () => {
    const response = await fetchWithRetry(`/api/projects/${projectId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      retries: 1,
      body: JSON.stringify({ mode: "work" }),
    });

    const data = await response.json();
    if (!response.ok) {
      toast({
        title: "Erro",
        description: data.error || "Não foi possível regenerar o trabalho.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Regeneração iniciada",
      description: "A aptto está a reconstruir o trabalho com base no briefing actualizado.",
    });

    await fetchProject(projectId);
  }, [fetchProject, projectId, toast]);

  const _handleRegenerateSection = useCallback(async () => {
    if (!activeSection) return;

    const response = await fetchWithRetry(`/api/projects/${projectId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      retries: 1,
      body: JSON.stringify({ mode: "section", sectionId: activeSection.id }),
    });

    const data = await response.json();
    if (!response.ok) {
      toast({
        title: "Erro",
        description: data.error || "Não foi possível regenerar a secção.",
        variant: "destructive",
      });
      return;
    }

    replaceContent(data.content, projectId);
    updateSectionTree(activeSection.id, (section) => ({
      ...section,
      content: data.content,
      wordCount: countWordsInMarkdown(data.content),
    }));

    toast({
      title: "Secção regenerada",
      description: "A secção activa foi reescrita com base no briefing actual.",
    });
  }, [activeSection, projectId, replaceContent, toast, updateSectionTree]);

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
              title="Trabalho não encontrado"
              description="Nao foi possivel abrir este trabalho. Volte a biblioteca e tente novamente."
              action={
                <Button asChild className="rounded-full">
                  <Link href="/app/trabalhos">Ver trabalhos</Link>
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
      <WorkWorkspaceLayout
        project={project}
        sections={sections}
        activeSectionId={activeSectionId}
        onSectionSelect={selectSection}
        chat={
          <WorkWorkspaceErrorBoundary label="chat">
            <ChatPane
              chatMessages={chatMessages}
              chatPrompt={chatPrompt}
              isChatLoading={isChatLoading}
              onChatPromptChange={setChatPrompt}
              onChatSubmit={handleChatSubmit}
              onApplyContent={handleApplyContent}
            />
          </WorkWorkspaceErrorBoundary>
        }
        document={
          <WorkWorkspaceErrorBoundary label="document">
            <DocumentPane
              project={project}
              sections={sections}
              activeSection={activeSection}
              isSavingExport={isSavingExport !== null}
              onExport={handleExport}
              onBriefSave={handleBriefSave}
            />
          </WorkWorkspaceErrorBoundary>
        }
      />
    </div>
  );
}
