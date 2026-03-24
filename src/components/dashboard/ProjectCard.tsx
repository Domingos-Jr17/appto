"use client";

import * as React from "react";
import { MoreVertical, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectTypeStyles, type ProjectType } from "@/lib/project-type-styles";

interface ProjectCardProps {
  id: string;
  title: string;
  type: ProjectType;
  course: string;
  lastUpdated: string;
  progress: number;
  className?: string;
}

const typeStyles = projectTypeStyles;

export function ProjectCard({
  id,
  title,
  type,
  course,
  lastUpdated,
  progress,
  className,
}: ProjectCardProps) {
  const typeStyle = typeStyles[type];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl card-hover cursor-pointer",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", typeStyle.className)}
              >
                {typeStyle.label}
              </Badge>
            </div>
            <h4 className="line-clamp-1 text-base font-semibold leading-tight">
              {title}
            </h4>
            <p className="text-sm text-muted-foreground">{course}</p>
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Abrir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Actualizado {lastUpdated}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className="h-1.5 bg-primary/10"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
