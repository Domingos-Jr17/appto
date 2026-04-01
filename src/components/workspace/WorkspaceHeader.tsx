"use client";

import { Badge } from "@/components/ui/badge";
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateButton } from "./GenerateButton";
import { DownloadButton } from "./DownloadButton";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  title: string;
  workType: string;
  progress: number;
  generationProgress: number;
  generationStep: string | null;
  isGenerating: boolean;
  allDone: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  onEditCover: () => void;
}

export function WorkspaceHeader({
  title,
  workType,
  progress,
  generationProgress,
  generationStep,
  isGenerating,
  allDone,
  onGenerate,
  onDownload,
  onEditCover,
}: WorkspaceHeaderProps) {
  if (isGenerating) {
    return (
      <div className="shrink-0 border-b border-warning/30 bg-warning/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-warning/40 border-t-warning" />
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">
              A gerar o teu trabalho...
            </p>
            {generationStep && (
              <p className="text-[10px] text-muted-foreground">
                {generationStep}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs font-medium text-warning">
            {generationProgress}%
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-warning/15">
          <div
            className="h-full rounded-full bg-warning transition-all duration-500"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-border/60 px-4 py-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
          {workType
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h3>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Progresso</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/40">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress >= 100 ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-2xl text-xs"
          onClick={onEditCover}
        >
          <Edit3 className="mr-1.5 h-3.5 w-3.5" />
          Editar capa
        </Button>
        <GenerateButton
          isGenerating={isGenerating}
          allDone={allDone}
          onGenerate={onGenerate}
        />
        <DownloadButton onDownload={onDownload} />
      </div>
    </div>
  );
}