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
import { useToast } from "@/hooks/use-toast";
import { ProjectGrid, type Project } from "@/components/projects/ProjectGrid";
import { useAppWorkspaceData } from "@/components/workspace/AppWorkspaceDataContext";
import type { AppProjectRecord } from "@/lib/app-data";
import {
  ProjectFilters,
  type ProjectStatus,
  type ViewMode,
  type SortOption,
} from "@/components/projects/ProjectFilters";

const PROJECT_TYPES = [
  // Ensino Secundário
  { value: "SCHOOL_WORK", label: "Trabalho Escolar", group: "Secundário" },
  { value: "RESEARCH_PROJECT", label: "Projecto de Investigação", group: "Secundário" },
  { value: "TCC", label: "Trabalho de Conclusão de Curso", group: "Secundário/Técnico" },
  
  // Técnico Profissional
  { value: "INTERNSHIP_REPORT", label: "Relatório de Estágio", group: "Técnico Profissional" },
  { value: "PRACTICAL_WORK", label: "Trabalho Prático", group: "Técnico Profissional" },
  
  // Ensino Superior
  { value: "MONOGRAPHY", label: "Monografia", group: "Ensino Superior" },
  { value: "DISSERTATION", label: "Dissertação", group: "Ensino Superior" },
  { value: "THESIS", label: "Tese", group: "Ensino Superior" },
  { value: "ARTICLE", label: "Artigo Científico", group: "Ensino Superior" },
  { value: "ESSAY", label: "Ensaio", group: "Ensino Superior" },
  { value: "REPORT", label: "Relatório", group: "Geral" },
];

const projectTypeLabels: Record<string, Project["type"]> = {
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

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { projects: rawProjects, credits, isLoading, refresh } = useAppWorkspaceData();
  const [status, setStatus] = useState<ProjectStatus>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("updated");

  // New project dialog state
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
      router.replace("/app/projects");
    }

    if (!open) {
      setOpenedFromUrl(false);
    }
  };

  const projects = React.useMemo<Project[]>(
    () =>
      rawProjects.map((project) => ({
        id: project.id,
        title: project.title,
        type: projectTypeLabels[project.type] || "monografia",
        course: project.description || "Sem descrição",
        institution: "aptto",
        progress: calculateProgress(project),
        status: mapStatus(project.status),
        lastUpdated: formatRelativeTime(new Date(project.updatedAt)),
        createdAt: project.createdAt,
      })),
    [rawProjects]
  );

  const handleCreateProject = async () => {
    if (!newTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para o projecto.",
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
        throw new Error(data.error || "Erro ao criar projecto");
      }

      toast({
        title: "Sucesso!",
        description: data.message,
      });

      setDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      
      // Navigate to workspace with new project
      router.push(`/app/projects/${data.project.id}`);
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

  const handleDeleteProject = async (projectId: string) => {
    setDeleteTarget(projectId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/projects/${deleteTarget}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao eliminar projecto");
      }

      toast({
        title: "Projecto eliminado",
        description: "O projecto foi eliminado com sucesso",
      });

      // Refresh projects list
      await refresh();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível eliminar o projecto",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      const newStatus = project?.status === "archived" ? "IN_PROGRESS" : "ARCHIVED";

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Erro ao arquivar projecto");
      }

      toast({
        title: newStatus === "ARCHIVED" ? "Projecto arquivado" : "Projecto restaurado",
      });

      // Refresh projects list
      await refresh();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível actualizar o projecto",
        variant: "destructive",
      });
    }
  };

  const calculateCost = () => {
    const baseCost = 20;
    const contentCost = generateContent ? 6 * 15 : 0; // 6 sections
    return baseCost + contentCost;
  };

  // Filter and sort projects
  const filteredProjects = React.useMemo(() => {
    let filtered = [...projects];

    if (status !== "all") {
      filtered = filtered.filter((p) => p.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "progress":
          return b.progress - a.progress;
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, status, search, sortBy]);

  const projectCounts = React.useMemo(() => {
    return {
      all: projects.length,
      in_progress: projects.filter((p) => p.status === "in_progress").length,
      completed: projects.filter((p) => p.status === "completed").length,
      archived: projects.filter((p) => p.status === "archived").length,
    };
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Criar novo projecto
            </DialogTitle>
            <DialogDescription>
              Gere um trabalho académico completo com IA ou apenas a estrutura inicial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Trabalho *</Label>
              <Input
                id="title"
                placeholder="Ex.: Impacto das Tecnologias no Ensino Superior"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Trabalho</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
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
                placeholder="Breve descrição do tema ou área de estudo..."
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                rows={3}
              />
            </div>

            <div className="surface-muted flex items-center justify-between rounded-2xl p-4">
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
              onClick={handleCreateProject}
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
                  {generateContent ? "Gerar trabalho completo" : "Criar estrutura"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="surface-panel flex flex-col gap-4 rounded-3xl p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{projectCounts.all} projectos no total</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{projectCounts.in_progress} em curso</span>
            <span>·</span>
            <span>{projectCounts.completed} concluídos</span>
            <span>·</span>
            <span>{projectCounts.archived} arquivados</span>
          </div>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="gap-2 lg:hidden">
          <Plus className="h-4 w-4" />
          Novo projecto
        </Button>
      </div>

      <div className="surface-panel rounded-3xl p-4 lg:p-5">
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

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <ProjectGrid 
          projects={filteredProjects} 
          viewMode={viewMode}
          onDelete={handleDeleteProject}
          onArchive={handleArchiveProject}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum projecto encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {search
              ? "Tente ajustar os filtros de busca"
              : "Crie o seu primeiro projecto académico com IA"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar projecto
            </Button>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Eliminar projecto?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acção não pode ser desfeita. Todos os dados do projecto serão removidos permanentemente.
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

function calculateProgress(project: AppProjectRecord): number {
  if (project.status === "COMPLETED") return 100;
  if (project.wordCount === 0) return 0;
  const expectedWords = 50 * 250;
  return Math.min(100, Math.round((project.wordCount / expectedWords) * 100));
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
