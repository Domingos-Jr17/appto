"use client";

import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  onDownload: () => void;
  hasContent?: boolean;
}

export function DownloadButton({ onDownload, hasContent }: DownloadButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1 rounded-2xl text-xs"
      onClick={onDownload}
      disabled={!hasContent}
    >
      Descarregar .docx
    </Button>
  );
}
