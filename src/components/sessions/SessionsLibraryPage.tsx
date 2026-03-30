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
  SCHOOL_WORK: "monografia",
  RESEARCH_PROJECT: "monografia",
  INTERNSHIP_REPORT: "relatório",
  PRACTICAL_WORK: "relatório",
  TCC: "monografia",
  MONOGRAPHY: "monografia",
  DISSERTATION: "dissertação",
  THESIS: "tese",
  ARTICLE: "artigo",
  ESSAY: "ensaio",
  REPORT: "relatório",
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
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("MONOGRAPHY");
  const [newDescription, setNewDescription] = useState("");
  const [generateContent, setGenerateContent] = useState(true);
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
    }
  };

  const sessions = React.useMemo<Project[]>(
    () =>
      rawSessions.map((session) => ({
        id: session.id,
        title: session.title,
        type: sessionTypeLabels[session.type] || "monografia",
        course: session.description || "Sem descrição",
        institution: "aptto",
        progress: calculateProjectProgress(session),
        status: mapStatus(session.status),
        lastUpdated: formatRelativeTime(new Date(session.updatedAt)),
        createdAt: session.createdAt,
      })),
    [rawSessions]
  );

  const handleCreateSession = async () => {
    if (!newTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para a sessão.",
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
          title: newTitle,
          type: newType,
          description: newDescription,
          generateContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar a sessão");
      }

      toast({
        title: "Sessão criada",
        description: data.message,
      });

      setDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
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
        throw new Error("Erro ao eliminar a sessão");
      }

      toast({
        title: "Sessão eliminada",
        description: "A sessão foi eliminada com sucesso",
      });

      await refresh();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível eliminar a sessão",
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
        throw new Error("Erro ao arquivar a sessão");
      }

      toast({
        title: newStatus === "ARCHIVED" ? "Sessão arquivada" : "Sessão restaurada",
      });

      await refresh();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível actualizar a sessão",
        variant: "destructive",
      });
    }
  };

  const calculateCost = () => {
    const baseCost = 20;
    const contentCost = generateContent ? 6 * 15 : 0;
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
              Criar nova sessão
            </DialogTitle>
            <DialogDescription>
              Abra uma sessão de trabalho com chat, estrutura e documento prontos para evoluir no mesmo fluxo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Sessão *</Label>
              <Input
                id="title"
                placeholder="Ex.: Impacto das Tecnologias no Ensino Superior"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Saída</Label>
              <Select value={newType} onValueChange={setNewType}>
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
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Brief, contexto ou objectivo desta sessão..."
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                rows={3}
              />
            </div>

            <div className="surface-muted flex items-center justify-between rounded-xl p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label className="text-base font-medium">Gerar conteúdo com IA</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gera automaticamente introdução, revisão de literatura, metodologia e secções base.
                </p>
              </div>
              <Switch checked={generateContent} onCheckedChange={setGenerateContent} />
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

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isCreating}>
              Cancelar
            </Button>
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
                  {generateContent ? "Gerar sessão completa" : "Criar sessão"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className=" glass glass-border rounded-2xl p-4 lg:p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{sessionCounts.all} sessões no total</p>
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
          title="Nenhuma sessão encontrada"
          description={hasFilteredResults ? "Não existem sessões compatíveis com estes filtros. Ajuste a pesquisa ou volte a ver todas as sessões." : "Crie a sua primeira sessão com IA."}
          className="py-16"
          action={
            hasFilteredResults ? (
              <Button onClick={resetFilters} variant="outline" className="rounded-full">
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-full">
                <Plus className="h-4 w-4" />
                Criar sessão
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
              Eliminar sessão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção não pode ser desfeita. Todos os dados da sessão serão removidos permanentemente.
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
