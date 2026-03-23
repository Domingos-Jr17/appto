"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileDown,
  FolderTree,
  Loader2,
} from "lucide-react";
import {
  WorkspaceModeTabs,
  type WorkspaceMode,
} from "@/components/workspace/WorkspaceModeTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSaveCopy, formatProjectType, formatRelativeDate } from "@/lib/editor-helpers";
import type { AutoSaveStatus, Project } from "@/types/editor";

interface EditorHeaderProps {
  project: Project;
  credits: number;
  workspaceMode: WorkspaceMode;
  sectionTitle: string;
  wordCount: number;
  autoSaveStatus: AutoSaveStatus;
  lastSaved: Date | undefined;
  isSavingExport: "docx" | "pdf" | null;
  onModeChange: (mode: WorkspaceMode) => void;
  onExport: (format: "docx" | "pdf") => void;
  onSaveExport: (format: "docx" | "pdf") => void;
  onStructureDrawerOpen: () => void;
}

export function EditorHeader({
  project,
  credits,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workspaceMode,
  sectionTitle,
  wordCount,
  autoSaveStatus,
  lastSaved,
  isSavingExport,
  onModeChange,
  onExport,
  onSaveExport,
  onStructureDrawerOpen,
}: EditorHeaderProps) {
  return (
    <div className="border-b border-border/50 bg-background/80 px-4 py-2.5 backdrop-blur lg:px-6">
      <div className="flex flex-col gap-2.5">
        {/* Row 1: project info + actions */}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px]">
              {formatProjectType(project.type)}
            </Badge>
            <h1 className="text-base font-semibold tracking-tight">{project.title}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="rounded-full bg-background/70 text-[10px]">
                {wordCount.toLocaleString("pt-MZ")} palavras
              </Badge>
              {workspaceMode !== "chat" ? (
                <Badge variant="outline" className="rounded-full bg-background/70 text-[10px]">
                  <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                  {getSaveCopy(autoSaveStatus, lastSaved)}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={onStructureDrawerOpen}
            >
              <FolderTree className="mr-1.5 h-3.5 w-3.5" />
              Estrutura
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  {isSavingExport ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Exportar
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

            <Button variant="ghost" size="sm" asChild className="rounded-full text-xs">
              <Link href="/app/projects">
                Projetos
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Row 2: mode tabs */}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <WorkspaceModeTabs mode={workspaceMode} onModeChange={onModeChange} />
          {workspaceMode !== "chat" ? (
            <span className="text-[11px] text-muted-foreground">
              Secao: {sectionTitle || "nenhuma"} {project.lastEditedSection ? `· ultima edicao: ${formatRelativeDate(project.lastEditedSection.updatedAt)}` : ""}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {project.lastEditedSection ? `Ultima secao editada: ${project.lastEditedSection.title}` : "Nenhuma secao editada ainda"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
