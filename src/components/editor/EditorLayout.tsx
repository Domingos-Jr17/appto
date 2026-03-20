"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Home,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  Loader2,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentTree } from "./DocumentTree";
import { WritingArea } from "./WritingArea";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { CreditsBar } from "./CreditsBar";

// Types
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

// Transform flat sections from API into tree structure
function buildSectionTree(sections: Project["sections"]): Section[] {
  const sectionMap = new Map<string, Section>();
  const rootSections: Section[] = [];

  // First pass: create all sections
  sections.forEach((s) => {
    sectionMap.set(s.id, {
      id: s.id,
      title: s.title,
      type: /^\d+\./.test(s.title) ? "chapter" : "section",
      wordCount: s.wordCount,
      content: s.content || "",
      children: [],
    });
  });

  // Second pass: build tree
  sections.forEach((s) => {
    const section = sectionMap.get(s.id)!;
    if (s.parentId) {
      const parent = sectionMap.get(s.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(section);
      }
    } else {
      rootSections.push(section);
    }
  });

  return rootSections;
}

// Determine section type based on title pattern
function getSectionType(title: string): "chapter" | "section" {
  if (/^\d+\./.test(title)) return "chapter";
  return "section";
}

interface EditorLayoutProps {
  projectId?: string;
}

