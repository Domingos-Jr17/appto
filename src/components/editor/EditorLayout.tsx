"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileDown,
  FolderTree,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { countWordsInMarkdown } from "@/lib/content";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";
import { cn } from "@/lib/utils";
import {
  getEditorialStatus,
  getLastEditedSection,
  getResumeMode,
  getSectionSummary,
  type SectionSummary,
} from "@/lib/workspace";

interface Section {
  id: string;
  title: string;
  type: "chapter" | "section";
  parentId: string | null;
  order: number;
  updatedAt: string;
  wordCount: number;
  editorialStatus: "empty" | "started" | "drafting" | "review" | "stale";
  content: string;
  children: Section[];
}

interface Project {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  wordCount: number;
  resumeMode: WorkspaceMode;
  lastEditedSection: {
    id: string;
    title: string;
    updatedAt: string;
  } | null;
  sectionSummary: SectionSummary;
  sections: {
    id: string;
    title: string;
    content: string | null;
    order: number;
    wordCount: number;
    parentId: string | null;
    updatedAt: string;
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

interface ChatSuggestion {
  label: string;
  prompt: string;
  action: string;
}

function deriveSection(
  section: Omit<Section, "editorialStatus" | "children"> & { children?: Section[] }
): Section {
  return {
    ...section,
    editorialStatus: getEditorialStatus(section),
    children: (section.children || []).map(deriveSection),
  };
}

function normalizeSectionTree(sections: Section[], parentId: string | null = null): Section[] {
  return sections.map((section, index) => {
    const children = normalizeSectionTree(section.children || [], section.id);

    return deriveSection({
      ...section,
      parentId,
      order: index + 1,
      children,
    });
  });
}

function buildSectionTree(sections: Project["sections"]): Section[] {
  const sectionMap = new Map<string, Section>();
  const roots: Section[] = [];

  [...sections]
    .sort((left, right) => left.order - right.order)
    .forEach((section) => {
      sectionMap.set(
        section.id,
        deriveSection({
          id: section.id,
          title: section.title,
          type: section.parentId ? "section" : "chapter",
          parentId: section.parentId,
          order: section.order,
          updatedAt: section.updatedAt,
          wordCount: section.wordCount,
          content: section.content || "",
          children: [],
        })
      );
    });

  [...sections]
    .sort((left, right) => left.order - right.order)
    .forEach((section) => {
      const current = sectionMap.get(section.id);
      if (!current) return;

      if (section.parentId) {
        const parent = sectionMap.get(section.parentId);
        if (parent) {
          parent.children.push(current);
        }
      } else {
        roots.push(current);
      }
    });

  return normalizeSectionTree(roots);
}

function flattenSections(sections: Section[], parentId: string | null = null) {
  return sections.flatMap((section, index) => {
    const current = {
      id: section.id,
      title: section.title,
      content: section.content,
      order: index + 1,
      wordCount: section.wordCount,
      parentId,
      updatedAt: section.updatedAt,
    };

    return [current, ...flattenSections(section.children || [], section.id)];
  });
}

function findSectionById(sectionId: string, sections: Section[]): Section | null {
  for (const section of sections) {
    if (section.id === sectionId) return section;
    const nested = findSectionById(sectionId, section.children || []);
    if (nested) return nested;
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
    if (section.children.length > 0) {
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
      children: removeTree(section.children || [], sectionId),
    }));
}

function insertTree(sections: Section[], section: Section, parentId?: string | null): Section[] {
  if (!parentId) return normalizeSectionTree([...sections, section]);

  return normalizeSectionTree(
    sections.map((item) => {
      if (item.id === parentId) {
        return { ...item, children: [...(item.children || []), section] };
      }
      if (item.children.length > 0) {
        return { ...item, children: insertTree(item.children, section, parentId) };
      }
      return item;
    })
  );
}

function syncProjectWithTree(project: Project, tree: Section[]): Project {
  const flatSections = flattenSections(normalizeSectionTree(tree));
  const sectionSummary = getSectionSummary(flatSections);
  const lastEditedSection = getLastEditedSection(flatSections);
  const wordCount = flatSections.reduce((total, section) => total + section.wordCount, 0);

  return {
    ...project,
    wordCount,
    sections: flatSections,
    sectionSummary,
    lastEditedSection,
    resumeMode: getResumeMode({ wordCount, sections: flatSections }, lastEditedSection),
  };
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
  return firstLine ? firstLine.replace(/^#+\s*/, "").slice(0, 72) : "Nova secao";
}

function getSaveCopy(status: "saving" | "saved" | "error" | "idle", lastSaved?: Date) {
  if (status === "saving") return "A guardar...";
  if (status === "error") return "Falha ao guardar";
  if (!lastSaved) return "Sem alteracoes";
  return `Guardado ${lastSaved.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function getModeDescription(mode: WorkspaceMode) {
  if (mode === "chat") return "Conversa principal com a IA para gerar, alinhar e decidir o proximo passo.";
  if (mode === "document") return "Editor central em Markdown com foco na secao activa.";
  return "Plano editorial do projecto com hierarquia, ordem e estado inferido.";
}

function formatStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    IN_PROGRESS: "Em curso",
    REVIEW: "Em revisao",
    COMPLETED: "Concluido",
    ARCHIVED: "Arquivado",
  };

  return labels[status] || status;
}

function formatProjectType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function countTreeSections(sections: Section[]): number {
  return sections.reduce((total, section) => total + 1 + countTreeSections(section.children), 0);
}

function formatRelativeDate(value?: string) {
  if (!value) return "sem actividade recente";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "agora mesmo";
  if (diffHours < 24) return `ha ${diffHours}h`;
  if (diffDays < 7) return `ha ${diffDays}d`;

  return date.toLocaleDateString("pt-MZ", {
    day: "2-digit",
    month: "short",
  });
}

function getNextActionCopy(project: Project, activeSection: Section | null) {
  if (!project.sections.length) {
    return "Gerar outline no chat e abrir a primeira secao.";
  }

  if (!project.wordCount) {
    return "Aprovar a estrutura e iniciar a primeira secao.";
  }

  if (activeSection && activeSection.wordCount === 0) {
    return `Escrever a secao "${activeSection.title}".`;
  }

  if (project.sectionSummary.review > 0) {
    return "Rever secoes prontas e exportar uma nova versao.";
  }

  return "Continuar a secao activa ou pedir refinamento no chat.";
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
  const [contextRailOpen, setContextRailOpen] = useState(
    initialMode === "document" || initialMode === "structure"
  );
  const [mobileStructureOpen, setMobileStructureOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved" | "error" | "idle">(
    "idle"
  );
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
      if (nextMode === "document" || nextMode === "structure") {
        setContextRailOpen(true);
      }
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

        if (!projectResponse.ok) throw new Error("Projecto nao encontrado");

        const projectData = (await projectResponse.json()) as Project;
        const creditsData = await creditsResponse.json();
        const exportsData = exportsResponse.ok ? await exportsResponse.json() : { exports: [] };
        if (!active) return;

        const tree = buildSectionTree(projectData.sections);
        const preferredSectionId =
          projectData.lastEditedSection?.id ||
          tree.find((section) => section.children.length > 0)?.children[0]?.id ||
          tree[0]?.id ||
          null;
        const preferredSection = preferredSectionId
          ? findSectionById(preferredSectionId, tree)
          : null;
        const defaultMode = initialMode ?? projectData.resumeMode ?? "chat";

        setProject(projectData);
        setSections(tree);
        setCredits(creditsData.balance || 0);
        setSavedExports(exportsData.exports || []);
        setWorkspaceMode(defaultMode);
        setContextRailOpen(defaultMode !== "chat");

        if (preferredSection) {
          setActiveSectionId(preferredSection.id);
          setSectionTitle(preferredSection.title);
          setContent(preferredSection.content);
          setWordCount(preferredSection.wordCount);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Nao foi possivel carregar o projecto.",
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

  const totalSections = useMemo(() => countTreeSections(sections), [sections]);

  const updateProjectSnapshot = useCallback((tree: Section[]) => {
    setProject((previous) => (previous ? syncProjectWithTree(previous, tree) : previous));
  }, []);

  const persistReorder = useCallback(
    async (tree: Section[]) => {
      if (!projectId) return;

      const normalizedTree = normalizeSectionTree(tree);
      setSections(normalizedTree);
      updateProjectSnapshot(normalizedTree);

      try {
        const payload = flattenSections(normalizedTree).map((section) => ({
          id: section.id,
          parentId: section.parentId,
          order: section.order,
        }));

        const response = await fetch("/api/documents/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, items: payload }),
        });

        if (!response.ok) throw new Error();
        const reorderedSections = await response.json();
        const nextTree = buildSectionTree(reorderedSections);
        setSections(nextTree);
        updateProjectSnapshot(nextTree);
      } catch {
        toast({
          title: "Erro ao reordenar",
          description: "Nao foi possivel persistir a nova ordem editorial.",
          variant: "destructive",
        });
      }
    },
    [projectId, toast, updateProjectSnapshot]
  );

  const saveImmediately = useCallback(
    async (sectionId: string, nextTitle: string, nextContent: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      try {
        const response = await fetch(`/api/documents/${sectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle, content: nextContent }),
        });
        if (!response.ok) throw new Error();
        const savedSection = await response.json();

        setSections((previous) => {
          const nextTree = normalizeSectionTree(
            updateTree(previous, sectionId, (section) => ({
              ...section,
              title: savedSection.title,
              content: savedSection.content || "",
              wordCount: savedSection.wordCount,
              updatedAt: savedSection.updatedAt,
            }))
          );
          updateProjectSnapshot(nextTree);
          return nextTree;
        });
        setLastSaved(new Date());
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("error");
      }
    },
    [updateProjectSnapshot]
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
          const savedSection = await response.json();

          setSections((previous) => {
            const nextTree = normalizeSectionTree(
              updateTree(previous, activeSectionId, (section) => ({
                ...section,
                title: savedSection.title,
                content: savedSection.content || "",
                wordCount: savedSection.wordCount,
                updatedAt: savedSection.updatedAt,
              }))
            );
            updateProjectSnapshot(nextTree);
            return nextTree;
          });
          setWordCount(savedSection.wordCount);
          setLastSaved(new Date());
          setAutoSaveStatus("saved");
        } catch {
          setAutoSaveStatus("error");
          toast({
            title: "Erro ao guardar",
            description: "Nao foi possivel guardar a secao actual.",
            variant: "destructive",
          });
        }
      }, 850);
    },
    [activeSectionId, toast, updateProjectSnapshot]
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
      const mappedSection = deriveSection({
        id: newSection.id,
        title: newSection.title,
        type: parentId ? "section" : "chapter",
        parentId: parentId ?? null,
        order: newSection.order,
        updatedAt: newSection.updatedAt,
        wordCount: newSection.wordCount,
        content: newSection.content || "",
        children: [],
      });

      setSections((previous) => {
        const nextTree = insertTree(previous, mappedSection, parentId);
        updateProjectSnapshot(nextTree);
        return nextTree;
      });

      if (selectAfterCreate) {
        setActiveSectionId(mappedSection.id);
        setSectionTitle(mappedSection.title);
        setContent(mappedSection.content);
        setWordCount(mappedSection.wordCount);
        syncMode("document");
      }

      return mappedSection;
    },
    [projectId, syncMode, updateProjectSnapshot]
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
      setContent(nextSection.content);
      setWordCount(nextSection.wordCount);
      setMobileStructureOpen(false);
    },
    [activeSectionId, content, saveImmediately, sectionTitle, sections]
  );

  const handleSectionAdd = useCallback(
    async (parentId?: string) => {
      try {
        await createSection({
          title: parentId ? "Nova secao" : "Novo capitulo",
          parentId,
          selectAfterCreate: true,
        });
      } catch {
        toast({
          title: "Erro",
          description: "Nao foi possivel criar a secao.",
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
        const response = await fetch(`/api/documents/${sectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, content: existing?.content || "" }),
        });

        if (!response.ok) throw new Error();
        const savedSection = await response.json();

        setSections((previous) => {
          const nextTree = normalizeSectionTree(
            updateTree(previous, sectionId, (section) => ({
              ...section,
              title: savedSection.title,
              updatedAt: savedSection.updatedAt,
              content: savedSection.content || section.content,
              wordCount: savedSection.wordCount ?? section.wordCount,
            }))
          );
          updateProjectSnapshot(nextTree);
          return nextTree;
        });

        if (activeSectionId === sectionId) {
          setSectionTitle(savedSection.title);
        }
      } catch {
        toast({
          title: "Erro",
          description: "Nao foi possivel renomear a secao.",
          variant: "destructive",
        });
      }
    },
    [activeSectionId, sections, toast, updateProjectSnapshot]
  );

  const handleSectionDelete = useCallback(
    async (sectionId: string) => {
      try {
        const response = await fetch(`/api/documents/${sectionId}`, { method: "DELETE" });
        if (!response.ok) throw new Error();

        setSections((previous) => {
          const nextTree = normalizeSectionTree(removeTree(previous, sectionId));
          updateProjectSnapshot(nextTree);

          if (activeSectionId === sectionId) {
            const fallback = flattenSections(nextTree)[0] || null;
            setActiveSectionId(fallback?.id || null);
            setSectionTitle(fallback?.title || "");
            setContent(fallback?.content || "");
            setWordCount(fallback?.wordCount || 0);
          }

          return nextTree;
        });
      } catch {
        toast({
          title: "Erro",
          description: "Nao foi possivel eliminar a secao.",
          variant: "destructive",
        });
      }
    },
    [activeSectionId, toast, updateProjectSnapshot]
  );

  const handleGenerate = useCallback(
    async (prompt: string) => {
      if (credits < AI_ACTION_CREDIT_COSTS.generate) {
        toast({
          title: "Creditos insuficientes",
          description: "Adquira mais creditos para continuar a gerar conteudo.",
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
        throw new Error(data.error || "Erro ao gerar conteudo.");
      }

      setCredits(data.remainingCredits);
      return data.response;
    },
    [credits, projectId, sectionTitle, toast]
  );

  const handleImprove = useCallback(
    async (text: string, type: string) => {
      if (credits < AI_ACTION_CREDIT_COSTS.improve) {
        toast({
          title: "Creditos insuficientes",
          variant: "destructive",
        });
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
        toast({
          title: "Creditos insuficientes",
          variant: "destructive",
        });
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
      setWordCount(countWordsInMarkdown(nextContent));
      scheduleSave(sectionTitle, nextContent);
    },
    [scheduleSave, sectionTitle]
  );

  const handleReplaceDocumentContent = useCallback(
    (nextContent: string) => {
      if (!activeSectionId) return;

      setContent(nextContent);
      setWordCount(countWordsInMarkdown(nextContent));
      scheduleSave(sectionTitle, nextContent);
      syncMode("document");
      setMobileContextOpen(false);
    },
    [activeSectionId, scheduleSave, sectionTitle, syncMode]
  );

  const handleAppendDocumentContent = useCallback(
    (nextChunk: string) => {
      if (!activeSectionId) return;

      const nextContent = content.trim() ? `${content}\n\n${nextChunk}` : nextChunk;
      setContent(nextContent);
      setWordCount(countWordsInMarkdown(nextContent));
      scheduleSave(sectionTitle, nextContent);
      syncMode("document");
      setMobileContextOpen(false);
    },
    [activeSectionId, content, scheduleSave, sectionTitle, syncMode]
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
          description: "Verifique o saldo de creditos e tente novamente.",
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
          throw new Error(data.error || "Erro ao guardar exportacao");
        }

        setSavedExports((previous) => [data.export, ...previous].slice(0, 6));
        toast({
          title: "Exportacao guardada",
          description: `${format.toUpperCase()} guardado no storage do projecto.`,
        });
      } catch {
        toast({
          title: "Erro ao guardar exportacao",
          description: "Nao foi possivel persistir o ficheiro exportado.",
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
      if (action === "insert") {
        handleAppendDocumentContent(message.content);
        return;
      }

      if (action === "replace") {
        handleReplaceDocumentContent(message.content);
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
            description: "Nao foi possivel criar a nova secao.",
            variant: "destructive",
          });
        }
        return;
      }

      try {
        const outlineItems = extractOutlineTitles(message.content);
        const items = outlineItems.length
          ? outlineItems
          : ["Introducao", "Desenvolvimento", "Conclusao"];

        for (const item of items) {
          await createSection({ title: item });
        }

        syncMode("structure");
        toast({
          title: "Outline aplicado",
          description: `${items.length} secoes adicionadas a estrutura do projecto.`,
        });
      } catch {
        toast({
          title: "Erro",
          description: "Nao foi possivel transformar a resposta em outline.",
          variant: "destructive",
        });
      }
    },
    [createSection, handleAppendDocumentContent, handleReplaceDocumentContent, syncMode, toast]
  );

  const handleChatSubmit = useCallback(async () => {
    if (!chatPrompt.trim() || isChatLoading) return;

    const label =
      chatAction === "outline"
        ? "Gerar outline"
        : chatAction === "section"
          ? "Gerar secao"
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
          ? `Crie um outline academico para o projecto "${project?.title}" com base no pedido: ${chatPrompt}`
          : chatAction === "section"
            ? `Gere conteudo para a secao "${sectionTitle}" no projecto "${project?.title}": ${chatPrompt}`
            : chatAction === "rewrite"
              ? `Reescreva o conteudo desta secao com melhor clareza academica. Contexto: ${sectionTitle}. Pedido: ${chatPrompt}`
              : `Ajude-me a desenvolver este trabalho academico. Projecto: ${project?.title}. Pedido: ${chatPrompt}`;

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
        description:
          error instanceof Error ? error.message : "Nao foi possivel gerar a resposta.",
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  }, [chatAction, chatPrompt, handleGenerate, isChatLoading, project?.title, sectionTitle, toast]);

  const chatCost =
    chatAction === "rewrite" ? AI_ACTION_CREDIT_COSTS.improve : AI_ACTION_CREDIT_COSTS.generate;

  const chatSuggestions = useMemo<ChatSuggestion[]>(() => {
    if (!project) return [];

    if (!project.sections.length) {
      return [
        {
          label: "Gerar outline base",
          prompt: "Cria um outline academico com capitulos principais, subtitulos e ordem de desenvolvimento.",
          action: "outline",
        },
        {
          label: "Definir problema",
          prompt: `Ajuda-me a formular o problema central, objectivos e perguntas de investigacao para "${project.title}".`,
          action: "brainstorm",
        },
        {
          label: "Abrir primeira secao",
          prompt: "Depois do outline, sugere qual deve ser a primeira secao a escrever e como a iniciar.",
          action: "section",
        },
      ];
    }

    if (activeSection && activeSection.wordCount === 0) {
      return [
        {
          label: "Escrever secao activa",
          prompt: `Escreve um primeiro rascunho para a secao "${activeSection.title}" com tom academico e estrutura clara.`,
          action: "section",
        },
        {
          label: "Quebrar em argumentos",
          prompt: `Divide a secao "${activeSection.title}" em 3 a 5 argumentos ou subtitulos para orientar a escrita.`,
          action: "brainstorm",
        },
        {
          label: "Referencias provaveis",
          prompt: `Que tipos de referencias devo procurar para sustentar a secao "${activeSection.title}"?`,
          action: "brainstorm",
        },
      ];
    }

    return [
      {
        label: "Melhorar argumento",
        prompt: `Analisa a secao "${sectionTitle || "actual"}" e diz-me como reforcar a argumentacao sem perder clareza.`,
        action: "rewrite",
      },
      {
        label: "Criar proxima secao",
        prompt: "Sugere qual deve ser a proxima secao do trabalho e justifica a ordem.",
        action: "brainstorm",
      },
      {
        label: "Outline final",
        prompt: "Revise a estrutura actual e proponha um outline final pronto para revisao.",
        action: "outline",
      },
    ];
  }, [activeSection, project, sectionTitle]);

  const contextPanel = useMemo(() => {
    if (!project) return null;

    if (workspaceMode === "document") {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b border-border/50 p-4">
            <div className="rounded-3xl border border-border/60 bg-muted/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Secao activa
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {activeSection?.title || "Sem secao seleccionada"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeSection
                  ? `${activeSection.wordCount.toLocaleString("pt-MZ")} palavras`
                  : "Seleccione uma secao para usar as accoes contextuais."}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <AIAssistantPanel
              projectTitle={project.title}
              sectionTitle={activeSection?.title || sectionTitle || "Sem secao"}
              sectionContent={activeSection?.content || content}
              onImprove={handleImprove}
              onGenerateReference={handleGenerateReference}
              onApplyReplace={handleReplaceDocumentContent}
              onApplyAppend={handleAppendDocumentContent}
              creditBalance={credits}
            />
          </div>

          <div className="border-t border-border/50 p-4">
            <Card className="border-border/60 bg-muted/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Exportacoes guardadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {savedExports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ainda nao guardou exportacoes deste projecto.
                  </p>
                ) : (
                  savedExports.map((item) => (
                    <a
                      key={item.id}
                      href={item.file.contentUrl}
                      className="block rounded-2xl bg-background px-3 py-3 text-sm transition-colors hover:bg-accent"
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
        </div>
      );
    }

    if (workspaceMode === "structure") {
      return (
        <div className="space-y-4 p-4">
          <Card className="border-border/60 bg-muted/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo editorial</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
                <span>Vazias</span>
                <span className="font-medium text-foreground">{project.sectionSummary.empty}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
                <span>Iniciadas</span>
                <span className="font-medium text-foreground">{project.sectionSummary.started}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
                <span>Em desenvolvimento</span>
                <span className="font-medium text-foreground">{project.sectionSummary.drafting}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
                <span>Prontas para revisao</span>
                <span className="font-medium text-foreground">{project.sectionSummary.review}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
                <span>Paradas</span>
                <span className="font-medium text-foreground">{project.sectionSummary.stale}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-muted/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Secao seleccionada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">
                  {activeSection?.title || "Sem seleccao"}
                </p>
                <p className="mt-1">
                  {activeSection
                    ? `${activeSection.wordCount.toLocaleString("pt-MZ")} palavras`
                    : "Escolha uma secao para abrir no editor."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full rounded-2xl"
                  onClick={() => syncMode("document")}
                  disabled={!activeSectionId}
                >
                  Abrir no documento
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => handleSectionAdd(activeSectionId || undefined)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar subtitulo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        <Card className="border-border/60 bg-muted/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Continuacao do trabalho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                Projecto
              </p>
              <p className="mt-1 font-medium text-foreground">{project.title}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                Proxima accao
              </p>
              <p className="mt-1 text-foreground">{getNextActionCopy(project, activeSection)}</p>
            </div>
            <div className="rounded-2xl bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Custo da proxima accao</p>
              <p className="mt-1 text-base font-semibold text-foreground">{chatCost} creditos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-muted/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Atalhos de fluxo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "1. Use o chat para gerar outline ou decidir a proxima secao.",
              "2. Passe para Estrutura quando a resposta virar plano editorial.",
              "3. Escreva no Documento e use o rail lateral apenas para accoes tacticas.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-background px-3 py-3 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-muted/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo editorial</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
              <span>Vazias</span>
              <span className="font-medium text-foreground">{project.sectionSummary.empty}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
              <span>Em desenvolvimento</span>
              <span className="font-medium text-foreground">{project.sectionSummary.drafting}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2">
              <span>Prontas</span>
              <span className="font-medium text-foreground">{project.sectionSummary.review}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [
    activeSection,
    activeSectionId,
    chatCost,
    content,
    credits,
    handleAppendDocumentContent,
    handleGenerateReference,
    handleImprove,
    handleReplaceDocumentContent,
    handleSectionAdd,
    project,
    savedExports,
    sectionTitle,
    syncMode,
    workspaceMode,
  ]);

  const structurePanel = useMemo(
    () => (
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background/80 shadow-sm">
        <DocumentTree
          projectTitle={project?.title || ""}
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionSelect={handleSectionSelect}
          onSectionAdd={handleSectionAdd}
          onSectionRename={handleSectionRename}
          onSectionDelete={handleSectionDelete}
          onSectionReorder={persistReorder}
        />
      </div>
    ),
    [
      activeSectionId,
      handleSectionAdd,
      handleSectionDelete,
      handleSectionRename,
      handleSectionSelect,
      persistReorder,
      project?.title,
      sections,
    ]
  );

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
      <div className="border-b border-border/50 bg-background/80 px-4 py-4 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {formatProjectType(project.type)}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {formatStatusLabel(project.status)}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {credits.toLocaleString("pt-MZ")} creditos
                </Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{getModeDescription(workspaceMode)}</p>
                {project.description ? (
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    {project.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full xl:hidden"
                onClick={() => setMobileStructureOpen(true)}
              >
                <FolderTree className="mr-2 h-4 w-4" />
                Estrutura
              </Button>
              <Button
                variant="outline"
                className="rounded-full xl:hidden"
                onClick={() => setMobileContextOpen(true)}
              >
                <PanelRightOpen className="mr-2 h-4 w-4" />
                Contexto
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full">
                    {isSavingExport ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => void handleExport("docx")}>
                    <Download className="mr-2 h-4 w-4" />
                    Descarregar DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleExport("pdf")}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Descarregar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleSaveExport("docx")}>
                    <Download className="mr-2 h-4 w-4" />
                    Guardar DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleSaveExport("pdf")}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Guardar PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <WorkspaceModeTabs mode={workspaceMode} onModeChange={syncMode} />

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="rounded-full bg-background/70">
                Secao activa: {sectionTitle || "sem secao"}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-background/70">
                {wordCount.toLocaleString("pt-MZ")} palavras
              </Badge>
              <Badge variant="outline" className="rounded-full bg-background/70">
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
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
              structureRailOpen ? "w-[340px]" : "w-[72px]"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3 border-b border-border/50 p-4",
                !structureRailOpen && "justify-center"
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setStructureRailOpen((value) => !value)}
              >
                {structureRailOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
              {structureRailOpen ? (
                <div>
                  <p className="text-sm font-semibold">Estrutura</p>
                  <p className="text-xs text-muted-foreground">
                    Capitulos, subtitulos e progresso editorial.
                  </p>
                </div>
              ) : null}
            </div>
            {structureRailOpen ? (
              <div className="min-h-0 flex-1 overflow-hidden">{structurePanel}</div>
            ) : null}
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 overflow-hidden">
          {workspaceMode === "document" ? (
            activeSection ? (
              <div className="flex h-full flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 lg:px-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Documento
                    </p>
                    <h2 className="text-lg font-semibold">
                      {sectionTitle || "Seleccione uma secao"}
                    </h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getSaveCopy(autoSaveStatus, lastSaved)}
                  </div>
                </div>
                <WritingArea
                  sectionTitle={sectionTitle}
                  content={content}
                  onTitleChange={handleTitleChange}
                  onContentChange={handleContentChange}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-6 py-8">
                <Card className="w-full max-w-2xl border-border/60 bg-background/80 shadow-sm">
                  <CardContent className="space-y-4 p-8 text-center">
                    <Sparkles className="mx-auto h-10 w-10 text-primary/70" />
                    <h2 className="text-2xl font-semibold">
                      Abra uma secao para comecar a escrever
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Primeiro gere um outline no chat ou crie um capitulo na estrutura. O
                      editor abre sempre na secao activa.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button className="rounded-full" onClick={() => syncMode("chat")}>
                        Ir para conversa
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => handleSectionAdd(undefined)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar capitulo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          ) : null}

          {workspaceMode === "structure" ? (
            <div className="flex h-full flex-col gap-4 overflow-hidden p-4 lg:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-h-0 overflow-hidden">{structurePanel}</div>
                <div className="hidden space-y-4 lg:block">
                  <Card className="border-border/60 bg-background/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Resumo editorial</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm text-muted-foreground">
                      <div className="rounded-2xl bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                          Vazias
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {project.sectionSummary.empty}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                          Em desenvolvimento
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {project.sectionSummary.drafting}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                          Prontas
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {project.sectionSummary.review}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-background/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Secao em foco</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">
                          {activeSection?.title || "Sem seleccao"}
                        </p>
                        <p className="mt-1">
                          {activeSection
                            ? `${activeSection.wordCount.toLocaleString("pt-MZ")} palavras · ${formatRelativeDate(activeSection.updatedAt)}`
                            : "Seleccione uma secao para abrir no documento."}
                        </p>
                      </div>
                      <Button
                        className="w-full rounded-2xl"
                        onClick={() => syncMode("document")}
                        disabled={!activeSectionId}
                      >
                        Abrir no documento
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : null}

          {workspaceMode === "chat" ? (
            <div className="flex h-full min-h-0 flex-col">
              <ScrollArea className="flex-1 px-4 py-5 lg:px-6">
                <div className="mx-auto flex max-w-4xl flex-col gap-6">
                  <Card className="border-border/60 bg-background/80 shadow-sm">
                    <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Fluxo principal
                        </p>
                        <h2 className="mt-2 text-lg font-semibold">{project.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getNextActionCopy(project, activeSection)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">
                          Proxima accao: {chatCost} creditos
                        </Badge>
                        {project.lastEditedSection ? (
                          <Badge variant="outline" className="rounded-full">
                            Ultima secao: {project.lastEditedSection.title}
                          </Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  {chatMessages.length === 0 ? (
                    <div className="grid gap-4 lg:grid-cols-3">
                      {chatSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.label}
                          type="button"
                          onClick={() => {
                            setChatAction(suggestion.action);
                            setChatPrompt(suggestion.prompt);
                          }}
                          className="rounded-[28px] border border-border/60 bg-background/80 p-5 text-left shadow-sm transition-colors hover:bg-muted/35"
                        >
                          <p className="text-sm font-semibold text-foreground">{suggestion.label}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {suggestion.prompt}
                          </p>
                        </button>
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
                          {message.createdAt.toLocaleTimeString("pt-MZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {message.content}
                      </div>

                      {message.role === "assistant" ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => void applyAssistantContent(message, "insert")}
                          >
                            Inserir na secao
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => void applyAssistantContent(message, "replace")}
                          >
                            Substituir secao
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => void applyAssistantContent(message, "append")}
                          >
                            Nova secao
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => void applyAssistantContent(message, "outline")}
                          >
                            Virar outline
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t border-border/50 bg-background/85 px-4 py-4 backdrop-blur lg:px-6">
                <div className="mx-auto max-w-4xl space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {chatSuggestions.map((suggestion) => (
                      <Button
                        key={`pill-${suggestion.label}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setChatAction(suggestion.action);
                          setChatPrompt(suggestion.prompt);
                        }}
                      >
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row">
                    <Select value={chatAction} onValueChange={setChatAction}>
                      <SelectTrigger className="h-11 rounded-2xl lg:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brainstorm">Explorar tema</SelectItem>
                        <SelectItem value="outline">Gerar outline</SelectItem>
                        <SelectItem value="section">Gerar secao</SelectItem>
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
                        {chatCost} creditos
                      </Badge>
                      <span>Contexto activo: {sectionTitle || "sem secao"}</span>
                    </div>
                    <Button
                      className="rounded-full px-5"
                      onClick={() => void handleChatSubmit()}
                      disabled={!chatPrompt.trim() || isChatLoading}
                    >
                      {isChatLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        <ContextRail
          title={
            workspaceMode === "document"
              ? "Apoio tactico"
              : workspaceMode === "structure"
                ? "Leitura editorial"
                : "Contexto de trabalho"
          }
          description={
            workspaceMode === "document"
              ? "Accoes contextuais, referencias e historico de exportacao."
              : workspaceMode === "structure"
                ? "Resumo do plano e accoes para a secao seleccionada."
                : "Proxima accao, custos e orientacao para manter o fluxo."
          }
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
              {totalSections} secoes no projecto
            </Badge>
            <Badge variant="outline" className="rounded-full bg-background/80">
              {project.wordCount.toLocaleString("pt-MZ")} palavras no total
            </Badge>
            {project.lastEditedSection ? (
              <Badge variant="outline" className="rounded-full bg-background/80">
                Ultima edicao: {formatRelativeDate(project.lastEditedSection.updatedAt)}
              </Badge>
            ) : null}
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
              {workspaceMode === "document"
                ? "Apoio tactico"
                : workspaceMode === "structure"
                  ? "Leitura editorial"
                  : "Contexto de trabalho"}
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-72px)] overflow-auto">{contextPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
