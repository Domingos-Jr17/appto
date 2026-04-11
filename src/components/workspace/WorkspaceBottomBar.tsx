"use client";

import { useTranslations } from "next-intl";
import { ImageIcon, Download, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface WorkspaceBottomBarProps {
  hasContent: boolean;
  isGenerating: boolean;
  isDownloading?: boolean;
  allDone: boolean;
  coverIncomplete: boolean;
  onEditCover: () => void;
  onGenerate: () => void;
  onDownload: () => void;
}

export function WorkspaceBottomBar({
  hasContent,
  isGenerating,
  isDownloading = false,
  allDone,
  coverIncomplete,
  onEditCover,
  onGenerate,
  onDownload,
}: WorkspaceBottomBarProps) {
  const t = useTranslations("workspace.bottomBar");
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl safe-area-inset-bottom lg:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs min-h-0 h-auto transition-colors",
            coverIncomplete
              ? "text-warning/80 hover:text-warning"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={onEditCover}
        >
          <ImageIcon className="h-4 w-4" />
          <span className="text-[10px] font-medium">{t("cover")}</span>
          {coverIncomplete && (
            <span className="absolute -top-0.5 right-2 h-1.5 w-1.5 rounded-full bg-warning" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs min-h-0 h-auto text-muted-foreground transition-colors hover:text-foreground"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
          <span className="text-[10px] font-medium">
            {allDone ? t("regenerate") : t("generate")}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs min-h-0 h-auto text-muted-foreground transition-colors hover:text-foreground"
          onClick={onDownload}
          disabled={!hasContent || isDownloading}
        >
          <Download className="h-4 w-4" />
          <span className="text-[10px] font-medium">{isDownloading ? t("downloading") : t("download")}</span>
        </Button>

        <Link href="/app" className="flex flex-1 items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs min-h-0 h-auto text-emerald-500 transition-colors hover:text-emerald-400 hover:bg-emerald-500/10"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[10px] font-medium">{t("new")}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