export function EditorLayout({ projectId: propProjectId }: EditorLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // Get project ID from URL or prop
  const projectId = propProjectId || searchParams.get("project");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Project data
  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [credits, setCredits] = useState(0);

  // Panel states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Editor states
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved" | "error" | "idle">("saved");
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  // Fetch project data
  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [projectRes, creditsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch("/api/credits"),
        ]);

        if (!projectRes.ok) {
          throw new Error("Projeto não encontrado");
        }

        const projectData = await projectRes.json();
        const creditsData = await creditsRes.json();

        setProject(projectData);
        setCredits(creditsData.balance || 0);

        // Build section tree
        const tree = buildSectionTree(projectData.sections);
        setSections(tree);

        // Select first section
        if (tree.length > 0 && tree[0].children && tree[0].children.length > 0) {
          const firstSection = tree[0].children[0];
          setActiveSectionId(firstSection.id);
          setSectionTitle(firstSection.title);
          setContent(firstSection.content || "");
          setWordCount(firstSection.wordCount || 0);
        } else if (tree.length > 0) {
          setActiveSectionId(tree[0].id);
          setSectionTitle(tree[0].title);
          setContent(tree[0].content || "");
          setWordCount(tree[0].wordCount || 0);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o projeto",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, toast]);

  // Find section by ID
  const findSection = useCallback((id: string, secs: Section[]): Section | null => {
    for (const sec of secs) {
      if (sec.id === id) return sec;
      if (sec.children) {
        const found = findSection(id, sec.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Handle section selection
  const handleSectionSelect = useCallback((sectionId: string) => {
    // Save current section first
    if (activeSectionId && content) {
      saveSection(activeSectionId, content);
    }

    setActiveSectionId(sectionId);
    const section = findSection(sectionId, sections);
    if (section) {
      setSectionTitle(section.title);
      setContent(section.content || "");
      setWordCount(section.wordCount || 0);
    }
    setMobileMenuOpen(false);
  }, [activeSectionId, content, sections, findSection]);

  // Save section to API
  const saveSection = useCallback(async (sectionId: string, newContent: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/documents/${sectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) throw new Error("Erro ao salvar");

      setLastSaved(new Date());
      setAutoSaveStatus("saved");

      // Update local state
      setSections((prev) => {
        const update = (secs: Section[]): Section[] => {
          return secs.map((sec) => {
            if (sec.id === sectionId) {
              return { ...sec, content: newContent, wordCount };
            }
            if (sec.children) {
              return { ...sec, children: update(sec.children) };
            }
            return sec;
          });
        };
        return update(prev);
      });
    } catch (error) {
      console.error("Save error:", error);
      setAutoSaveStatus("error");
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o conteúdo",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [wordCount, toast]);

  // Handle content change with debounce
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    const text = newContent.replace(/<[^>]*>/g, "");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);

    // Mark as saving
    setAutoSaveStatus("saving");

    // Debounced save
    const timeoutId = setTimeout(() => {
      if (activeSectionId) {
        saveSection(activeSectionId, newContent);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [activeSectionId, saveSection]);

  // Handle section add
  const handleSectionAdd = useCallback(async (parentId?: string) => {
    if (!projectId) return;

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          parentId,
          title: "Nova Seção",
          order: Date.now(),
        }),
      });

      const newSection = await response.json();

      const section: Section = {
        id: newSection.id,
        title: newSection.title,
        type: parentId ? "section" : "chapter",
        wordCount: 0,
        content: "",
        children: [],
      };

      if (parentId) {
        setSections((prev) => {
          const addToParent = (secs: Section[]): Section[] => {
            return secs.map((sec) => {
              if (sec.id === parentId) {
                return { ...sec, children: [...(sec.children || []), section] };
              }
              if (sec.children) {
                return { ...sec, children: addToParent(sec.children) };
              }
              return sec;
            });
          };
          return addToParent(prev);
        });
      } else {
        setSections((prev) => [...prev, section]);
      }

      toast({
        title: "Secção criada",
        description: "Nova secção adicionada ao documento",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a secção",
        variant: "destructive",
      });
    }
  }, [projectId, toast]);

  // Handle section rename
  const handleSectionRename = useCallback(async (sectionId: string, newTitle: string) => {
    try {
      await fetch(`/api/documents/${sectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      setSections((prev) => {
        const rename = (secs: Section[]): Section[] => {
          return secs.map((sec) => {
            if (sec.id === sectionId) {
              return { ...sec, title: newTitle };
            }
            if (sec.children) {
              return { ...sec, children: rename(sec.children) };
            }
            return sec;
          });
        };
        return rename(prev);
      });

      if (activeSectionId === sectionId) {
        setSectionTitle(newTitle);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível renomear",
        variant: "destructive",
      });
    }
  }, [activeSectionId, toast]);

  // Handle section delete
  const handleSectionDelete = useCallback(async (sectionId: string) => {
    try {
      await fetch(`/api/documents/${sectionId}`, {
        method: "DELETE",
      });

      setSections((prev) => {
        const remove = (secs: Section[]): Section[] => {
          return secs
            .filter((sec) => sec.id !== sectionId)
            .map((sec) => ({
              ...sec,
              children: sec.children ? remove(sec.children) : undefined,
            }));
        };
        return remove(prev);
      });

      if (activeSectionId === sectionId) {
        setActiveSectionId(null);
        setContent("");
        setSectionTitle("");
      }

      toast({
        title: "Secção eliminada",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível eliminar",
        variant: "destructive",
      });
    }
  }, [activeSectionId, toast]);

  // AI handlers - real API calls
  const handleGenerate = useCallback(async (prompt: string) => {
    if (credits < 10) {
      toast({
        title: "Créditos insuficientes",
        description: "Adquira mais créditos para usar esta funcionalidade",
        variant: "destructive",
      });
      return "";
    }

    try {
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

      if (data.success) {
        setCredits(data.remainingCredits);
        return data.response;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar conteúdo",
        variant: "destructive",
      });
      return "";
    }
  }, [credits, sectionTitle, projectId, toast]);

  const handleImprove = useCallback(async (text: string, type: string) => {
    if (credits < 5) {
      toast({
        title: "Créditos insuficientes",
        variant: "destructive",
      });
      return text;
    }

    try {
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

      if (data.success) {
        setCredits(data.remainingCredits);
        return data.response;
      }
      return text;
    } catch {
      return text;
    }
  }, [credits, projectId, toast]);

  const handleGenerateReference = useCallback(async () => {
    if (credits < 3) {
      toast({
        title: "Créditos insuficientes",
        variant: "destructive",
      });
      return "";
    }

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "references",
          text: sectionTitle,
          projectId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCredits(data.remainingCredits);
        return data.response;
      }
      return "";
    } catch {
      return "";
    }
  }, [credits, sectionTitle, projectId, toast]);

  // Export document
  const handleExport = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/export?projectId=${projectId}`);
      
      if (!response.ok) {
        throw new Error("Erro ao exportar");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.title || "documento"}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      // Refresh credits
      const creditsRes = await fetch("/api/credits");
      const creditsData = await creditsRes.json();
      setCredits(creditsData.balance);

      toast({
        title: "Documento exportado",
        description: "O ficheiro DOCX foi descarregado",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Verifique se tem créditos suficientes",
        variant: "destructive",
      });
    }
  }, [projectId, project?.title, toast]);

  // Handle buy credits
  const handleBuyCredits = useCallback(() => {
    router.push("/app/credits");
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">A carregar projeto...</p>
        </div>
      </div>
    );
  }

  // No project selected
  if (!projectId || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Nenhum projeto selecionado</h2>
          <p className="text-muted-foreground">
            Selecione um projeto para começar a editar
          </p>
          <Button asChild>
            <Link href="/app/projects">Ver Projetos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        {/* Left - Logo & Mobile Menu */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-primary">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold hidden sm:inline gradient-text">
              aptto
            </span>
          </Link>
        </div>

        {/* Center - Project Name */}
        <div className="hidden md:flex items-center gap-2">
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-medium truncate max-w-[200px]">
            {project.title}
          </span>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar DOCX</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/app">
                    <Home className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Início</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/app/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configurações</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Panels */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Document Tree */}
          <ResizablePanel
            defaultSize={leftPanelCollapsed ? 0 : 18}
            minSize={leftPanelCollapsed ? 0 : 15}
            maxSize={leftPanelCollapsed ? 0 : 25}
            className={cn(
              "transition-all duration-300",
              leftPanelCollapsed && "!flex-[0_0_0px]",
              mobileMenuOpen && "fixed inset-y-0 left-0 top-12 z-50 w-64 md:static md:z-auto md:w-auto"
            )}
          >
            <div className="h-full bg-background border-r border-border/30">
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
          </ResizablePanel>

          {/* Left Collapse Toggle */}
          <div className="hidden md:flex items-center justify-center w-px bg-border/30 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="absolute left-1/2 -translate-x-1/2 h-8 w-6 p-0 bg-background border border-border/50 hover:bg-accent z-10"
            >
              {leftPanelCollapsed ? (
                <PanelLeft className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {!leftPanelCollapsed && (
            <ResizableHandle className="w-1 hover:bg-primary/20 transition-colors" />
          )}

          {/* Center Panel - Writing Area */}
          <ResizablePanel defaultSize={rightPanelCollapsed ? 82 : 56} minSize={40}>
            <WritingArea
              sectionTitle={sectionTitle}
              content={content}
              onTitleChange={setSectionTitle}
              onContentChange={handleContentChange}
              aiSuggestions={[]}
            />
          </ResizablePanel>

          {/* Right Collapse Toggle */}
          <div className="hidden md:flex items-center justify-center w-px bg-border/30 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="absolute left-1/2 -translate-x-1/2 h-8 w-6 p-0 bg-background border border-border/50 hover:bg-accent z-10"
            >
              {rightPanelCollapsed ? (
                <PanelRight className="h-3.5 w-3.5" />
              ) : (
                <PanelRightClose className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {!rightPanelCollapsed && (
            <ResizableHandle className="w-1 hover:bg-primary/20 transition-colors" />
          )}

          {/* Right Panel - AI Assistant */}
          <ResizablePanel
            defaultSize={rightPanelCollapsed ? 0 : 26}
            minSize={rightPanelCollapsed ? 0 : 20}
            maxSize={rightPanelCollapsed ? 0 : 35}
            className={cn(
              "transition-all duration-300",
              rightPanelCollapsed && "!flex-[0_0_0px]"
            )}
          >
            <div className="h-full bg-background border-l border-border/30">
              <AIAssistantPanel
                onGenerate={handleGenerate}
                onImprove={handleImprove}
                onGenerateReference={handleGenerateReference}
                creditBalance={credits}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Bottom Bar - Credits & Status */}
      <CreditsBar
        currentCredits={credits}
        maxCredits={100}
        wordCount={wordCount}
        autoSaveStatus={isSaving ? "saving" : autoSaveStatus}
        lastSaved={lastSaved}
        onBuyCredits={handleBuyCredits}
      />
    </div>
  );
}
