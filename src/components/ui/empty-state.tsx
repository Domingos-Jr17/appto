import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-center",
        compact ? "px-4 py-6" : "px-6 py-10",
        className
      )}
    >
      <div className={cn("rounded-full bg-muted/60", compact ? "mb-3 p-3" : "mb-4 p-4")}>
        <Icon className={cn("text-muted-foreground/45", compact ? "h-6 w-6" : "h-10 w-10")} />
      </div>
      <h3 className={cn("font-semibold tracking-tight", compact ? "text-base" : "text-xl")}>{title}</h3>
      <p className={cn("mt-2 max-w-md text-sm leading-6 text-muted-foreground", compact && "max-w-sm")}>
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
