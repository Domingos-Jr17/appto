"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DownloadButtonProps {
  onDownload: () => void;
  hasContent?: boolean;
  isDownloading?: boolean;
}

export function DownloadButton({ onDownload, hasContent, isDownloading = false }: DownloadButtonProps) {
  const button = (
    <Button
      variant="outline"
      className="min-h-11 flex-1 rounded-2xl px-4 text-sm"
      onClick={onDownload}
      disabled={!hasContent || isDownloading}
    >
      {isDownloading ? "A descarregar..." : "Descarregar documento"}
    </Button>
  );

  if (!hasContent && !isDownloading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-center">
          Gera o trabalho primeiro para descarregar o documento.
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
