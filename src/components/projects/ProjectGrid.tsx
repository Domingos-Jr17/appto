"use client";

import * as React from "react";
import Link from "next/link";
import {
  MoreVertical,
  Clock,
  FileText,
  Archive,
  Trash2,
  ArchiveRestore,
  CheckCircle2,
  PlayCircle,
  Building2,
  GraduationCap,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewMode } from "./ProjectFilters";
import { projectTypeStyles, type ProjectType } from "@/lib/project-type-styles";

export interface ProjectCardData {
  id: string;
  title: string;
  type: ProjectType;
  course?: string | null;
  institution?: string | null;
  progress: number;
  generationStatus?: "BRIEFING" | "GENERATING" | "READY" | "NEEDS_REVIEW" | "FAILED";
  generationProgress?: number;
  generationStep?: string | null;
  status: "draft" | "in_progress" | "completed" | "archived";
  lastUpdated: string;
  createdAt: string;
}

export type Project = ProjectCardData;

interface ProjectGridProps {
  projects: ProjectCardData[];
  viewMode: ViewMode;
  className?: string;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const typeStyles = projectTypeStyles;

const statusStyles: Record<ProjectCardData["status"], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  draft: {
    label: "Rascunho",
    icon: Pencil,
    color: "text-warning",
  },
  in_progress: {
    label: "Em curso",
    icon: PlayCircle,
    color: "text-info",
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-success",
  },
  archived: {
    label: "Arquivado",
    icon: Archive,
    color: "text-muted-foreground",
  },
};

function ProjectCard({ 
  project, 
  onDelete, 
  onArchive, 
  onEdit 
}: { 
  project: ProjectCardData;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const typeStyle = typeStyles[project.type] || typeStyles.monografia;
  const statusStyle = statusStyles[project.status];
  const StatusIcon = statusStyle.icon;
  const generating = project.generationStatus === "GENERATING";

  return (
    <Card
      className={cn(
        " glass glass-border card-hover group relative cursor-pointer overflow-hidden rounded-2xl bg-card/80",
        project.status === "archived" && "opacity-75"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", typeStyle.className)}
              >
                {typeStyle.label}
              </Badge>
              <div className={cn("flex items-center gap-1 text-xs", statusStyle.color)}>
                <StatusIcon className="h-3 w-3" />
                <span>{statusStyle.label}</span>
              </div>
              {generating ? (
                <Badge variant="outline" className="text-[10px]">
                  A gerar {project.generationProgress ?? project.progress}%
                </Badge>
              ) : null}
            </div>
            <Link href={`/app/trabalhos/${project.id}`}>
              <h4 className="line-clamp-2 text-base font-semibold leading-tight hover:text-primary transition-colors">
                {project.title}
              </h4>
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Mais opções"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                <Link href={`/app/trabalhos/${project.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Abrir trabalho
                </Link>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(project.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {project.status === "archived" ? (
                <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(project.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.course || project.institution ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {project.course ? (
              <>
                <GraduationCap className="h-4 w-4" />
                <span className="truncate">{project.course}</span>
              </>
            ) : null}
            {project.course && project.institution ? <span className="text-border">•</span> : null}
            {project.institution ? (
              <>
                <Building2 className="h-4 w-4" />
                <span className="truncate">{project.institution}</span>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Actualizado {project.lastUpdated}</span>
          </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{generating ? "Geração" : "Progresso"}</span>
                <span className="font-medium text-foreground">{generating ? (project.generationProgress ?? project.progress) : project.progress}%</span>
              </div>
              <Progress
                value={generating ? (project.generationProgress ?? project.progress) : project.progress}
                className="h-1.5 bg-primary/10"
              />
              {project.generationStep ? (
                <p className="text-[11px] text-muted-foreground">{project.generationStep}</p>
              ) : null}
            </div>
          </div>
      </CardContent>
    </Card>
  );
}

function ProjectListItem({ 
  project, 
  onDelete, 
  onArchive, 
  onEdit 
}: { 
  project: ProjectCardData;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const typeStyle = typeStyles[project.type] || typeStyles.monografia;
  const statusStyle = statusStyles[project.status];
  const StatusIcon = statusStyle.icon;
  const generating = project.generationStatus === "GENERATING";

  return (
    <Card
      className={cn(
        " glass glass-border card-hover group cursor-pointer rounded-2xl bg-card/80",
        project.status === "archived" && "opacity-75"
      )}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", typeStyle.className)}
            >
              {typeStyle.label}
            </Badge>
            <div className={cn("flex items-center gap-1 text-xs", statusStyle.color)}>
              <StatusIcon className="h-3 w-3" />
              <span>{statusStyle.label}</span>
            </div>
            {generating ? (
              <Badge variant="outline" className="text-[10px]">
                A gerar {project.generationProgress ?? project.progress}%
              </Badge>
            ) : null}
          </div>
          <Link href={`/app/trabalhos/${project.id}`}>
            <h4 className="font-semibold truncate hover:text-primary transition-colors">
              {project.title}
            </h4>
          </Link>
          {project.course || project.institution ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {project.course ? (
                <>
                  <GraduationCap className="h-4 w-4" />
                  <span className="truncate">{project.course}</span>
                </>
              ) : null}
              {project.course && project.institution ? <span className="text-border">•</span> : null}
              {project.institution ? (
                <>
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{project.institution}</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="hidden sm:block w-32">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{generating ? "Geração" : "Progresso"}</span>
              <span className="font-medium">{generating ? (project.generationProgress ?? project.progress) : project.progress}%</span>
            </div>
            <Progress value={generating ? (project.generationProgress ?? project.progress) : project.progress} className="h-1.5 bg-primary/10" />
            {project.generationStep ? <p className="text-[11px] text-muted-foreground">{project.generationStep}</p> : null}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground min-w-[120px]">
          <Clock className="h-3 w-3" />
          <span>{project.lastUpdated}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
                  <Link href={`/app/trabalhos/${project.id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Abrir trabalho
                  </Link>
                </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(project.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            {project.status === "archived" ? (
              <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(project.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

export function ProjectGrid({ 
  projects, 
  viewMode, 
  className,
  onDelete,
  onArchive,
  onEdit,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
       <EmptyState
         icon={FileText}
         title="Nenhum trabalho encontrado"
         description="Nao tem trabalhos nesta categoria. Crie um novo trabalho para comecar."
         className={cn("py-16", className)}
       />
    );
  }

  if (viewMode === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        {projects.map((project) => (
          <ProjectListItem 
            key={project.id} 
            project={project}
            onDelete={onDelete}
            onArchive={onArchive}
            onEdit={onEdit}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {projects.map((project) => (
        <ProjectCard 
          key={project.id} 
          project={project}
          onDelete={onDelete}
          onArchive={onArchive}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
