"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_COPY: Record<string, { title: string; description: string }> = {
  "/app": {
    title: "Área de trabalho",
    description: "Continue a escrever, organize projectos e mova-se entre conversa, documento e estrutura.",
  },
  "/app/projects": {
    title: "Projectos",
    description: "Gerencie rascunhos, trabalhos activos e entregas concluídas sem sair do fluxo principal.",
  },
  "/app/credits": {
    title: "Créditos",
    description: "Saldo, histórico e checkout ficam aqui, integrados na mesma shell de trabalho.",
  },
  "/app/settings": {
    title: "Definições",
    description: "Conta, preferências e segurança com menos ruído visual e foco em manutenção.",
  },
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
    <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-border/50 bg-background/85 px-6 py-5 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/75">
          Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-medium">{credits.toLocaleString("pt-MZ")} créditos</span>
        </div>
        <Button asChild className="rounded-full px-5">
          <Link href="/app/projects?new=1">
            <Plus className="mr-2 h-4 w-4" />
            Novo trabalho
          </Link>
        </Button>
      </div>
    </header>
  );
}
