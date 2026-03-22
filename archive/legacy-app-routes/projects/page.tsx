"use client";

import * as React from "react";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectGrid, type Project } from "@/components/projects/ProjectGrid";
import {
  ProjectFilters,
  type ProjectStatus,
  type ViewMode,
  type SortOption,
} from "@/components/projects/ProjectFilters";

// Mock data - will be replaced with API calls
const mockProjects: Project[] = [
  {
    id: "1",
    title: "Impacto das Tecnologias Digitais no Ensino Superior Moçambicano",
    type: "monografia",
    course: "Educação",
    institution: "UEM",
    progress: 75,
    status: "in_progress",
    lastUpdated: "há 2 horas",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "Análise de Políticas Públicas de Saúde em Moçambique",
    type: "artigo",
    course: "Saúde Pública",
    institution: "ISCISA",
    progress: 45,
    status: "in_progress",
    lastUpdated: "ontem",
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    title: "Desenvolvimento Sustentável e Agricultura Familiar",
    type: "tese",
    course: "Desenvolvimento Rural",
    institution: "UEM",
    progress: 30,
    status: "in_progress",
    lastUpdated: "há 3 dias",
    createdAt: "2024-01-05",
  },
  {
    id: "4",
    title: "Relatório de Estágio - Banco de Moçambique",
    type: "seminário",
    course: "Economia",
    institution: "UEM",
    progress: 100,
    status: "completed",
    lastUpdated: "há 1 semana",
    createdAt: "2023-12-20",
  },
  {
    id: "5",
    title: "Avaliação do Sistema Educativo Primário em Moçambique",
    type: "monografia",
    course: "Educação",
    institution: "UP",
    progress: 100,
    status: "completed",
    lastUpdated: "há 2 semanas",
    createdAt: "2023-12-01",
  },
  {
    id: "6",
    title: "Seminário sobre Mudanças Climáticas",
    type: "seminário",
    course: "Ciências Ambientais",
    institution: "UEM",
    progress: 100,
    status: "archived",
    lastUpdated: "há 1 mês",
    createdAt: "2023-11-15",
  },
  {
    id: "7",
    title: "Estudo sobre Empreendedorismo Feminino em Maputo",
    type: "artigo",
    course: "Gestão",
    institution: "ISCTEM",
    progress: 60,
    status: "in_progress",
    lastUpdated: "há 4 horas",
    createdAt: "2024-01-18",
  },
  {
    id: "8",
    title: "Análise da Pobreza Urbana em Moçambique",
    type: "tese",
    course: "Sociologia",
    institution: "UEM",
    progress: 15,
    status: "in_progress",
    lastUpdated: "há 5 dias",
    createdAt: "2024-01-12",
  },
];

export default function ProjectsPage() {
  const [status, setStatus] = React.useState<ProjectStatus>("all");
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [sortBy, setSortBy] = React.useState<SortOption>("updated");

  // Filter and sort projects
  const filteredProjects = React.useMemo(() => {
    let filtered = [...mockProjects];

    // Filter by status
    if (status !== "all") {
      filtered = filtered.filter((p) => p.status === status);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.course.toLowerCase().includes(searchLower) ||
          p.institution.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "progress":
          return b.progress - a.progress;
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "updated":
        default:
          // For demo purposes, we'll sort by id since lastUpdated is a string
          return 0;
      }
    });

    return filtered;
  }, [status, search, sortBy]);

  const projectCounts = React.useMemo(() => {
    return {
      all: mockProjects.length,
      in_progress: mockProjects.filter((p) => p.status === "in_progress").length,
      completed: mockProjects.filter((p) => p.status === "completed").length,
      archived: mockProjects.filter((p) => p.status === "archived").length,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projectos</h1>
            <p className="text-sm text-muted-foreground">
              {projectCounts.all} projectos no total
            </p>
          </div>
        </div>
        <Button className="w-fit gap-2 gradient-primary text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" />
          Novo Projecto
        </Button>
      </div>

      {/* Filters */}
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

      {/* Projects Grid */}
      <ProjectGrid projects={filteredProjects} viewMode={viewMode} />
    </div>
  );
}
