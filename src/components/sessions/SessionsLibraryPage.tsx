"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Loader2, Sparkles, FileText, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionsLibrarySkeleton } from "@/components/skeletons/SessionsLibrarySkeleton";
import { useToast } from "@/hooks/use-toast";
import { ProjectGrid, type Project } from "@/components/projects/ProjectGrid";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";
import {
  ProjectFilters,
  type ProjectStatus,
  type ViewMode,
  type SortOption,
} from "@/components/projects/ProjectFilters";
import { calculateProjectProgress } from "@/lib/progress";

const SESSION_TYPES = [
  { value: "SCHOOL_WORK", label: "Trabalho Escolar", group: "Secundário" },
  { value: "RESEARCH_PROJECT", label: "Projecto de Investigação", group: "Secundário" },
  { value: "TCC", label: "Trabalho de Conclusão de Curso", group: "Secundário/Técnico" },
  { value: "INTERNSHIP_REPORT", label: "Relatório de Estágio", group: "Técnico Profissional" },
  { value: "PRACTICAL_WORK", label: "Trabalho Prático", group: "Técnico Profissional" },
  { value: "MONOGRAPHY", label: "Monografia", group: "Ensino Superior" },
  { value: "DISSERTATION", label: "Dissertação", group: "Ensino Superior" },
  { value: "THESIS", label: "Tese", group: "Ensino Superior" },
  { value: "ARTICLE", label: "Artigo Científico", group: "Ensino Superior" },
  { value: "ESSAY", label: "Ensaio", group: "Ensino Superior" },
  { value: "REPORT", label: "Relatório", group: "Geral" },
];

const sessionTypeLabels: Record<string, Project["type"]> = {
  SCHOOL_WORK: "trabalho escolar",
  RESEARCH_PROJECT: "trabalho de pesquisa",
  INTERNSHIP_REPORT: "relatório",
  PRACTICAL_WORK: "trabalho prático",
  TCC: "tcc",
  MONOGRAPHY: "monografia",
  DISSERTATION: "dissertação",
  THESIS: "tese",
  ARTICLE: "artigo",
  ESSAY: "ensaio",
  REPORT: "relatório",
};

const BRIEF_STEPS = [
  "Tipo e tema",
  "Contexto académico",
  "Capa e autoria",
  "Geração",
] as const;

type WorkFormState = {
  title: string;
  type: string;
  description: string;
  institutionName: string;
  courseName: string;
  subjectName: string;
  educationLevel: "SECONDARY" | "TECHNICAL" | "HIGHER_EDUCATION";
  advisorName: string;
  studentName: string;
  city: string;
  academicYear: string;
  dueDate: string;
  objective: string;
  researchQuestion: string;
  methodology: string;
  citationStyle: "ABNT" | "APA" | "Vancouver";
  referencesSeed: string;
  additionalInstructions: string;
  generateContent: boolean;
};

const INITIAL_WORK_FORM: WorkFormState = {
  title: "",
  type: "MONOGRAPHY",
  description: "",
  institutionName: "",
  courseName: "",
  subjectName: "",
  educationLevel: "HIGHER_EDUCATION",
  advisorName: "",
  studentName: "",
  city: "",
  academicYear: new Date().getFullYear().toString(),
  dueDate: "",
  objective: "",
  researchQuestion: "",
  methodology: "",
  citationStyle: "ABNT",
  referencesSeed: "",
  additionalInstructions: "",
  generateContent: true,
};

const GENERATED_SECTION_COUNTS: Record<string, number> = {
  MONOGRAPHY: 5,
  DISSERTATION: 5,
  THESIS: 6,
  ARTICLE: 4,
  ESSAY: 3,
  REPORT: 5,
  SCHOOL_WORK: 3,
  RESEARCH_PROJECT: 5,
  INTERNSHIP_REPORT: 5,
  PRACTICAL_WORK: 4,
  TCC: 5,
};

