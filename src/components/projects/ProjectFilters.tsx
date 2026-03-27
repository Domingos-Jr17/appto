"use client";

import * as React from "react";
import { Search, Grid, List, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}


const sortLabels: Record<SortOption, string> = {
  updated: "Última actualização",
  created: "Data de criação",
  title: "Título",
  progress: "Progresso",
};

export function ProjectFilters({
  status,
  onStatusChange,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  className,
}: ProjectFiltersProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={status} onValueChange={(v) => onStatusChange(v as ProjectStatus)}>
        <TabsList className="surface-muted h-auto rounded-2xl p-1">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar projectos..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-2xl border-border/60 bg-muted/30 pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-2 rounded-2xl border-border/60 bg-muted/30">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(sortLabels).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => onSortChange(value as SortOption)}
                  className={sortBy === value ? "bg-accent/50" : ""}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="surface-muted flex items-center rounded-2xl p-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-xl",
                viewMode === "grid" && "bg-background shadow-sm"
              )}
              onClick={() => onViewModeChange("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-xl",
                viewMode === "list" && "bg-background shadow-sm"
              )}
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
