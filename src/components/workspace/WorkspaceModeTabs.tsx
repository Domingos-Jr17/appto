"use client";

import { MessageSquareText, Network, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceMode = "chat" | "document" | "structure";

interface WorkspaceModeTabsProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}

const MODE_OPTIONS: Array<{
  value: WorkspaceMode;
  label: string;
  description: string;
  icon: typeof MessageSquareText;
}> = [
  {
    value: "chat",
    label: "Conversa",
    description: "Ideias, prompts e geração incremental",
    icon: MessageSquareText,
  },
  {
    value: "document",
    label: "Documento",
    description: "Escrita contínua e revisão da secção activa",
    icon: PenSquare,
  },
  {
    value: "structure",
    label: "Estrutura",
    description: "Capítulos, ordem e progresso editorial",
    icon: Network,
  },
];

export function WorkspaceModeTabs({ mode, onModeChange }: WorkspaceModeTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.value === mode;

        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? "default" : "ghost"}
            onClick={() => onModeChange(option.value)}
            className={cn(
              "h-auto rounded-2xl px-4 py-3 text-left",
              active
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "border border-border/60 bg-background/70 hover:bg-muted/45"
            )}
          >
            <span className="flex items-start gap-3">
              <span className={cn("mt-0.5 rounded-xl p-1.5", active ? "bg-background/15" : "bg-primary/10")}>
                <Icon className={cn("h-4 w-4", active ? "text-background" : "text-primary")} />
              </span>
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className={cn("block text-xs", active ? "text-background/80" : "text-muted-foreground")}>
                  {option.description}
                </span>
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
