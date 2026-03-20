"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
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
}

interface EditorLayoutProps {
  projectId: string;
}

// Default data
const defaultSections: Section[] = [
  {
    id: "ch1",
    title: "Introdução",
    type: "chapter",
    wordCount: 1250,
    children: [
      { id: "s1-1", title: "Contextualização", type: "section", wordCount: 450 },
      { id: "s1-2", title: "Problema de Pesquisa", type: "section", wordCount: 350 },
      { id: "s1-3", title: "Objetivos", type: "section", wordCount: 250 },
      { id: "s1-4", title: "Justificativa", type: "section", wordCount: 200 },
    ],
  },
  {
    id: "ch2",
    title: "Revisão de Literatura",
    type: "chapter",
    wordCount: 3200,
    children: [
      { id: "s2-1", title: "Referencial Teórico", type: "section", wordCount: 1800 },
      { id: "s2-2", title: "Estado da Arte", type: "section", wordCount: 1400 },
    ],
  },
  {
    id: "ch3",
    title: "Metodologia",
    type: "chapter",
    wordCount: 1800,
    children: [
      { id: "s3-1", title: "Tipo de Pesquisa", type: "section", wordCount: 400 },
      { id: "s3-2", title: "Coleta de Dados", type: "section", wordCount: 700 },
      { id: "s3-3", title: "Análise de Dados", type: "section", wordCount: 700 },
    ],
  },
  {
    id: "ch4",
    title: "Resultados e Discussão",
    type: "chapter",
    wordCount: 2500,
  },
  {
    id: "ch5",
    title: "Conclusão",
    type: "chapter",
    wordCount: 800,
  },
];

export function EditorLayout({ projectId }: EditorLayoutProps) {
  // Panel states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Editor states
  const [sections, setSections] = useState<Section[]>(defaultSections);
  const [activeSectionId, setActiveSectionId] = useState<string | null>("s1-1");
  const [sectionTitle, setSectionTitle] = useState("Contextualização");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(1250);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved" | "error" | "idle">("saved");
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  // Credits state
  const [credits, setCredits] = useState(85);
  const maxCredits = 100;

  // Find active section - regular function for recursive use
  const findSection = (id: string, secs: Section[]): Section | null => {
    for (const sec of secs) {
      if (sec.id === id) return sec;
      if (sec.children) {
        const found = findSection(id, sec.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Handlers
  const handleSectionSelect = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    const section = findSection(sectionId, sections);
    if (section) {
      setSectionTitle(section.title);
      setWordCount(section.wordCount || 0);
    }
    setMobileMenuOpen(false);
  }, [sections]);

  const handleSectionAdd = useCallback((parentId?: string) => {
    const newSection: Section = {
      id: `s-${Date.now()}`,
      title: "Nova Seção",
      type: parentId ? "section" : "chapter",
      wordCount: 0,
    };

    if (parentId) {
      setSections((prev) => {
        const updated = [...prev];
        const addToParent = (secs: Section[]) => {
          return secs.map((sec) => {
            if (sec.id === parentId) {
              return {
                ...sec,
                children: [...(sec.children || []), newSection],
              };
            }
            if (sec.children) {
              return { ...sec, children: addToParent(sec.children) };
            }
            return sec;
          });
        };
        return addToParent(updated);
      });
    } else {
      setSections((prev) => [...prev, newSection]);
    }
  }, []);

  const handleSectionRename = useCallback((sectionId: string, newTitle: string) => {
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
  }, [activeSectionId]);

  const handleSectionDelete = useCallback((sectionId: string) => {
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
    }
  }, [activeSectionId]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    // Calculate word count
    const text = newContent.replace(/<[^>]*>/g, "");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);

    // Simulate auto-save
    setAutoSaveStatus("saving");
    setTimeout(() => {
      setAutoSaveStatus("saved");
      setLastSaved(new Date());
    }, 1000);
  }, []);

  const handleGenerate = useCallback(async (prompt: string) => {
    // Deduct credits
    if (credits >= 5) {
      setCredits((prev) => prev - 5);
    }
    // Return simulated response
    return `Este é um conteúdo gerado com base no seu prompt: "${prompt}". O texto acadêmico seria gerado aqui com base no contexto do seu documento e nas melhores práticas de escrita acadêmica.`;
  }, [credits]);

  const handleImprove = useCallback(async (text: string, type: string) => {
    if (credits >= 3) {
      setCredits((prev) => prev - 3);
    }
    return `Texto melhorado (${type}): ${text}`;
  }, [credits]);

  const handleGenerateReference = useCallback(async () => {
    if (credits >= 1) {
      setCredits((prev) => prev - 1);
    }
    return "SOBRENOME, Nome. Título da Obra. Cidade: Editora, 2024.";
  }, [credits]);

  const handleBuyCredits = useCallback(() => {
    // Would navigate to credits purchase page
    console.log("Buy credits clicked");
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border/30 bg-background/95 backdrop-blur-sm">
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

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-primary">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold hidden sm:inline gradient-text">
              aptto
            </span>
          </div>
        </div>

        {/* Center - Project Name */}
        <div className="hidden md:flex items-center gap-2">
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">
            Dissertação de Mestrado
          </span>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Início</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajuda</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configurações</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-2" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sair</TooltipContent>
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
                projectTitle="Dissertação de Mestrado"
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
        maxCredits={maxCredits}
        wordCount={wordCount}
        autoSaveStatus={autoSaveStatus}
        lastSaved={lastSaved}
        onBuyCredits={handleBuyCredits}
      />
    </div>
  );
}
