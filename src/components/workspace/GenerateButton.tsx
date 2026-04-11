"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GenerateButtonProps {
  isGenerating: boolean;
  allDone: boolean;
  onGenerate: () => void;
}

export function GenerateButton({
  isGenerating,
  allDone,
  onGenerate,
}: GenerateButtonProps) {
  const t = useTranslations("workspace.generateButton");
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (allDone && !isGenerating) {
      setShowConfirm(true);
    } else {
      onGenerate();
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onGenerate();
  };

  return (
    <>
      <Button
        className="min-h-11 flex-1 rounded-2xl px-4 text-sm"
        onClick={handleClick}
        disabled={isGenerating}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        {isGenerating
          ? t("generating")
          : allDone
            ? t("regenerate")
            : t("generate")}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
