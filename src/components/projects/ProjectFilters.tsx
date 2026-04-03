"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ProjectStatus = "all" | "in_progress" | "completed" | "draft" | "archived" | "review";
export type ViewMode = "grid" | "list";
export type SortOption = "updated" | "created" | "title" | "progress";

interface ProjectFiltersProps {
  status: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;
  search: string;
  onSearchChange: (search: string) => void;
  className?: string;
}

const FILTERS: { value: ProjectStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "in_progress", label: "Em curso" },
  { value: "completed", label: "Concluídos" },
  { value: "review", label: "Revisão" },
  { value: "draft", label: "Rascunho" },
  { value: "archived", label: "Arquivados" },
];

export function ProjectFilters({
  status,
  onStatusChange,
  search,
  onSearchChange,
  className,
}: ProjectFiltersProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:hidden">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Estado
          </p>
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as ProjectStatus)}
          >
            <SelectTrigger
              className="h-11 rounded-2xl border-border/60 bg-muted/30 text-sm"
              aria-label="Filtrar trabalhos por estado"
            >
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="hidden gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onStatusChange(filter.value)}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              status === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Procurar trabalho..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 rounded-2xl border-border/60 bg-muted/30 pl-10"
          aria-label="Procurar trabalho"
        />
      </div>
    </div>
  );
}
