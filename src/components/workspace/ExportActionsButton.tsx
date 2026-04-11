"use client";

import { useTranslations } from "next-intl";
import { Download, FileDown, FilePlus2, Link2, Loader2 } from "lucide-react";
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
  onShareLink?: () => void;
}

export function ExportActionsButton({
  hasContent,
  isDownloading = false,
  isSavingExport = null,
  onDownloadDocx,
  onDownloadPdf,
  onSaveExport,
  onShareLink,
}: ExportActionsButtonProps) {
  const t = useTranslations("workspace.exportActions");
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
          {isDownloading
            ? t("downloading")
            : isSavingExport
              ? t("saving", { format: isSavingExport })
              : t("export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onShareLink} disabled={!onShareLink}>
          <Link2 className="h-4 w-4" />
          {t("shareLink")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownloadDocx}>
          <FileDown className="h-4 w-4" />
          {t("downloadDocx")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownloadPdf}>
          <FileDown className="h-4 w-4" />
          {t("downloadPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSaveExport("DOCX")}>
          <FilePlus2 className="h-4 w-4" />
          {t("saveDocx")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSaveExport("PDF")}>
          <FilePlus2 className="h-4 w-4" />
          {t("savePdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