export function SessionsLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { projects: rawSessions, credits, isLoading, refresh } = useAppShellData();
  const [status, setStatus] = useState<ProjectStatus>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [briefStep, setBriefStep] = useState(0);
  const [workForm, setWorkForm] = useState({ ...INITIAL_WORK_FORM });
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [openedFromUrl, setOpenedFromUrl] = useState(false);

  useEffect(() => {
    const shouldOpenFromUrl = searchParams.get("new") === "1";

    if (shouldOpenFromUrl) {
      setOpenedFromUrl(true);
      setDialogOpen(true);
      return;
    }

    if (openedFromUrl) {
      setDialogOpen(false);
      setOpenedFromUrl(false);
    }
  }, [openedFromUrl, searchParams]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);

    if (!open && searchParams.get("new") === "1") {
      router.replace("/app/sessoes");
    }

    if (!open) {
      setOpenedFromUrl(false);
      setBriefStep(0);
      setWorkForm({ ...INITIAL_WORK_FORM });
    }
  };

  const updateWorkForm = <K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) => {
    setWorkForm((current) => ({ ...current, [key]: value }));
  };

  const moveBriefStep = (direction: "next" | "previous") => {
    setBriefStep((current) => {
      if (direction === "previous") {
        return Math.max(0, current - 1);
      }

      return Math.min(BRIEF_STEPS.length - 1, current + 1);
    });
  };

  const sessions = React.useMemo<Project[]>(
    () =>
      rawSessions.map((session) => ({
        id: session.id,
        title: session.title,
        type: sessionTypeLabels[session.type] || "monografia",
        course: session.brief?.courseName || session.description || "Sem curso definido",
        institution: session.brief?.institutionName || "Sem instituição definida",
        progress: calculateProjectProgress(session),
        status: mapStatus(session.status),
        lastUpdated: formatRelativeTime(new Date(session.updatedAt)),
        createdAt: session.createdAt,
      })),
    [rawSessions]
  );

  const handleCreateSession = async () => {
    if (!workForm.title.trim()) {
      toast({
        title: "Tema obrigatório",
        description: "Por favor, indique o tema ou título do trabalho.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/generate/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: workForm.title,
          type: workForm.type,
          description: workForm.description,
          generateContent: workForm.generateContent,
          brief: {
            institutionName: workForm.institutionName || undefined,
            courseName: workForm.courseName || undefined,
            subjectName: workForm.subjectName || undefined,
            educationLevel: workForm.educationLevel,
            advisorName: workForm.advisorName || undefined,
            studentName: workForm.studentName || undefined,
            city: workForm.city || undefined,
            academicYear: Number.parseInt(workForm.academicYear, 10) || undefined,
            dueDate: workForm.dueDate || undefined,
            theme: workForm.title,
            objective: workForm.objective || undefined,
            researchQuestion: workForm.researchQuestion || undefined,
            methodology: workForm.methodology || undefined,
            citationStyle: workForm.citationStyle,
            referencesSeed: workForm.referencesSeed || undefined,
            additionalInstructions: workForm.additionalInstructions || undefined,
            language: "pt-MZ",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar o trabalho");
      }

      toast({
        title: "Trabalho criado",
        description: data.message,
      });

      setDialogOpen(false);
      setBriefStep(0);
      setWorkForm({ ...INITIAL_WORK_FORM });
      router.push(`/app/sessoes/${data.project.id}`);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeleteTarget(sessionId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/projects/${deleteTarget}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Erro ao eliminar o trabalho");
      }

      toast({
        title: "Trabalho eliminado",
        description: "O trabalho foi eliminado com sucesso",
      });

      await refresh();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível eliminar o trabalho",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleArchiveSession = async (sessionId: string) => {
    try {
      const session = sessions.find((item) => item.id === sessionId);
      const newStatus = session?.status === "archived" ? "IN_PROGRESS" : "ARCHIVED";

      const response = await fetch(`/api/projects/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Erro ao arquivar o trabalho");
      }

      toast({
        title: newStatus === "ARCHIVED" ? "Trabalho arquivado" : "Trabalho restaurado",
      });

      await refresh();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível actualizar o trabalho",
        variant: "destructive",
      });
    }
  };

  const calculateCost = () => {
    const baseCost = 20;
    const contentCost = workForm.generateContent ? (GENERATED_SECTION_COUNTS[workForm.type] || 5) * 15 : 0;
    return baseCost + contentCost;
  };

  const filteredSessions = React.useMemo(() => {
    let filtered = [...sessions];

    if (status !== "all") {
      filtered = filtered.filter((session) => session.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((session) => session.title.toLowerCase().includes(searchLower));
    }

    filtered.sort((left, right) => {
      switch (sortBy) {
        case "title":
          return left.title.localeCompare(right.title);
        case "progress":
          return right.progress - left.progress;
        case "created":
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [search, sessions, sortBy, status]);

  const sessionCounts = React.useMemo(
    () => ({
      all: sessions.length,
      in_progress: sessions.filter((session) => session.status === "in_progress").length,
      completed: sessions.filter((session) => session.status === "completed").length,
      archived: sessions.filter((session) => session.status === "archived").length,
    }),
    [sessions]
  );

  const hasFilteredResults = Boolean(search.trim()) || status !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
  };

  if (isLoading) {
    return <SessionsLibrarySkeleton />;
  }

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Criar novo trabalho
            </DialogTitle>
            <DialogDescription>
              Preencha o briefing académico. A aptto gera a capa, a estrutura e o conteúdo inicial automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {BRIEF_STEPS.map((step, index) => (
                <React.Fragment key={step}>
                  <div className={index === briefStep ? "font-semibold text-foreground" : undefined}>
                    {index + 1}. {step}
                  </div>
                  {index < BRIEF_STEPS.length - 1 ? <span>·</span> : null}
                </React.Fragment>
              ))}
            </div>

            {briefStep === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de trabalho</Label>
                  <Select value={workForm.type} onValueChange={(value) => updateWorkForm("type", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Tema ou título *</Label>
                  <Input
                    id="title"
                    placeholder="Ex.: Impacto das Tecnologias no Ensino Superior"
                    value={workForm.title}
                    onChange={(event) => updateWorkForm("title", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Briefing inicial</Label>
                  <Textarea
                    id="description"
                    placeholder="Explique o que o trabalho deve abordar e o resultado esperado."
                    value={workForm.description}
                    onChange={(event) => updateWorkForm("description", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo do trabalho</Label>
                  <Textarea
                    id="objective"
                    placeholder="Ex.: analisar o impacto das tecnologias digitais no rendimento académico."
                    value={workForm.objective}
                    onChange={(event) => updateWorkForm("objective", event.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ) : null}

            {briefStep === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="institution">Instituição</Label>
                    <Input
                      id="institution"
                      placeholder="Ex.: Universidade Eduardo Mondlane"
                      value={workForm.institutionName}
                      onChange={(event) => updateWorkForm("institutionName", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course">Curso</Label>
                    <Input
                      id="course"
                      placeholder="Ex.: Informática"
                      value={workForm.courseName}
                      onChange={(event) => updateWorkForm("courseName", event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Disciplina</Label>
                    <Input
                      id="subject"
                      placeholder="Ex.: Metodologia de Investigação"
                      value={workForm.subjectName}
                      onChange={(event) => updateWorkForm("subjectName", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education-level">Nível académico</Label>
                    <Select value={workForm.educationLevel} onValueChange={(value) => updateWorkForm("educationLevel", value as WorkFormState["educationLevel"])}>
                      <SelectTrigger id="education-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SECONDARY">Secundário</SelectItem>
                        <SelectItem value="TECHNICAL">Técnico Profissional</SelectItem>
                        <SelectItem value="HIGHER_EDUCATION">Ensino Superior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advisor">Professor ou orientador</Label>
                  <Input
                    id="advisor"
                    placeholder="Ex.: Prof. Doutor João Luís"
                    value={workForm.advisorName}
                    onChange={(event) => updateWorkForm("advisorName", event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {briefStep === 2 ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="student">Nome do estudante</Label>
                    <Input
                      id="student"
                      placeholder="Ex.: Maria João António"
                      value={workForm.studentName}
                      onChange={(event) => updateWorkForm("studentName", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Ex.: Maputo"
                      value={workForm.city}
                      onChange={(event) => updateWorkForm("city", event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="year">Ano académico</Label>
                    <Input
                      id="year"
                      inputMode="numeric"
                      value={workForm.academicYear}
                      onChange={(event) => updateWorkForm("academicYear", event.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Data de entrega</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={workForm.dueDate}
                      onChange={(event) => updateWorkForm("dueDate", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {briefStep === 3 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="research-question">Pergunta de investigação</Label>
                  <Textarea
                    id="research-question"
                    placeholder="Qual é a questão central que o trabalho deve responder?"
                    value={workForm.researchQuestion}
                    onChange={(event) => updateWorkForm("researchQuestion", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="methodology">Metodologia</Label>
                  <Textarea
                    id="methodology"
                    placeholder="Ex.: revisão bibliográfica, estudo de caso, abordagem qualitativa..."
                    value={workForm.methodology}
                    onChange={(event) => updateWorkForm("methodology", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="citation-style">Norma de citação</Label>
                    <Select value={workForm.citationStyle} onValueChange={(value) => updateWorkForm("citationStyle", value as WorkFormState["citationStyle"])}>
                      <SelectTrigger id="citation-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABNT">ABNT</SelectItem>
                        <SelectItem value="APA">APA</SelectItem>
                        <SelectItem value="Vancouver">Vancouver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="references-seed">Referências iniciais</Label>
                  <Textarea
                    id="references-seed"
                    placeholder="Cole livros, artigos, links ou autores que devem orientar o trabalho."
                    value={workForm.referencesSeed}
                    onChange={(event) => updateWorkForm("referencesSeed", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additional-instructions">Instruções adicionais</Label>
                  <Textarea
                    id="additional-instructions"
                    placeholder="Ex.: incluir exemplos de Moçambique, manter tom formal, evitar linguagem técnica excessiva."
                    value={workForm.additionalInstructions}
                    onChange={(event) => updateWorkForm("additionalInstructions", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="glass glass-border flex items-center justify-between rounded-xl p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <Label className="text-base font-medium">Gerar trabalho automaticamente</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A aptto gera capa, resumo, estrutura e secções iniciais com base no briefing.
                    </p>
                  </div>
                  <Switch checked={workForm.generateContent} onCheckedChange={(value) => updateWorkForm("generateContent", value)} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Custo previsto</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={credits >= calculateCost() ? "default" : "destructive"}>
                      {calculateCost()} créditos
                    </Badge>
                    <span className="text-muted-foreground">({credits.toLocaleString("pt-MZ")} disponíveis)</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isCreating}>
              Cancelar
            </Button>
            {briefStep > 0 ? (
              <Button variant="outline" onClick={() => moveBriefStep("previous")} disabled={isCreating}>
                Voltar
              </Button>
            ) : null}
            {briefStep < BRIEF_STEPS.length - 1 ? (
              <Button onClick={() => moveBriefStep("next")} disabled={isCreating || (briefStep === 0 && !workForm.title.trim())}>
                Continuar
              </Button>
            ) : (
              <Button
                onClick={handleCreateSession}
                disabled={isCreating || credits < calculateCost()}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {workForm.generateContent ? "Gerar trabalho" : "Criar briefing"}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className=" glass glass-border rounded-2xl p-4 lg:p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{sessionCounts.all} trabalhos no total</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{sessionCounts.in_progress} activas</span>
            <span>·</span>
            <span>{sessionCounts.completed} concluídas</span>
            <span>·</span>
            <span>{sessionCounts.archived} arquivadas</span>
          </div>
        </div>
      </div>

      <div className=" glass glass-border rounded-2xl p-4 lg:p-5">
        <ProjectFilters
          status={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      {filteredSessions.length > 0 ? (
        <ProjectGrid
          projects={filteredSessions}
          viewMode={viewMode}
          onDelete={handleDeleteSession}
          onArchive={handleArchiveSession}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhum trabalho encontrado"
          description={hasFilteredResults ? "Nao existem trabalhos compativeis com estes filtros. Ajuste a pesquisa ou volte a ver todos os trabalhos." : "Crie o seu primeiro trabalho com briefing academico."}
          className="py-16"
          action={
            hasFilteredResults ? (
              <Button onClick={resetFilters} variant="outline" className="rounded-full">
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-full">
                <Plus className="h-4 w-4" />
                Criar trabalho
              </Button>
            )
          }
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar trabalho?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção não pode ser desfeita. Todos os dados do trabalho serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function mapStatus(status: string): Project["status"] {
  const map: Record<string, Project["status"]> = {
    DRAFT: "in_progress",
    IN_PROGRESS: "in_progress",
    REVIEW: "in_progress",
    COMPLETED: "completed",
    ARCHIVED: "archived",
  };
  return map[status] || "in_progress";
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString("pt-MZ");
}
