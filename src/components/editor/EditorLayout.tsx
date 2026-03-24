"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderTree, Loader2 } from "lucide-react";
import { DocumentTree } from "@/components/editor/DocumentTree";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { ChatMode } from "@/components/editor/modes/ChatMode";
import { DocumentMode } from "@/components/editor/modes/DocumentMode";
import { StructureMode } from "@/components/editor/modes/StructureMode";
import { PreviewPane } from "@/components/editor/PreviewPane";
import type { WorkspaceMode } from "@/components/workspace/WorkspaceModeTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";
import {
  extractOutlineTitles,
  findSectionById,
  inferSectionTitle,
} from "@/lib/editor-helpers";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import {
  useAssistantStore,
  getChatSuggestions,
} from "@/stores/assistant-store";
import type { ChatAction, ReferenceData, Section } from "@/types/editor";

interface EditorLayoutProps {
  projectId?: string;
  initialMode?: WorkspaceMode;
}

export function EditorLayout({ projectId: propProjectId, initialMode }: EditorLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const projectId = propProjectId ?? null;

  // UI state
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(
    initialMode ?? "document"
  );
  const [structureDrawerOpen, setStructureDrawerOpen] = useState(false);
  const modeInitialized = useRef(false);

  // Stores
  const project = useProjectStore((s) => s.project);
  const sections = useProjectStore((s) => s.sections);
  const credits = useProjectStore((s) => s.credits);
  const isSavingExport = useProjectStore((s) => s.isSavingExport);
  const isLoading = useProjectStore((s) => s.isLoading);
  const fetchProject = useProjectStore((s) => s.fetchProject);
  const createSection = useProjectStore((s) => s.createSection);
  const renameSection = useProjectStore((s) => s.renameSection);
  const deleteSection = useProjectStore((s) => s.deleteSection);
  const reorderSections = useProjectStore((s) => s.reorderSections);
  const exportDocument = useProjectStore((s) => s.exportDocument);
  const saveExport = useProjectStore((s) => s.saveExport);
  const setCredits = useProjectStore((s) => s.setCredits);

  const activeSectionId = useEditorStore((s) => s.activeSectionId);
  const sectionTitle = useEditorStore((s) => s.sectionTitle);
  const content = useEditorStore((s) => s.content);
  const wordCount = useEditorStore((s) => s.wordCount);
  const autoSaveStatus = useEditorStore((s) => s.autoSaveStatus);
  const lastSaved = useEditorStore((s) => s.lastSaved);
  const selectSection = useEditorStore((s) => s.selectSection);
  const updateTitle = useEditorStore((s) => s.updateTitle);
  const updateContent = useEditorStore((s) => s.updateContent);
  const saveImmediately = useEditorStore((s) => s.saveImmediately);
  const replaceContent = useEditorStore((s) => s.replaceContent);
  const appendContent = useEditorStore((s) => s.appendContent);
  const resetEditor = useEditorStore((s) => s.resetEditor);

  const chatMessages = useAssistantStore((s) => s.chatMessages);
  const chatPrompt = useAssistantStore((s) => s.chatPrompt);
  const chatAction = useAssistantStore((s) => s.chatAction);
  const isChatLoading = useAssistantStore((s) => s.isChatLoading);
  const setChatPrompt = useAssistantStore((s) => s.setChatPrompt);
  const setChatAction = useAssistantStore((s) => s.setChatAction);
  const sendMessage = useAssistantStore((s) => s.sendMessage);

  // Init
  useEffect(() => {
    if (!projectId) return;
    void fetchProject(projectId);
  }, [projectId, fetchProject]);

  useEffect(() => {
    return () => { resetEditor(); };
  }, [projectId, resetEditor]);

  useEffect(() => {
    if (!project || modeInitialized.current) return;
    modeInitialized.current = true;

    if (initialMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initialization after async load
      setWorkspaceMode(initialMode);
    } else {
      const resumeMode = project.resumeMode || (project.wordCount <= 0 ? "chat" : "document");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initialization after async load
      setWorkspaceMode(resumeMode);
    }

    const preferredSectionId =
      project.lastEditedSection?.id ||
      sections.find((s) => s.children.length > 0)?.children[0]?.id ||
      sections[0]?.id ||
      null;

    if (preferredSectionId) {
      const preferredSection = findSectionById(preferredSectionId, sections);
      if (preferredSection) {
        selectSection(preferredSection);
      }
    }
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived
  const activeSection = useMemo(
    () => (activeSectionId ? findSectionById(activeSectionId, sections) : null),
    [activeSectionId, sections]
  );

  const chatSuggestions = useMemo(
    () => getChatSuggestions(project, activeSection, sectionTitle),
    [project, activeSection, sectionTitle]
  );

  // Handlers
  const syncMode = useCallback(
    (nextMode: WorkspaceMode) => {
      setWorkspaceMode(nextMode);
      if (projectId) {
        const qs = nextMode !== "document" ? `?mode=${nextMode}` : "";
        router.replace(`/app/projects/${projectId}${qs}`, { scroll: false });
      }
    },
    [projectId, router]
  );

  const handleSectionSelect = useCallback(
    (sectionId: string) => {
      if (activeSectionId) {
        void saveImmediately(projectId);
      }
      const nextSection = findSectionById(sectionId, sections);
      if (!nextSection) return;
      selectSection(nextSection);
    },
    [activeSectionId, saveImmediately, sections, selectSection, projectId]
  );

  const handleSectionAdd = useCallback(
    async (parentId?: string) => {
      if (!projectId) return;
      try {
        const newSection = await createSection(projectId, {
          title: parentId ? "Nova secao" : "Novo capitulo",
          parentId,
          selectAfterCreate: true,
        });
        if (newSection) {
          selectSection(newSection);
        }
      } catch {
        toast({
          title: "Erro",
          description: "Nao foi possivel criar a secao.",
          variant: "destructive",
        });
      }
    },
    [createSection, toast, projectId, selectSection]
  );

  const handleSectionRename = useCallback(
    async (sectionId: string, newTitle: string) => {
      try {
        await renameSection(sectionId, newTitle);
        if (activeSectionId === sectionId) {
          updateTitle(newTitle, projectId);
        }
      } catch {
        toast({
          title: "Erro",
          description: "Nao foi possivel renomear a secao.",
          variant: "destructive",
        });
      }
    },
    [renameSection, activeSectionId, updateTitle, projectId, toast]
  );

  const handleSectionDelete = useCallback(
    async (sectionId: string) => {
      try {
        await deleteSection(sectionId);
        if (activeSectionId === sectionId) {
          const fallback = sections.length > 0 ? sections[0] : null;
          if (fallback) selectSection(fallback);
          else resetEditor();
        }
      } catch {
        toast({
          title: "Erro",
          description: "Nao foi possivel eliminar a secao.",
          variant: "destructive",
        });
      }
    },
    [deleteSection, activeSectionId, sections, selectSection, resetEditor, toast]
  );

  const handlePersistReorder = useCallback(
    async (tree: Section[]) => {
      if (!projectId) return;
      try {
        await reorderSections(projectId, tree);
      } catch {
        toast({
          title: "Erro ao reordenar",
          variant: "destructive",
        });
      }
    },
    [projectId, reorderSections, toast]
  );

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
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Nao foi possivel gerar a resposta.",
        variant: "destructive",
      });
    }
  }, [chatPrompt, chatAction, isChatLoading, project, sectionTitle, projectId, credits, sendMessage, setCredits, toast]);

  const applyAssistantContent = useCallback(
    async (messageContent: string, action: "insert" | "replace" | "append" | "outline") => {
      if (action === "insert") {
        appendContent(messageContent, projectId);
        return;
      }
      if (action === "replace") {
        replaceContent(messageContent, projectId);
        return;
      }
      if (action === "append") {
        try {
          const newSection = await createSection(projectId!, {
            title: inferSectionTitle(messageContent),
            content: messageContent,
            selectAfterCreate: true,
          });
          if (newSection) {
            selectSection(newSection);
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
          await createSection(projectId!, { title: item });
        }
        syncMode("structure");
        toast({ title: "Outline aplicado", description: `${items.length} secoes adicionadas.` });
      } catch {
        toast({ title: "Erro", description: "Nao foi possivel transformar a resposta em outline.", variant: "destructive" });
      }
    },
    [appendContent, replaceContent, createSection, selectSection, syncMode, projectId, toast]
  );

  const handleImprove = useCallback(
    async (text: string, type: string) => {
      if (credits < AI_ACTION_CREDIT_COSTS.improve) {
        toast({ title: "Creditos insuficientes", variant: "destructive" });
        return text;
      }
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "improve", text, context: type, projectId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCredits(data.remainingCredits);
        return data.response;
      }
      return text;
    },
    [credits, projectId, setCredits, toast]
  );

  const handleGenerateReference = useCallback(
    async (refData: ReferenceData) => {
      if (credits < AI_ACTION_CREDIT_COSTS.references) {
        toast({ title: "Creditos insuficientes", variant: "destructive" });
        return "";
      }
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "references",
          text: JSON.stringify(refData),
          context: sectionTitle,
          projectId,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCredits(data.remainingCredits);
        return data.response;
      }
      return "";
    },
    [credits, sectionTitle, projectId, setCredits, toast]
  );

  const handleExport = useCallback(
    (format: "docx" | "pdf") => {
      if (!projectId) return;
      void exportDocument(projectId, format).catch(() => {
        toast({ title: "Erro ao exportar", variant: "destructive" });
      });
    },
    [projectId, exportDocument, toast]
  );

  const handleSaveExport = useCallback(
    (format: "docx" | "pdf") => {
      if (!projectId) return;
      void saveExport(projectId, format).then(() => {
        toast({ title: "Exportacao guardada", description: `${format.toUpperCase()} guardado.` });
      }).catch(() => {
        toast({ title: "Erro ao guardar exportacao", variant: "destructive" });
      });
    },
    [projectId, saveExport, toast]
  );

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">A carregar o workspace do projecto...</p>
        </div>
      </div>
    );
  }

  if (!projectId || !project) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-6">
        <Card className="w-full max-w-xl border-border/60 bg-background/80 text-center shadow-sm">
          <CardContent className="space-y-4 p-10">
            <FolderTree className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="text-2xl font-semibold">Nenhum projecto seleccionado</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Escolha um projecto para entrar no workspace principal ou crie um novo trabalho.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-full">
                <Link href="/app/projects">Ver projectos</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/app/projects?new=1">Novo trabalho</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorHeader
        project={project}
        sectionTitle={sectionTitle}
        wordCount={wordCount}
        autoSaveStatus={autoSaveStatus}
        lastSaved={lastSaved}
        isSavingExport={isSavingExport}
        onExport={handleExport}
        onSaveExport={handleSaveExport}
        onStructureDrawerOpen={() => setStructureDrawerOpen(true)}
      />

      {workspaceMode === "chat" ? (
        <ChatMode
          project={project}
          activeSection={activeSection}
          sectionTitle={sectionTitle}
          chatMessages={chatMessages}
          chatPrompt={chatPrompt}
          chatAction={chatAction as ChatAction}
          isChatLoading={isChatLoading}
          chatSuggestions={chatSuggestions}
          onChatPromptChange={setChatPrompt}
          onChatActionChange={(action) => setChatAction(action)}
          onChatSubmit={handleChatSubmit}
          onApplyContent={applyAssistantContent}
        />
      ) : null}

      {workspaceMode === "document" ? (
        <DocumentMode
          project={project}
          sections={sections}
          activeSection={activeSection}
          activeSectionId={activeSectionId}
          sectionTitle={sectionTitle}
          content={content}
          wordCount={wordCount}
          autoSaveStatus={autoSaveStatus}
          lastSaved={lastSaved}
          credits={credits}
          chatMessages={chatMessages}
          chatPrompt={chatPrompt}
          chatAction={chatAction as ChatAction}
          isChatLoading={isChatLoading}
          chatSuggestions={chatSuggestions}
          onChatPromptChange={setChatPrompt}
          onChatActionChange={(action) => setChatAction(action)}
          onChatSubmit={handleChatSubmit}
          onApplyContent={applyAssistantContent}
          onSectionAdd={handleSectionAdd}
          onTitleChange={(title) => updateTitle(title, projectId)}
          onContentChange={(c) => updateContent(c, projectId)}
          onImprove={handleImprove}
          onGenerateReference={handleGenerateReference}
          onReplaceContent={(c) => replaceContent(c, projectId)}
          onAppendContent={(c) => appendContent(c, projectId)}
          onStructureDrawerOpen={() => setStructureDrawerOpen(true)}
          onChatModeOpen={() => syncMode("chat")}
        />
      ) : null}

      {workspaceMode === "structure" ? (
        <StructureMode
          project={project}
          sections={sections}
          activeSection={activeSection}
          activeSectionId={activeSectionId}
          onSectionSelect={handleSectionSelect}
          onSectionAdd={handleSectionAdd}
          onSectionRename={handleSectionRename}
          onSectionDelete={handleSectionDelete}
          onSectionReorder={handlePersistReorder}
          onModeChange={syncMode}
        />
      ) : null}

      {workspaceMode === "preview" ? (
        <PreviewPane
          project={project}
          sections={sections}
        />
      ) : null}

      {/* Structure Drawer */}
      <Sheet open={structureDrawerOpen} onOpenChange={setStructureDrawerOpen}>
        <SheetContent side="right" className="w-[360px] max-w-[92vw] p-0">
          <SheetHeader className="border-b border-border/50 px-4 py-4">
            <SheetTitle>Estrutura do projecto</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-72px)] overflow-hidden">
            <div className="flex h-full flex-col overflow-hidden rounded-none border-none bg-background shadow-none">
              <DocumentTree
                projectTitle={project.title}
                sections={sections}
                activeSectionId={activeSectionId}
                onSectionSelect={(id) => {
                  handleSectionSelect(id);
                  setStructureDrawerOpen(false);
                }}
                onSectionAdd={handleSectionAdd}
                onSectionRename={handleSectionRename}
                onSectionDelete={handleSectionDelete}
                onSectionReorder={handlePersistReorder}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
