"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors.app");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("description")}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>{t("retry")}</Button>
          <Button variant="outline" onClick={() => window.location.assign("/app")}>{t("backToApp")}</Button>
        </div>
      </div>
    </div>
  );
}
