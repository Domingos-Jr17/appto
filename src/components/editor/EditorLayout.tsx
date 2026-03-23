"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Download,
  FileDown,
  FolderTree,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  Send,
} from "lucide-react";
import { AIAssistantPanel } from "@/components/editor/AIAssistantPanel";
import { DocumentTree } from "@/components/editor/DocumentTree";
import { WritingArea } from "@/components/editor/WritingArea";
import { ContextRail } from "@/components/workspace/ContextRail";
import {
  WorkspaceModeTabs,
  type WorkspaceMode,
} from "@/components/workspace/WorkspaceModeTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  type: "chapter" | "section";
  children?: Section[];
  wordCount?: number;
  content?: string;
}

interface Project {
  id: string;
  title: string;
  type: string;
  status: string;
  wordCount: number;
  sections: {
    id: string;
    title: string;
    content: string | null;
    order: number;
    wordCount: number;
    parentId: string | null;
  }[];
}

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface SavedExport {
  id: string;
  format: "DOCX" | "PDF";
  createdAt: string;
  file: {
    id: string;
    originalName: string;
    downloadUrl: string;
    contentUrl: string;
  };
}

interface EditorLayoutProps {
  projectId?: string;
  initialMode?: WorkspaceMode;
}

interface CreateSectionOptions {
  title: string;
  content?: string;
  parentId?: string | null;
  selectAfterCreate?: boolean;
}

function buildSectionTree(sections: Project["sections"]): Section[] {
  const sectionMap = new Map<string, Section>();
  const roots: Section[] = [];

  sections.forEach((section) => {
    sectionMap.set(section.id, {
      id: section.id,
      title: section.title,
      type: /^\d+\./.test(section.title) ? "chapter" : "section",
      wordCount: section.wordCount,
      content: section.content || "",
      children: [],
    });
  });

  sections.forEach((section) => {
    const current = sectionMap.get(section.id);
    if (!current) return;

    if (section.parentId) {
      const parent = sectionMap.get(section.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(current);
      }
    } else {
      roots.push(current);
    }
  });

  return roots;
}

function findSectionById(sectionId: string, sections: Section[]): Section | null {
  for (const section of sections) {
    if (section.id === sectionId) return section;
    if (section.children?.length) {
      const nested = findSectionById(sectionId, section.children);
      if (nested) return nested;
    }
  }
  return null;
}

function updateTree(
  sections: Section[],
  sectionId: string,
  updater: (section: Section) => Section
): Section[] {
  return sections.map((section) => {
    if (section.id === sectionId) return updater(section);
    if (section.children?.length) {
      return { ...section, children: updateTree(section.children, sectionId, updater) };
    }
    return section;
  });
}

function removeTree(sections: Section[], sectionId: string): Section[] {
  return sections
    .filter((section) => section.id !== sectionId)
    .map((section) => ({
      ...section,
      children: section.children?.length ? removeTree(section.children, sectionId) : section.children,
    }));
}

function insertTree(sections: Section[], section: Section, parentId?: string | null): Section[] {
  if (!parentId) return [...sections, section];
  return sections.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children || []), section] };
    }
    if (item.children?.length) {
      return { ...item, children: insertTree(item.children, section, parentId) };
    }
    return item;
  });
}

function countWords(content: string) {
  return content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function extractOutlineTitles(content: string) {
  return content
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+[).]?\s*/, "").trim())
    .filter((line) => line.length > 3)
    .slice(0, 8);
}

