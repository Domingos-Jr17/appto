"use client";

import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  onDownload: () => void;
}

export function DownloadButton({ onDownload }: DownloadButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1 rounded-2xl text-xs"
      onClick={onDownload}
    >
      Baixar docx
    </Button>
  );
}
