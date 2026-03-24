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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewMode } from "./ProjectFilters";
import { projectTypeStyles, type ProjectType } from "@/lib/project-type-styles";

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  course: string;
  institution: string;
  progress: number;
  status: "in_progress" | "completed" | "archived";
  lastUpdated: string;
  createdAt: string;
}

interface ProjectGridProps {
  projects: Project[];
  viewMode: ViewMode;
  className?: string;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const typeStyles = projectTypeStyles;

const statusStyles: Record<Project["status"], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  in_progress: {
    label: "Em progresso",
    icon: PlayCircle,
    color: "text-info",
  },
  completed: {
    label: "Completo",
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
  project: Project;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const typeStyle = typeStyles[project.type] || typeStyles.monografia;
  const statusStyle = statusStyles[project.status];
  const StatusIcon = statusStyle.icon;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl card-hover cursor-pointer",
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
            </div>
            <Link href={`/app/projects/${project.id}`}>
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
                className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/app/projects/${project.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Abrir
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

        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          <span className="truncate">{project.course}</span>
          <span className="text-border">•</span>
          <Building2 className="h-4 w-4" />
          <span className="truncate">{project.institution}</span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Actualizado {project.lastUpdated}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <Progress
              value={project.progress}
              className="h-1.5 bg-primary/10"
            />
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
  project: Project;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const typeStyle = typeStyles[project.type] || typeStyles.monografia;
  const statusStyle = statusStyles[project.status];
  const StatusIcon = statusStyle.icon;

  return (
    <Card
      className={cn(
        "group border-border/50 bg-card/80 backdrop-blur-xl card-hover cursor-pointer",
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
          </div>
          <Link href={`/app/projects/${project.id}`}>
            <h4 className="font-semibold truncate hover:text-primary transition-colors">
              {project.title}
            </h4>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span className="truncate">{project.course}</span>
            <span className="text-border">•</span>
            <Building2 className="h-4 w-4" />
            <span className="truncate">{project.institution}</span>
          </div>
        </div>

        <div className="hidden sm:block w-32">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-1.5 bg-primary/10" />
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
              <Link href={`/app/projects/${project.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Abrir
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
      <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
        <div className="rounded-full bg-muted/50 p-4 mb-4">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum projecto encontrado</h3>
        <p className="text-muted-foreground max-w-sm">
          Não tem projectos nesta categoria. Crie um novo projecto para começar.
        </p>
      </div>
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
