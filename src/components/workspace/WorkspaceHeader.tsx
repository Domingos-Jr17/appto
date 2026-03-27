"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Coins, PanelLeftOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PAGE_META: Record<
  string,
  {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
  }
> = {
  "/app": {
    title: "Início",
    description: "Retome o trabalho académico e avance para a próxima decisão com clareza.",
  },
  "/app/projects": {
    title: "Projectos",
    description: "Organize o pipeline editorial, filtre estados e abra cada trabalho no fluxo certo.",
    actionLabel: "Novo projecto",
    actionHref: "/app/projects?new=1",
  },
  "/app/credits": {
    title: "Créditos",
    description: "Controle saldo, consumo e recargas sem sair do ambiente de trabalho.",
  },
  "/app/settings": {
    title: "Definições",
    description: "Gira preferências, segurança e notificações da conta num único espaço.",
  },
};

interface WorkspaceHeaderProps {
  credits: number;
  onOpenMobileNav?: () => void;
}

export function WorkspaceHeader({ credits, onOpenMobileNav }: WorkspaceHeaderProps) {
  const pathname = usePathname();

  const meta = useMemo(() => {
    if (pathname.startsWith("/app/editor") || pathname.startsWith("/app/projects/")) return null;

    if (pathname === "/app") return PAGE_META["/app"];
    if (pathname.startsWith("/app/projects")) return PAGE_META["/app/projects"];
    if (pathname.startsWith("/app/credits")) return PAGE_META["/app/credits"];
    if (pathname.startsWith("/app/settings")) return PAGE_META["/app/settings"];

    return PAGE_META["/app"];
  }, [pathname]);

  if (!meta) return null;

  return (
    <header className="app-shell-header shrink-0 border-b border-border/60 px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 rounded-full lg:hidden"
            onClick={onOpenMobileNav}
            aria-label="Abrir navegação"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">{meta.title}</h1>
              <Badge variant="outline" className="hidden rounded-full text-[11px] lg:inline-flex">
                SaaS académico
              </Badge>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="hidden rounded-full border-border/70 px-3 py-1 lg:inline-flex">
            <Coins className="mr-1.5 h-3.5 w-3.5" />
            {credits.toLocaleString("pt-MZ")} créditos
          </Badge>

          {meta.actionLabel && meta.actionHref ? (
            <Button asChild className="hidden rounded-full px-4 lg:inline-flex">
              <Link href={meta.actionHref}>
                <Plus className="h-4 w-4" />
                {meta.actionLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
