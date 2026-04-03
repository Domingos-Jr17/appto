"use client";

import { useState } from "react";
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
          ? "A gerar..."
          : allDone
            ? "Regenerar trabalho"
            : "Gerar trabalho"}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar trabalho?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto vai substituir todo o conteúdo gerado anteriormente. Tens a
              certeza que queres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Sim, regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
