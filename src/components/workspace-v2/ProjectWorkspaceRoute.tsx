"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FolderTree, Loader2 } from "lucide-react";
import { ProjectSidebar } from "@/components/workspace/ProjectSidebar";
import { WorkspaceDocumentPanel } from "@/components/workspace-v2/WorkspaceDocumentPanel";
import { WorkspaceChatPane } from "@/components/workspace-v2/WorkspaceChatPane";
import { WorkspaceThreePane } from "@/components/workspace-v2/WorkspaceThreePane";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchAppProjects } from "@/lib/app-data";
import { countWordsInMarkdown } from "@/lib/content";
import {
  extractOutlineTitles,
  flattenSections,
  findSectionById,
  inferSectionTitle,
} from "@/lib/editor-helpers";
import {
  useAssistantStore,
  getChatSuggestions,
} from "@/stores/assistant-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { ChatAction, Section } from "@/types/editor";
import type { WorkspaceDocumentTab, WorkspaceProjectLinkItem } from "./workspace-types";
import {
  buildArtifactSource,
  buildWorkspaceConversations,
  getPreferredSectionId,
} from "./workspace-mappers";
import { useWorkspaceConversations } from "./use-workspace-conversations";
import { WorkspaceErrorBoundary } from "./WorkspaceErrorBoundary";

interface ProjectWorkspaceRouteProps {
  projectId: string;
}

