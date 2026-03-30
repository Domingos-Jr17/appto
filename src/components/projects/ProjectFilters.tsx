"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ProjectStatus = "all" | "in_progress" | "completed" | "archived";
export type ViewMode = "grid" | "list";
export type SortOption = "updated" | "created" | "title" | "progress";

interface ProjectFiltersProps {
  status: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;
  search: string;
  onSearchChange: (search: string) => void;
  className?: string;
}

export function ProjectFilters({
  status,
  onStatusChange,
  search,
  onSearchChange,
  className,
}: ProjectFiltersProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={status} onValueChange={(v) => onStatusChange(v as ProjectStatus)}>
        <TabsList className="glass glass-border h-auto rounded-2xl p-1">
          <TabsTrigger
            value="all"
            className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Todos
          </TabsTrigger>
          <TabsTrigger
            value="in_progress"
            className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Em progresso
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Completos
          </TabsTrigger>
          <TabsTrigger
            value="archived"
            className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Arquivados
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar trabalhos..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-2xl border-border/60 bg-muted/30 pl-10"
          />
      </div>
    </div>
  );
}
