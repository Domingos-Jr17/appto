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
      className="min-h-11 flex-1 rounded-2xl px-4 text-sm"
      onClick={onDownload}
      disabled={!hasContent}
    >
      Descarregar .docx
    </Button>
  );
}
