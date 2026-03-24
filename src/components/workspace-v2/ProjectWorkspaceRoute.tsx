"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FolderTree, Loader2 } from "lucide-react";
import { ArtifactPanel } from "@/components/workspace-v2/ArtifactPanel";
import { ConversationSidebar } from "@/components/workspace-v2/ConversationSidebar";
import { WorkspaceChatPane } from "@/components/workspace-v2/WorkspaceChatPane";
import { WorkspaceThreePane } from "@/components/workspace-v2/WorkspaceThreePane";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  extractOutlineTitles,
  findSectionById,
  inferSectionTitle,
} from "@/lib/editor-helpers";
import {
  useAssistantStore,
  getChatSuggestions,
} from "@/stores/assistant-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { ChatAction } from "@/types/editor";
import {
  buildArtifactSource,
  buildWorkspaceConversations,
  getPreferredSectionId,
} from "./workspace-mappers";
import { useWorkspaceConversations } from "./use-workspace-conversations";

interface ProjectWorkspaceRouteProps {
  projectId: string;
}

export function ProjectWorkspaceRoute({ projectId }: ProjectWorkspaceRouteProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const initializedProjectId = useRef<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [artifactCollapsed, setArtifactCollapsed] = useState(false);
  const [artifactTab, setArtifactTab] = useState<"preview" | "code">("code");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");

  const project = useProjectStore((state) => state.project);
  const sections = useProjectStore((state) => state.sections);
  const credits = useProjectStore((state) => state.credits);
  const isLoading = useProjectStore((state) => state.isLoading);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const createSection = useProjectStore((state) => state.createSection);
  const setCredits = useProjectStore((state) => state.setCredits);

  const activeSectionId = useEditorStore((state) => state.activeSectionId);
  const sectionTitle = useEditorStore((state) => state.sectionTitle);
  const selectSection = useEditorStore((state) => state.selectSection);
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
    clearChat();
    resetEditor();
    initializedProjectId.current = null;
  }, [projectId, clearChat, resetEditor]);

  useEffect(() => {
    if (!project || initializedProjectId.current === projectId) return;

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

  const artifact = useMemo(() => {
    if (!project) return null;
    return buildArtifactSource(project, activeSection, chatMessages);
  }, [activeSection, chatMessages, project]);

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
      setArtifactTab("preview");
      setMobileArtifactOpen(true);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Nao foi possivel gerar a resposta.",
        variant: "destructive",
      });
    }
  }, [chatAction, chatPrompt, credits, isChatLoading, project, projectId, sectionTitle, sendMessage, setCredits, toast]);

  const applyAssistantContent = useCallback(
    async (messageContent: string, action: "insert" | "replace" | "append" | "outline") => {
      if (action === "insert") {
        appendContent(messageContent, projectId);
        setArtifactTab("code");
        return;
      }
      if (action === "replace") {
        replaceContent(messageContent, projectId);
        setArtifactTab("code");
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
            setArtifactTab("code");
          }
        } catch {
          toast({ title: "Erro", description: "Nao foi possivel criar a nova secao.", variant: "destructive" });
        }
        return;
      }
      try {
        const outlineItems = extractOutlineTitles(messageContent);
        const items = outlineItems.length ? outlineItems : ["Introducao", "Desenvolvimento", "Conclusao"];
        for (const item of items) {
          await createSection(projectId, { title: item });
        }
        toast({ title: "Outline aplicado", description: `${items.length} secoes adicionadas.` });
      } catch {
        toast({ title: "Erro", description: "Nao foi possivel transformar a resposta em outline.", variant: "destructive" });
      }
    },
    [appendContent, createSection, projectId, replaceContent, selectSection, toast]
  );

  const handleConversationSelect = useCallback(
    (conversationId: string) => {
      setActiveConversation(conversationId);
      const selected = conversations.find((conversation) => conversation.id === conversationId);
      if (selected?.sectionId) {
        const matchingSection = findSectionById(selected.sectionId, sections);
        if (matchingSection) {
          selectSection(matchingSection);
          setArtifactTab("code");
        }
      }
      setMobileSidebarOpen(false);
    },
    [conversations, sections, selectSection, setActiveConversation]
  );

  const handleCopy = useCallback(async () => {
    if (!artifact) return;
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: "Erro", description: "Nao foi possivel copiar o conteudo.", variant: "destructive" });
    }
  }, [artifact, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">A carregar o novo workspace do projecto...</p>
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
            <h2 className="text-2xl font-semibold">Projecto nao encontrado</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Nao foi possivel abrir este workspace. Volte a lista de projectos e tente novamente.
            </p>
            <Button asChild className="rounded-full">
              <Link href="/app/projects">Ver projectos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sidebar = (
    <ConversationSidebar
      projectId={project.id}
      user={session?.user || {}}
      conversations={conversations}
      activeConversationId={activeConversationId}
      collapsed={sidebarCollapsed}
      search={conversationSearch}
      onSearchChange={setConversationSearch}
      onSelectConversation={handleConversationSelect}
      onRenameConversation={renameConversation}
      onTogglePinConversation={togglePinConversation}
      onDeleteConversation={hideConversation}
      onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
    />
  );

  const chat = (
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
    />
  );

  const artifactPanel = (
    <ArtifactPanel
      artifact={artifact}
      tab={artifactTab}
      copied={copied}
      collapsed={artifactCollapsed}
      onTabChange={setArtifactTab}
      onCopy={handleCopy}
      onToggleCollapsed={() => setArtifactCollapsed((value) => !value)}
    />
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
