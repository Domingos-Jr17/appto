"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextRailProps {
  title: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function ContextRail({
  title,
  description,
  open,
  onToggle,
  children,
}: ContextRailProps) {
  return (
    <aside
      className={cn(
        "hidden border-l border-border/50 bg-background/70 backdrop-blur xl:flex xl:flex-col",
        open ? "w-[360px]" : "w-[72px]"
      )}
    >
      <div className={cn("flex items-center gap-3 border-b border-border/50 p-4", !open && "justify-center")}>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onToggle}>
          {open ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
        {open ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        ) : null}
      </div>

      {open ? <div className="min-h-0 flex-1 overflow-hidden">{children}</div> : null}
    </aside>
  );
}
