"use client";

import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

interface GenerateWorkProgressProps {
  steps: string[];
  activeIndex: number;
  currentMessage?: string;
}

export function GenerateWorkProgress({ steps, activeIndex, currentMessage }: GenerateWorkProgressProps) {
  const t = useTranslations("workCreation.progress");
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          <p className="text-xs text-muted-foreground">
            {currentMessage || t("description")}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-background/65 p-4">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;

          return (
            <div key={step} className="flex items-center gap-3">
              <span
                className={isDone
                  ? "h-3 w-3 rounded-full bg-primary"
                  : isActive
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary"
                    : "h-3 w-3 rounded-full bg-border/80"}
              >
                {isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              </span>
              <div>
                <p className={isActive || isDone ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground"}>
                  {step}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
