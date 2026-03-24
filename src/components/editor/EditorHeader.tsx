"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  FileDown,
  FolderTree,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSaveCopy } from "@/lib/editor-helpers";
import type { AutoSaveStatus, Project } from "@/types/editor";

interface EditorHeaderProps {
  project: Project;
  sectionTitle: string;
  wordCount: number;
  autoSaveStatus: AutoSaveStatus;
  lastSaved: Date | undefined;
  isSavingExport: "docx" | "pdf" | null;
  onExport: (format: "docx" | "pdf") => void;
  onSaveExport: (format: "docx" | "pdf") => void;
  onStructureDrawerOpen: () => void;
}

export function EditorHeader({
  project,
  sectionTitle,
  wordCount,
  autoSaveStatus,
  lastSaved,
  isSavingExport,
  onExport,
  onSaveExport,
  onStructureDrawerOpen,
}: EditorHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border/50 bg-background/80 px-4 py-2 backdrop-blur lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">{project.title}</h1>
            <p className="hidden truncate text-[11px] text-muted-foreground xl:block">
              {sectionTitle || "Sem secao activa"} · {wordCount.toLocaleString("pt-MZ")} palavras
            </p>
          </div>
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            {getSaveCopy(autoSaveStatus, lastSaved)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs"
            onClick={onStructureDrawerOpen}
          >
            <FolderTree className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Estrutura</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full text-xs">
                {isSavingExport ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onExport("docx")}>
                <Download className="mr-2 h-4 w-4" />
                Descarregar DOCX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")}>
                <FileDown className="mr-2 h-4 w-4" />
                Descarregar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSaveExport("docx")}>
                <Download className="mr-2 h-4 w-4" />
                Guardar DOCX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSaveExport("pdf")}>
                <FileDown className="mr-2 h-4 w-4" />
                Guardar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
            <Link href={`/app/projects/${project.id}/workspace`}>
              <FolderTree className="h-3.5 w-3.5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
            <Link href="/app/projects">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
