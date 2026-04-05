"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Edit3, Check, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GenerateButton } from "./GenerateButton";
import { DownloadButton } from "./DownloadButton";
import { cn } from "@/lib/utils";
import type { WorkSection } from "@/types/workspace";

interface WorkspaceHeaderProps {
  title: string;
  workType: string;
  progress: number;
  generationProgress: number;
  generationStep: string | null;
  isGenerating: boolean;
  allDone: boolean;
  sections?: WorkSection[];
  subscriptionStatus?: { package: string; remaining: number; total: number };
  coverIncomplete?: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  onEditCover: () => void;
  onSaveTitle?: (title: string) => void;
}

export function WorkspaceHeader({
  title,
  workType,
  progress,
  generationProgress,
  generationStep,
  isGenerating,
  allDone,
  sections = [],
  subscriptionStatus,
  coverIncomplete = false,
  onGenerate,
  onDownload,
  onEditCover,
  onSaveTitle,
}: WorkspaceHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  const handleStartEdit = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleBlur = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      handleSave();
    } else {
      handleCancel();
    }
  };

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === title) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSaveTitle?.(trimmed);
    } finally {
      setIsEditing(false);
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const hasContent = sections.some((s) => s.status === "done" && s.content.trim().length > 0);

  if (isGenerating) {
  return (
      <div className="shrink-0 border-b border-warning/30 bg-warning/5 px-3 py-3">
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
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-warning/15">
          <div
            className="h-full rounded-full bg-warning transition-all duration-500"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-border/40 px-3 py-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="shrink-0 rounded-full text-[9px] px-1.5 py-0">
          {workType
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>

        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="h-10 text-sm font-semibold leading-tight"
              placeholder="Título do trabalho..."
              disabled={isSaving}
              maxLength={180}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 shrink-0 rounded-2xl text-success"
              onClick={handleSave}
              disabled={isSaving}
              aria-label="Guardar título"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 shrink-0 rounded-2xl text-muted-foreground"
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Cancelar edição"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="group flex-1 text-left line-clamp-1 text-[13px] font-semibold leading-tight text-foreground"
            onClick={handleStartEdit}
            title="Clique para editar o título"
          >
            {title}
            <Edit3 className="ml-1.5 inline h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Progresso</span>
            {subscriptionStatus && subscriptionStatus.remaining === 0 && (
              <span className="flex items-center gap-1 text-destructive">
                Limite atingido
              </span>
            )}
          </div>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/30">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress >= 100 ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 max-lg:hidden">
        <Button
          variant="ghost"
          className={cn(
            "min-h-11 shrink-0 rounded-2xl px-4 text-sm transition-colors hover:text-foreground",
            coverIncomplete
              ? "text-warning/80 hover:text-warning"
              : "text-muted-foreground"
          )}
          onClick={onEditCover}
        >
          <ImageIcon className="mr-1 h-3.5 w-3.5" />
          Capa
          {coverIncomplete && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-warning" />
          )}
        </Button>
          {hasContent && (
            <GenerateButton
              isGenerating={isGenerating}
              allDone={allDone}
              onGenerate={onGenerate}
            />
          )}
        <DownloadButton
          onDownload={onDownload}
          hasContent={hasContent}
        />
      </div>
    </div>
  );
}
