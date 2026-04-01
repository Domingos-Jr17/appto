"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <Button
      size="sm"
      className="flex-1 rounded-2xl text-xs"
      onClick={onGenerate}
      disabled={isGenerating}
    >
      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
      {isGenerating
        ? "A gerar..."
        : allDone
          ? "Regenerar tudo"
          : "Gerar tudo"}
    </Button>
  );
}
