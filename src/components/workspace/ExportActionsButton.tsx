"use client";

import { Download, FileDown, FilePlus2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportActionsButtonProps {
  hasContent: boolean;
  isDownloading?: boolean;
  isSavingExport?: "DOCX" | "PDF" | null;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
  onSaveExport: (format: "DOCX" | "PDF") => void;
}

export function ExportActionsButton({
  hasContent,
  isDownloading = false,
  isSavingExport = null,
  onDownloadDocx,
  onDownloadPdf,
  onSaveExport,
}: ExportActionsButtonProps) {
  const isBusy = isDownloading || isSavingExport !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-h-11 flex-1 rounded-2xl px-4 text-sm"
          disabled={!hasContent || isBusy}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isDownloading ? "A descarregar..." : isSavingExport ? `A guardar ${isSavingExport}...` : "Exportar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDownloadDocx}>
          <FileDown className="h-4 w-4" />
          Descarregar DOCX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownloadPdf}>
          <FileDown className="h-4 w-4" />
          Descarregar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSaveExport("DOCX")}>
          <FilePlus2 className="h-4 w-4" />
          Guardar DOCX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSaveExport("PDF")}>
          <FilePlus2 className="h-4 w-4" />
          Guardar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
