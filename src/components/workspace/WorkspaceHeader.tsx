"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { PanelLeftOpen, Plus } from "lucide-react";
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
    description: "Retome a sessão certa e avance para a próxima decisão com clareza.",
  },
  "/app/sessoes": {
    title: "Sessões",
    description: "Organize a biblioteca, filtre estados e abra cada sessão no fluxo certo.",
    actionLabel: "Nova sessão",
    actionHref: "/app/sessoes?new=1",
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
    if (pathname.startsWith("/app/sessoes/")) return null;

    if (pathname === "/app") return PAGE_META["/app"];
    if (pathname.startsWith("/app/sessoes")) return PAGE_META["/app/sessoes"];
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
            <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">{meta.title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
