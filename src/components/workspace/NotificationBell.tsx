"use client";

import { Bell, Coins, FolderKanban, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SidebarProject } from "./ProjectSidebar";

interface NotificationBellProps {
  credits: number;
  projects: SidebarProject[];
}

export function NotificationBell({ credits, projects }: NotificationBellProps) {
  const notifications = [
    ...(credits < 50
      ? [
          {
            id: "low-credits",
            title: "Saldo baixo",
            description: `Tem ${credits.toLocaleString("pt-MZ")} créditos disponíveis para continuar a gerar conteúdo.`,
            icon: Coins,
          },
        ]
      : []),
    ...(projects.some((project) => (project.sectionSummary?.review || 0) > 0)
      ? [
          {
            id: "review-ready",
            title: "Secções prontas para revisão",
            description: "Há conteúdo no estado de revisão final pronto para validar ou exportar.",
            icon: Sparkles,
          },
        ]
      : []),
    ...(projects.length === 0
      ? [
          {
            id: "first-session",
            title: "Primeira sessão pendente",
            description: "Crie a primeira sessão para desbloquear o fluxo completo do workspace.",
            icon: FolderKanban,
          },
        ]
      : []),
  ].slice(0, 3);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Abrir notificações"
        >
          <Bell className="h-4 w-4" />
          {notifications.length > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          <Badge variant="secondary" className="rounded-full">
            {notifications.length}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.id} className="items-start gap-3 py-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            Sem alertas novos. O seu espaço está em ordem.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
