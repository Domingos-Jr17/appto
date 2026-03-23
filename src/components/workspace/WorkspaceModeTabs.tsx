"use client";

import { Eye, MessageSquareText, Network, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceMode = "chat" | "document" | "structure" | "preview";

interface WorkspaceModeTabsProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}

const MODE_OPTIONS: Array<{
  value: WorkspaceMode;
  label: string;
  icon: typeof MessageSquareText;
}> = [
  {
    value: "document",
    label: "Documento",
    icon: PenSquare,
  },
  {
    value: "structure",
    label: "Estrutura",
    icon: Network,
  },
  {
    value: "preview",
    label: "Preview",
    icon: Eye,
  },
];

export function WorkspaceModeTabs({ mode, onModeChange }: WorkspaceModeTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MODE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.value === mode;

        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange(option.value)}
            className={cn(
              "rounded-full px-3 py-2 text-xs",
              active
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "border border-border/60 bg-background/70 hover:bg-muted/45"
            )}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