export function ProjectWorkspaceRoute({ projectId }: ProjectWorkspaceRouteProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const initializedProjectId = useRef<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [artifactCollapsed, setArtifactCollapsed] = useState(false);
  const [documentTab, setDocumentTab] = useState<WorkspaceDocumentTab>("document");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [recentProjects, setRecentProjects] = useState<WorkspaceProjectLinkItem[]>([]);

  const project = useProjectStore((state) => state.project);
  const sections = useProjectStore((state) => state.sections);
  const credits = useProjectStore((state) => state.credits);
  const isLoading = useProjectStore((state) => state.isLoading);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const createSection = useProjectStore((state) => state.createSection);
  const renameSection = useProjectStore((state) => state.renameSection);
  const deleteSection = useProjectStore((state) => state.deleteSection);
  const reorderSections = useProjectStore((state) => state.reorderSections);
  const updateSectionTree = useProjectStore((state) => state.updateSectionTree);
  const setCredits = useProjectStore((state) => state.setCredits);
  const exportDocument = useProjectStore((state) => state.exportDocument);
  const saveExport = useProjectStore((state) => state.saveExport);
  const isSavingExport = useProjectStore((state) => state.isSavingExport);

  const activeSectionId = useEditorStore((state) => state.activeSectionId);
  const sectionTitle = useEditorStore((state) => state.sectionTitle);
  const content = useEditorStore((state) => state.content);
  const wordCount = useEditorStore((state) => state.wordCount);
  const selectSection = useEditorStore((state) => state.selectSection);
  const updateTitle = useEditorStore((state) => state.updateTitle);
  const updateContent = useEditorStore((state) => state.updateContent);
  const replaceContent = useEditorStore((state) => state.replaceContent);
  const appendContent = useEditorStore((state) => state.appendContent);
  const resetEditor = useEditorStore((state) => state.resetEditor);

  const chatMessages = useAssistantStore((state) => state.chatMessages);
  const chatPrompt = useAssistantStore((state) => state.chatPrompt);
  const chatAction = useAssistantStore((state) => state.chatAction);
  const isChatLoading = useAssistantStore((state) => state.isChatLoading);
  const setChatPrompt = useAssistantStore((state) => state.setChatPrompt);
  const setChatAction = useAssistantStore((state) => state.setChatAction);
  const sendMessage = useAssistantStore((state) => state.sendMessage);
  const clearChat = useAssistantStore((state) => state.clearChat);

  useEffect(() => {
    void fetchProject(projectId);
  }, [fetchProject, projectId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecentProjects() {
      try {
        const data = await fetchAppProjects("sortBy=updatedAt&sortOrder=desc");
        if (cancelled) return;

        setRecentProjects(
          data.slice(0, 8).map((item) => ({
            id: item.id,
            title: item.title,
            updatedAt: item.lastEditedSection?.updatedAt || item.updatedAt,
            wordCount: item.wordCount,
            resumeMode: item.resumeMode,
            status: item.status,
          }))
        );
      } catch {
        if (!cancelled) setRecentProjects([]);
      }
    }

    void loadRecentProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    clearChat();
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

  const chatSuggestions = useMemo(
    () => getChatSuggestions(project, activeSection, sectionTitle),
    [activeSection, project, sectionTitle]
  );

  const derivedConversations = useMemo(
    () => (project ? buildWorkspaceConversations(project, sections, chatMessages) : []),
    [chatMessages, project, sections]
  );

  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversation,
    renameConversation,
    togglePinConversation,
    hideConversation,
  } = useWorkspaceConversations({
    projectId,
    derivedConversations,
    search: conversationSearch,
  });

  useEffect(() => {
    if (!activeSectionId || activeConversationId !== `project-${projectId}`) return;

    const matchingConversation = conversations.find(
      (conversation) => conversation.kind === "section" && conversation.sectionId === activeSectionId
    );

    if (matchingConversation) {
      setActiveConversation(matchingConversation.id);
    }
  }, [activeConversationId, activeSectionId, conversations, projectId, setActiveConversation]);

  const artifact = useMemo(() => {
    if (!project) return null;
    return buildArtifactSource(project, activeSection, activeConversation, chatMessages);
  }, [activeConversation, activeSection, chatMessages, project]);

  const documentTitle = activeSection ? sectionTitle : artifact?.title || project?.title || "";
  const documentContent = activeSection ? content : artifact?.content || "";
  const documentWordCount = activeSection ? wordCount : artifact?.content ? countWordsInMarkdown(artifact.content) : 0;

  const handleChatSubmit = useCallback(async () => {
    if (!chatPrompt.trim() || isChatLoading || !project) return;
    try {
      await sendMessage(
        chatPrompt,
        chatAction as ChatAction,
        project.title,
        sectionTitle,
        projectId,
        credits,
        setCredits
      );
      setDocumentTab("document");
      setMobileArtifactOpen(true);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Não foi possível gerar a resposta.",
        variant: "destructive",
      });
    }
  }, [chatAction, chatPrompt, credits, isChatLoading, project, projectId, sectionTitle, sendMessage, setCredits, toast]);

  const applyAssistantContent = useCallback(
    async (messageContent: string, action: "insert" | "replace" | "append" | "outline") => {
      if (action === "insert") {
        appendContent(messageContent, projectId);
        if (activeSectionId) {
          const nextContent = content.trim() ? `${content}\n\n${messageContent}` : messageContent;
          updateSectionTree(activeSectionId, (section) => ({
            ...section,
            content: nextContent,
            wordCount: countWordsInMarkdown(nextContent),
          }));
        }
        setDocumentTab("document");
        return;
      }
      if (action === "replace") {
        replaceContent(messageContent, projectId);
        if (activeSectionId) {
          updateSectionTree(activeSectionId, (section) => ({
            ...section,
            content: messageContent,
            wordCount: countWordsInMarkdown(messageContent),
          }));
        }
        setDocumentTab("document");
        return;
      }
      if (action === "append") {
        try {
          const newSection = await createSection(projectId, {
            title: inferSectionTitle(messageContent),
            content: messageContent,
            selectAfterCreate: true,
          });
          if (newSection) {
            selectSection(newSection);
            setDocumentTab("document");
          }
        } catch {
          toast({ title: "Erro", description: "Não foi possível criar a nova secção.", variant: "destructive" });
        }
        return;
      }
      try {
        const outlineItems = extractOutlineTitles(messageContent);
        const items = outlineItems.length ? outlineItems : ["Introducao", "Desenvolvimento", "Conclusao"];
        for (const item of items) {
          await createSection(projectId, { title: item });
        }
        setDocumentTab("structure");
        toast({ title: "Outline aplicado", description: `${items.length} secções adicionadas.` });
      } catch {
        toast({ title: "Erro", description: "Não foi possível transformar a resposta em outline.", variant: "destructive" });
      }
    },
    [activeSectionId, appendContent, content, createSection, projectId, replaceContent, selectSection, toast, updateSectionTree]
  );

  const handleConversationSelect = useCallback(
    (conversationId: string) => {
      setActiveConversation(conversationId);
      const selected = conversations.find((conversation) => conversation.id === conversationId);
      if (selected?.kind === "section" && selected.sectionId) {
        const matchingSection = findSectionById(selected.sectionId, sections);
        if (matchingSection) {
          selectSection(matchingSection);
          setDocumentTab("document");
        }
      } else {
        resetEditor();
        setDocumentTab("document");
      }
      setMobileSidebarOpen(false);
    },
    [conversations, resetEditor, sections, selectSection, setActiveConversation]
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

  const handleSectionAdd = useCallback(
    async (parentId?: string) => {
      try {
        const newSection = await createSection(projectId, {
          parentId,
          title: parentId ? "Nova secção" : "Novo capítulo",
          selectAfterCreate: true,
        });
        if (newSection) {
          selectSection(newSection);
          setDocumentTab("document");
        }
      } catch {
        toast({ title: "Erro", description: "Não foi possível criar a nova secção.", variant: "destructive" });
      }
    },
    [createSection, projectId, selectSection, toast]
  );

  const handleSectionRename = useCallback(
    async (sectionId: string, title: string) => {
      try {
        await renameSection(sectionId, title);
        const updated = useProjectStore.getState().findSection(sectionId);
        if (updated && activeSectionId === sectionId) {
          selectSection(updated);
        }
      } catch {
        toast({ title: "Erro", description: "Não foi possível renomear a secção.", variant: "destructive" });
      }
    },
    [activeSectionId, renameSection, selectSection, toast]
  );

  const handleSectionDelete = useCallback(
    async (sectionId: string) => {
      try {
        const flatBeforeDelete = flattenSections(sections).filter((section) => section.id !== sectionId);
        await deleteSection(sectionId);

        if (activeSectionId === sectionId) {
          const fallbackId = flatBeforeDelete[0]?.id;
          if (fallbackId) {
            const fallback = useProjectStore.getState().findSection(fallbackId);
            if (fallback) selectSection(fallback);
          } else {
            resetEditor();
          }
        }
      } catch {
        toast({ title: "Erro", description: "Não foi possível remover a secção.", variant: "destructive" });
      }
    },
    [activeSectionId, deleteSection, resetEditor, sections, selectSection, toast]
  );

  const handleSectionReorder = useCallback(
    async (tree: Section[]) => {
      try {
        await reorderSections(projectId, tree);
      } catch {
        toast({ title: "Erro", description: "Não foi possível reordenar a estrutura.", variant: "destructive" });
      }
    },
    [projectId, reorderSections, toast]
  );

  const handleCopy = useCallback(async () => {
    const copyTarget =
      documentTab === "document"
        ? `${documentTitle}\n\n${documentContent}`.trim()
        : artifact?.content || "";
    if (!copyTarget) return;
    try {
      await navigator.clipboard.writeText(copyTarget);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar o conteúdo.", variant: "destructive" });
    }
  }, [artifact?.content, documentContent, documentTab, documentTitle, toast]);

  const handleExport = useCallback((format: "docx" | "pdf") => {
    try {
      exportDocument(projectId, format);
    } catch {
      toast({ title: "Erro", description: "Não foi possível exportar o documento.", variant: "destructive" });
    }
  }, [exportDocument, projectId, toast]);

  const handleSaveExport = useCallback((format: "docx" | "pdf") => {
    try {
      saveExport(projectId, format);
    } catch {
      toast({ title: "Erro", description: "Não foi possível guardar o documento.", variant: "destructive" });
    }
  }, [saveExport, projectId, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">A carregar a sessão de trabalho...</p>
        </div>
      </div>
    );
  }

  if (!project || !artifact) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-6">
        <Card className="w-full max-w-xl border-border/60 bg-background/80 text-center shadow-sm">
          <CardContent className="space-y-4 p-10">
            <FolderTree className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="text-2xl font-semibold">Sessão não encontrada</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Não foi possível abrir esta sessão. Volte à biblioteca e tente novamente.
            </p>
            <Button asChild className="rounded-full">
              <Link href="/app/sessoes">Ver sessões</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sidebar = (
    <WorkspaceErrorBoundary label="sidebar">
      <ProjectSidebar
        collapsed={sidebarCollapsed}
        currentPath={`/app/sessoes/${project.id}`}
        credits={credits}
        projects={recentProjects.map((item) => ({
          id: item.id,
          title: item.title,
          updatedAt: item.updatedAt,
          wordCount: item.wordCount,
          resumeMode: item.resumeMode,
          status: item.status || "IN_PROGRESS",
        }))}
        user={session?.user || {}}
        workspace={{
          currentProject: {
            id: project.id,
            title: project.title,
            subtitle: "Chat, estrutura e documento",
          },
          conversations,
          activeConversationId,
          search: conversationSearch,
          onSearchChange: setConversationSearch,
          onSelectConversation: handleConversationSelect,
          onRenameConversation: renameConversation,
          onTogglePinConversation: togglePinConversation,
          onDeleteConversation: hideConversation,
        }}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        onNavigate={() => setMobileSidebarOpen(false)}
      />
    </WorkspaceErrorBoundary>
  );

  const chat = (
    <WorkspaceErrorBoundary label="chat">
      <WorkspaceChatPane
        project={project}
        activeSection={activeSection}
        activeConversation={activeConversation}
        chatMessages={chatMessages}
        chatPrompt={chatPrompt}
        chatAction={chatAction}
        isChatLoading={isChatLoading}
        suggestions={chatSuggestions}
        credits={credits}
        sidebarCollapsed={sidebarCollapsed}
        artifactCollapsed={artifactCollapsed}
        isSavingExport={isSavingExport}
        onOpenSidebar={() => {
          setSidebarCollapsed(false);
          setMobileSidebarOpen(true);
        }}
        onOpenArtifact={() => {
          setArtifactCollapsed(false);
          setMobileArtifactOpen(true);
        }}
        onChatPromptChange={setChatPrompt}
        onChatActionChange={(action) => setChatAction(action)}
        onChatSubmit={handleChatSubmit}
        onApplyContent={applyAssistantContent}
        onExport={handleExport}
        onSaveExport={handleSaveExport}
      />
    </WorkspaceErrorBoundary>
  );

  const artifactPanel = (
    <WorkspaceErrorBoundary label="document">
      <WorkspaceDocumentPanel
        project={project}
        sections={sections}
        activeSection={activeSection}
        documentTitle={documentTitle}
        documentContent={documentContent}
        documentWordCount={documentWordCount}
        artifact={artifact}
        tab={documentTab}
        copied={copied}
        collapsed={artifactCollapsed}
        onTabChange={setDocumentTab}
        onCopy={handleCopy}
        onDocumentTitleChange={handleDocumentTitleChange}
        onDocumentContentChange={handleDocumentContentChange}
        onSectionSelect={(sectionId) => {
          const targetSection = findSectionById(sectionId, sections);
          if (targetSection) {
            selectSection(targetSection);
            setDocumentTab("document");
          }
        }}
        onSectionAdd={handleSectionAdd}
        onSectionRename={handleSectionRename}
        onSectionDelete={handleSectionDelete}
        onSectionReorder={handleSectionReorder}
        onToggleCollapsed={() => setArtifactCollapsed((value) => !value)}
      />
    </WorkspaceErrorBoundary>
  );

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <WorkspaceThreePane
        sidebarCollapsed={sidebarCollapsed}
        artifactCollapsed={artifactCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        mobileArtifactOpen={mobileArtifactOpen}
        sidebar={sidebar}
        chat={chat}
        artifact={artifactPanel}
        onMobileSidebarOpenChange={setMobileSidebarOpen}
        onMobileArtifactOpenChange={setMobileArtifactOpen}
      />
    </div>
  );
}