function inferSectionTitle(content: string) {
  const firstLine = content.split("\n").map((line) => line.trim()).find(Boolean);
  return firstLine ? firstLine.replace(/^#+\s*/, "").slice(0, 72) : "Nova secção";
}

function getSaveCopy(status: "saving" | "saved" | "error" | "idle", lastSaved?: Date) {
  if (status === "saving") return "A guardar...";
  if (status === "error") return "Falha ao guardar";
  if (!lastSaved) return "Sem alterações";
  return `Guardado ${lastSaved.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function getModeDescription(mode: WorkspaceMode) {
  if (mode === "chat") return "Converse com a IA sem perder o contexto do projecto.";
  if (mode === "document") return "Edite a secção activa com foco e acções rápidas ao lado.";
  return "Planeie capítulos, subtítulos e progresso editorial.";
}

export function EditorLayout({ projectId: propProjectId, initialMode }: EditorLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const projectId = propProjectId ?? null;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [credits, setCredits] = useState(0);
  const [savedExports, setSavedExports] = useState<SavedExport[]>([]);
  const [isSavingExport, setIsSavingExport] = useState<"docx" | "pdf" | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode ?? "chat");
  const [structureRailOpen, setStructureRailOpen] = useState(true);
  const [contextRailOpen, setContextRailOpen] = useState(initialMode !== "chat");
  const [mobileStructureOpen, setMobileStructureOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved" | "error" | "idle">("idle");
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([]);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatAction, setChatAction] = useState("brainstorm");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const syncMode = useCallback(
    (nextMode: WorkspaceMode) => {
      setWorkspaceMode(nextMode);
      if (projectId) {
        router.replace(`/app/editor?project=${projectId}&mode=${nextMode}`, { scroll: false });
      }
      if (nextMode === "document") setContextRailOpen(true);
    },
    [projectId, router]
  );

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const fetchData = async () => {
      try {
        const [projectResponse, creditsResponse, exportsResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch("/api/credits"),
          fetch(`/api/projects/${projectId}/exports`),
        ]);

        if (!projectResponse.ok) throw new Error("Projeto não encontrado");

        const projectData = await projectResponse.json();
        const creditsData = await creditsResponse.json();
        const exportsData = exportsResponse.ok ? await exportsResponse.json() : { exports: [] };
        if (!active) return;

        const tree = buildSectionTree(projectData.sections);
        const firstSection =
          tree.find((section) => section.children?.length)?.children?.[0] ?? tree[0] ?? null;

        setProject(projectData);
        setSections(tree);
        setCredits(creditsData.balance || 0);
        setSavedExports(exportsData.exports || []);

        if (firstSection) {
          setActiveSectionId(firstSection.id);
          setSectionTitle(firstSection.title);
          setContent(firstSection.content || "");
          setWordCount(firstSection.wordCount || 0);
        }

        if (!initialMode) {
          const defaultMode: WorkspaceMode = projectData.wordCount > 0 ? "document" : "chat";
          setWorkspaceMode(defaultMode);
          setContextRailOpen(defaultMode === "document");
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o projecto.",
          variant: "destructive",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [initialMode, projectId, toast]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const activeSection = useMemo(
    () => (activeSectionId ? findSectionById(activeSectionId, sections) : null),
    [activeSectionId, sections]
  );

  const saveImmediately = useCallback(
    async (sectionId: string, nextTitle: string, nextContent: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      try {
        await fetch(`/api/documents/${sectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle, content: nextContent }),
        });

        setSections((previous) =>
          updateTree(previous, sectionId, (section) => ({
            ...section,
            title: nextTitle,
            content: nextContent,
            wordCount: countWords(nextContent),
          }))
        );
        setLastSaved(new Date());
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("error");
      }
    },
    []
  );

  const scheduleSave = useCallback(
    (nextTitle: string, nextContent: string) => {
      if (!activeSectionId) return;

      setAutoSaveStatus("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/documents/${activeSectionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: nextTitle, content: nextContent }),
          });

          if (!response.ok) throw new Error();

          setSections((previous) =>
            updateTree(previous, activeSectionId, (section) => ({
              ...section,
              title: nextTitle,
              content: nextContent,
              wordCount: countWords(nextContent),
            }))
          );
          setWordCount(countWords(nextContent));
          setLastSaved(new Date());
          setAutoSaveStatus("saved");
        } catch {
          setAutoSaveStatus("error");
          toast({
            title: "Erro ao guardar",
            description: "Não foi possível guardar a secção actual.",
            variant: "destructive",
          });
        }
      }, 950);
    },
    [activeSectionId, toast]
  );

  const createSection = useCallback(
    async ({ title, content: sectionContent = "", parentId, selectAfterCreate }: CreateSectionOptions) => {
      if (!projectId) return null;

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          parentId,
          title,
          content: sectionContent,
          order: Date.now(),
        }),
      });

      if (!response.ok) throw new Error();

      const newSection = await response.json();
      const mappedSection: Section = {
        id: newSection.id,
        title: newSection.title,
        type: parentId ? "section" : "chapter",
        wordCount: newSection.wordCount,
        content: newSection.content || "",
        children: [],
      };

      setSections((previous) => insertTree(previous, mappedSection, parentId));

      if (selectAfterCreate) {
        setActiveSectionId(mappedSection.id);
        setSectionTitle(mappedSection.title);
        setContent(mappedSection.content || "");
        setWordCount(mappedSection.wordCount || 0);
        syncMode("document");
      }

      return mappedSection;
    },
    [projectId, syncMode]
  );

  const handleSectionSelect = useCallback(
    (sectionId: string) => {
      if (activeSectionId) {
        void saveImmediately(activeSectionId, sectionTitle, content);
      }

      const nextSection = findSectionById(sectionId, sections);
      if (!nextSection) return;

      setActiveSectionId(sectionId);
      setSectionTitle(nextSection.title);
      setContent(nextSection.content || "");
      setWordCount(nextSection.wordCount || 0);
      setMobileStructureOpen(false);
    },
    [activeSectionId, content, saveImmediately, sectionTitle, sections]
  );

  const handleSectionAdd = useCallback(
    async (parentId?: string) => {
      try {
        await createSection({
          title: parentId ? "Nova secção" : "Novo capítulo",
          parentId,
          selectAfterCreate: true,
        });
      } catch {
        toast({
          title: "Erro",
          description: "Não foi possível criar a secção.",
          variant: "destructive",
        });
      }
    },
    [createSection, toast]
  );

  const handleSectionRename = useCallback(
    async (sectionId: string, newTitle: string) => {
      try {
        const existing = findSectionById(sectionId, sections);
        await fetch(`/api/documents/${sectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, content: existing?.content || "" }),
        });

        setSections((previous) =>
          updateTree(previous, sectionId, (section) => ({ ...section, title: newTitle }))
        );

        if (activeSectionId === sectionId) {
          setSectionTitle(newTitle);
        }
      } catch {
        toast({
          title: "Erro",
          description: "Não foi possível renomear a secção.",
          variant: "destructive",
        });
      }
    },
    [activeSectionId, sections, toast]
  );

  const handleSectionDelete = useCallback(
    async (sectionId: string) => {
      try {
        const response = await fetch(`/api/documents/${sectionId}`, { method: "DELETE" });
        if (!response.ok) throw new Error();

        setSections((previous) => removeTree(previous, sectionId));

        if (activeSectionId === sectionId) {
          const fallback = sections.find((section) => section.id !== sectionId) || null;
          setActiveSectionId(fallback?.id || null);
          setSectionTitle(fallback?.title || "");
          setContent(fallback?.content || "");
          setWordCount(fallback?.wordCount || 0);
        }
      } catch {
        toast({
          title: "Erro",
          description: "Não foi possível eliminar a secção.",
          variant: "destructive",
        });
      }
    },
    [activeSectionId, sections, toast]
  );

  const handleGenerate = useCallback(
    async (prompt: string) => {
      if (credits < AI_ACTION_CREDIT_COSTS.generate) {
        toast({
          title: "Créditos insuficientes",
          description: "Adquira mais créditos para continuar a gerar conteúdo.",
          variant: "destructive",
        });
        return "";
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          text: prompt,
          context: sectionTitle,
          projectId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar conteúdo.");
      }

      setCredits(data.remainingCredits);
      return data.response;
    },
    [credits, projectId, sectionTitle, toast]
  );

  const handleImprove = useCallback(
    async (text: string, type: string) => {
      if (credits < AI_ACTION_CREDIT_COSTS.improve) {
        toast({ title: "Créditos insuficientes", variant: "destructive" });
        return text;
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improve",
          text,
          context: type,
          projectId,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setCredits(data.remainingCredits);
        return data.response;
      }

      return text;
    },
    [credits, projectId, toast]
  );

  const handleGenerateReference = useCallback(
    async (payload: {
      type: "book" | "article" | "website" | "thesis";
      authors: string;
      title: string;
      year: string;
      publisher?: string;
      journal?: string;
      volume?: string;
      pages?: string;
      url?: string;
      accessDate?: string;
    }) => {
      if (credits < AI_ACTION_CREDIT_COSTS.references) {
        toast({ title: "Créditos insuficientes", variant: "destructive" });
        return "";
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "references",
          text: JSON.stringify(payload),
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
    [credits, projectId, sectionTitle, toast]
  );

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setSectionTitle(nextTitle);
      scheduleSave(nextTitle, content);
    },
    [content, scheduleSave]
  );

  const handleContentChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      setWordCount(countWords(nextContent));
      scheduleSave(sectionTitle, nextContent);
    },
    [scheduleSave, sectionTitle]
  );

  const handleExport = useCallback(
    async (format: "docx" | "pdf") => {
      if (!projectId) return;

      try {
        const response = await fetch(
          format === "docx"
            ? `/api/export?projectId=${projectId}`
            : `/api/export/pdf?projectId=${projectId}`
        );
        if (!response.ok) throw new Error();

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${project?.title || "documento"}.${format}`;
        anchor.click();
        URL.revokeObjectURL(url);

        const creditsResponse = await fetch("/api/credits");
        const creditsData = await creditsResponse.json();
        setCredits(creditsData.balance || 0);
      } catch {
        toast({
          title: "Erro ao exportar",
          description: "Verifique o saldo de créditos e tente novamente.",
          variant: "destructive",
        });
      }
    },
    [project?.title, projectId, toast]
  );

  const handleSaveExport = useCallback(
    async (format: "docx" | "pdf") => {
      if (!projectId) return;

      setIsSavingExport(format);
      try {
        const exportFormat = format === "pdf" ? "PDF" : "DOCX";
        const response = await fetch(`/api/projects/${projectId}/export/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: exportFormat }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao guardar exportaÃ§Ã£o");
        }

        setSavedExports((previous) => [data.export, ...previous].slice(0, 6));
        toast({
          title: "ExportaÃ§Ã£o guardada",
          description: `${format.toUpperCase()} guardado no storage do projecto.`,
        });
      } catch {
        toast({
          title: "Erro ao guardar exportaÃ§Ã£o",
          description: "NÃ£o foi possÃ­vel persistir o ficheiro exportado.",
          variant: "destructive",
        });
      } finally {
        setIsSavingExport(null);
      }
    },
    [projectId, toast]
  );

  const applyAssistantContent = useCallback(
    async (message: AssistantMessage, action: "insert" | "replace" | "append" | "outline") => {
      if (!activeSectionId) return;

      if (action === "insert") {
        const nextContent = content ? `${content}\n\n${message.content}` : message.content;
        setContent(nextContent);
        setWordCount(countWords(nextContent));
        scheduleSave(sectionTitle, nextContent);
        syncMode("document");
        return;
      }

      if (action === "replace") {
        setContent(message.content);
        setWordCount(countWords(message.content));
        scheduleSave(sectionTitle, message.content);
        syncMode("document");
        return;
      }

      if (action === "append") {
        try {
          await createSection({
            title: inferSectionTitle(message.content),
            content: message.content,
            selectAfterCreate: true,
          });
        } catch {
          toast({
            title: "Erro",
            description: "Não foi possível criar a nova secção.",
            variant: "destructive",
          });
        }
        return;
      }

      try {
        const outlineItems = extractOutlineTitles(message.content);
        const items = outlineItems.length ? outlineItems : ["Introdução", "Desenvolvimento", "Conclusão"];

        for (const item of items) {
          await createSection({ title: item });
        }

        syncMode("structure");
        toast({
          title: "Outline aplicado",
          description: `${items.length} secções adicionadas à estrutura do projecto.`,
        });
      } catch {
        toast({
          title: "Erro",
          description: "Não foi possível transformar a resposta em outline.",
          variant: "destructive",
        });
      }
    },
    [activeSectionId, content, createSection, scheduleSave, sectionTitle, syncMode, toast]
  );

  const handleChatSubmit = useCallback(async () => {
    if (!chatPrompt.trim() || isChatLoading) return;

    const label =
      chatAction === "outline"
        ? "Gerar outline"
        : chatAction === "section"
          ? "Gerar secção"
          : chatAction === "rewrite"
            ? "Reformular"
            : "Explorar";

    setChatMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: `[${label}] ${chatPrompt}`,
        createdAt: new Date(),
      },
    ]);
    setIsChatLoading(true);

    try {
      const composedPrompt =
        chatAction === "outline"
          ? `Crie um outline académico para o projecto "${project?.title}" com base no pedido: ${chatPrompt}`
          : chatAction === "section"
            ? `Gere conteúdo para a secção "${sectionTitle}" no projecto "${project?.title}": ${chatPrompt}`
            : chatAction === "rewrite"
              ? `Reescreva o conteúdo desta secção com melhor clareza académica. Contexto: ${sectionTitle}. Pedido: ${chatPrompt}`
              : `Ajude-me a desenvolver este trabalho académico. Projeto: ${project?.title}. Pedido: ${chatPrompt}`;

      const response = await handleGenerate(composedPrompt);
      setChatMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response,
          createdAt: new Date(),
        },
      ]);
      setChatPrompt("");
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível gerar a resposta.",
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  }, [chatAction, chatPrompt, handleGenerate, isChatLoading, project?.title, sectionTitle, toast]);

  const chatCost =
    chatAction === "rewrite" ? AI_ACTION_CREDIT_COSTS.improve : AI_ACTION_CREDIT_COSTS.generate;

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

  const structurePanel = (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background/80 shadow-sm">
      <DocumentTree
        projectTitle={project.title}
        sections={sections}
        activeSectionId={activeSectionId}
        onSectionSelect={handleSectionSelect}
        onSectionAdd={handleSectionAdd}
        onSectionRename={handleSectionRename}
        onSectionDelete={handleSectionDelete}
        onSectionReorder={setSections}
      />
    </div>
  );

  const contextPanel = workspaceMode === "document" ? (
    <div className="space-y-4 p-4">
      <AIAssistantPanel
        onGenerate={handleGenerate}
        onImprove={handleImprove}
        onGenerateReference={handleGenerateReference}
        creditBalance={credits}
      />

      <Card className="border-border/60 bg-muted/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ExportaÃ§Ãµes guardadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {savedExports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda nÃ£o guardou exportaÃ§Ãµes deste projecto.
            </p>
          ) : (
            savedExports.map((item) => (
              <a
                key={item.id}
                href={item.file.contentUrl}
                className="block rounded-2xl bg-background px-3 py-3 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{item.format}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("pt-MZ")}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.file.originalName}
                </p>
              </a>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  ) : workspaceMode === "structure" ? (
    <div className="space-y-4 p-4">
      <Card className="border-border/60 bg-muted/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Secção activa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{activeSection?.title || "Sem selecção"}</p>
          <p>{(activeSection?.wordCount || 0).toLocaleString("pt-MZ")} palavras</p>
          <p>{sections.length} capítulos de topo</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button className="w-full rounded-2xl" onClick={() => handleSectionAdd(activeSectionId || undefined)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar subtítulo
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-2xl"
          onClick={() => syncMode("document")}
          disabled={!activeSectionId}
        >
          Abrir no documento
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-4 p-4">
      <Card className="border-border/60 bg-muted/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contexto actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Projecto</p>
            <p className="mt-1 font-medium text-foreground">{project.title}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Secção activa</p>
            <p className="mt-1 font-medium text-foreground">{sectionTitle || "Nenhuma secção activa"}</p>
          </div>
          <div className="rounded-2xl bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Custo da próxima acção</p>
            <p className="text-base font-semibold text-foreground">{chatCost} créditos</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-muted/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Aplicações rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "Peça à IA para abrir um outline antes de escrever.",
            "Insira respostas aprovadas directamente no documento.",
            "Quando a resposta virar estrutura, aplique como outline e troque de modo.",
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-background px-3 py-2 text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border/50 bg-background/80 px-4 py-4 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {project.type}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {project.status}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {credits.toLocaleString("pt-MZ")} créditos
                </Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{getModeDescription(workspaceMode)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="rounded-full xl:hidden" onClick={() => setMobileStructureOpen(true)}>
                <FolderTree className="mr-2 h-4 w-4" />
                Estrutura
              </Button>
              <Button variant="outline" className="rounded-full xl:hidden" onClick={() => setMobileContextOpen(true)}>
                <PanelRightOpen className="mr-2 h-4 w-4" />
                Painel
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => void handleExport("docx")}>
                <Download className="mr-2 h-4 w-4" />
                DOCX
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => void handleExport("pdf")}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => void handleSaveExport("docx")}
                disabled={isSavingExport !== null}
              >
                {isSavingExport === "docx" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Guardar DOCX
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => void handleSaveExport("pdf")}
                disabled={isSavingExport !== null}
              >
                {isSavingExport === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Guardar PDF
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <WorkspaceModeTabs mode={workspaceMode} onModeChange={syncMode} />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="rounded-full bg-background/70">
                Secção activa: {sectionTitle || "sem secção"}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-background/70">
                {wordCount.toLocaleString("pt-MZ")} palavras
              </Badge>
              <Badge variant="outline" className="rounded-full bg-background/70">
                {getSaveCopy(autoSaveStatus, lastSaved)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {workspaceMode === "document" ? (
          <aside
            className={cn(
              "hidden border-r border-border/50 bg-background/65 backdrop-blur xl:flex xl:flex-col",
              structureRailOpen ? "w-[320px]" : "w-[72px]"
            )}
          >
            <div className={cn("flex items-center gap-3 border-b border-border/50 p-4", !structureRailOpen && "justify-center")}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setStructureRailOpen((value) => !value)}
              >
                {structureRailOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
              {structureRailOpen ? (
                <div>
                  <p className="text-sm font-semibold">Estrutura</p>
                  <p className="text-xs text-muted-foreground">Capítulos e secções sempre à mão</p>
                </div>
              ) : null}
            </div>
            {structureRailOpen ? <div className="min-h-0 flex-1 overflow-hidden">{structurePanel}</div> : null}
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 overflow-hidden">
          {workspaceMode === "document" ? (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 lg:px-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Documento</p>
                  <h2 className="text-lg font-semibold">{sectionTitle || "Seleccione uma secção"}</h2>
                </div>
                <div className="text-sm text-muted-foreground">{getSaveCopy(autoSaveStatus, lastSaved)}</div>
              </div>
              <WritingArea
                sectionTitle={sectionTitle}
                content={content}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                aiSuggestions={[]}
              />
            </div>
          ) : null}

          {workspaceMode === "structure" ? (
            <div className="flex h-full flex-col gap-4 overflow-hidden p-4 lg:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-h-0 overflow-hidden">{structurePanel}</div>
                <Card className="hidden border-border/60 bg-background/80 shadow-sm lg:block">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Leitura editorial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Capítulos</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{sections.length}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Secção activa</p>
                      <p className="mt-1 font-medium text-foreground">{activeSection?.title || "Sem selecção"}</p>
                    </div>
                    <Button className="w-full rounded-2xl" onClick={() => syncMode("document")} disabled={!activeSectionId}>
                      Abrir no documento
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {workspaceMode === "chat" ? (
            <div className="flex h-full min-h-0 flex-col">
              <ScrollArea className="flex-1 px-4 py-5 lg:px-6">
                <div className="mx-auto flex max-w-4xl flex-col gap-6">
                  <Card className="border-border/60 bg-background/80 shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contexto do projecto</p>
                        <h2 className="mt-2 text-lg font-semibold">{project.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Secção activa: {sectionTitle || "nenhuma"} · {wordCount.toLocaleString("pt-MZ")} palavras
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        Próxima acção: {chatCost} créditos
                      </Badge>
                    </CardContent>
                  </Card>

                  {chatMessages.length === 0 ? (
                    <div className="grid gap-3 lg:grid-cols-3">
                      {[
                        "Peça um outline académico antes de estruturar o trabalho.",
                        "Use a conversa para gerar um argumento inicial e depois aplique ao documento.",
                        "Quando a resposta ficar boa, transforme-a em secções reais do projecto.",
                      ].map((item) => (
                        <Card key={item} className="border-border/60 bg-background/75 shadow-sm">
                          <CardContent className="p-5 text-sm leading-6 text-muted-foreground">{item}</CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : null}

                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-[28px] border px-5 py-4 shadow-sm",
                        message.role === "user"
                          ? "ml-auto max-w-3xl border-primary/20 bg-primary/10"
                          : "mr-auto max-w-4xl border-border/60 bg-background/80"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {message.role === "user" ? "Pedido" : "Resposta"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {message.createdAt.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {message.content}
                      </div>

                      {message.role === "assistant" ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void applyAssistantContent(message, "insert")}>
                            Inserir no documento
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void applyAssistantContent(message, "replace")}>
                            Substituir secção actual
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void applyAssistantContent(message, "append")}>
                            Adicionar como nova secção
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void applyAssistantContent(message, "outline")}>
                            Transformar em outline
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t border-border/50 bg-background/85 px-4 py-4 backdrop-blur lg:px-6">
                <div className="mx-auto max-w-4xl space-y-3">
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <Select value={chatAction} onValueChange={setChatAction}>
                      <SelectTrigger className="h-11 rounded-2xl lg:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brainstorm">Explorar tema</SelectItem>
                        <SelectItem value="outline">Gerar outline</SelectItem>
                        <SelectItem value="section">Gerar secção</SelectItem>
                        <SelectItem value="rewrite">Reformular</SelectItem>
                      </SelectContent>
                    </Select>

                    <Textarea
                      value={chatPrompt}
                      onChange={(event) => setChatPrompt(event.target.value)}
                      placeholder="Descreva o que precisa da IA neste projecto..."
                      className="min-h-[94px] rounded-[24px] border-border/60 bg-background/80 px-4 py-3"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="rounded-full bg-background/80">
                        {chatCost} créditos
                      </Badge>
                      <span>Contexto activo: {sectionTitle || "sem secção"}</span>
                    </div>
                    <Button className="rounded-full px-5" onClick={() => void handleChatSubmit()} disabled={!chatPrompt.trim() || isChatLoading}>
                      {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        <ContextRail
          title={workspaceMode === "document" ? "Painel de apoio" : workspaceMode === "structure" ? "Detalhes da estrutura" : "Contexto da conversa"}
          description={workspaceMode === "document" ? "IA, referências e acções rápidas para a secção actual." : workspaceMode === "structure" ? "Informação da secção seleccionada e acções editoriais." : "Prompt helpers, custos e contexto do projecto."}
          open={contextRailOpen}
          onToggle={() => setContextRailOpen((value) => !value)}
        >
          {contextPanel}
        </ContextRail>
      </div>

      <div className="border-t border-border/50 bg-background/80 px-4 py-3 text-sm text-muted-foreground backdrop-blur lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full bg-background/80">
              {project.sections.length} secções no projecto
            </Badge>
            <Badge variant="outline" className="rounded-full bg-background/80">
              {project.wordCount.toLocaleString("pt-MZ")} palavras no total
            </Badge>
          </div>
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href="/app/projects">
              Biblioteca de projectos
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Sheet open={mobileStructureOpen} onOpenChange={setMobileStructureOpen}>
        <SheetContent side="left" className="w-[340px] max-w-[92vw] p-0">
          <SheetHeader className="border-b border-border/50 px-4 py-4">
            <SheetTitle>Estrutura do projecto</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-72px)] overflow-hidden">{structurePanel}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
        <SheetContent side="right" className="w-[360px] max-w-[92vw] p-0">
          <SheetHeader className="border-b border-border/50 px-4 py-4">
            <SheetTitle>
              {workspaceMode === "document" ? "Painel de apoio" : workspaceMode === "structure" ? "Detalhes da estrutura" : "Contexto da conversa"}
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-72px)] overflow-auto">{contextPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
