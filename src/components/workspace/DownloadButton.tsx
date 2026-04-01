"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  onDownload: () => void;
}

export function DownloadButton({ onDownload }: DownloadButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-2xl text-xs"
      onClick={onDownload}
    >
      <Download className="mr-1.5 h-3.5 w-3.5" />
      .docx
    </Button>
  );
}
