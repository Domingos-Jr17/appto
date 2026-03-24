"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_COPY: Record<string, { title: string }> = {
  "/app": { title: "Area de trabalho" },
  "/app/projects": { title: "Projectos" },
  "/app/credits": { title: "Creditos" },
  "/app/settings": { title: "Definicoes" },
};

interface WorkspaceHeaderProps {
  credits: number;
}

export function WorkspaceHeader({ credits }: WorkspaceHeaderProps) {
  const pathname = usePathname();

  const copy = useMemo(() => {
    if (pathname.startsWith("/app/editor") || pathname.startsWith("/app/projects/")) return null;
    return PAGE_COPY[pathname] ?? PAGE_COPY["/app"];
  }, [pathname]);

  if (!copy) return null;

  return (
    <header className="shrink-0 border-b border-border/50 bg-background/80 px-4 py-2 backdrop-blur lg:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">{copy.title}</h1>
        <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
          <Link href="/app/projects?new=1">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Novo
          </Link>
        </Button>
      </div>
    </header>
  );
}
