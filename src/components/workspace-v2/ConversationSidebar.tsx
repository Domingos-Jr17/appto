"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookCopy,
  Coins,
  FilePlus2,
  FolderKanban,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  WorkspaceConversationItem,
  WorkspaceProjectLinkItem,
} from "./workspace-types";

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface ConversationSidebarProps {
  projectId: string;
  projectTitle: string;
  user: SidebarUser;
  recentProjects: WorkspaceProjectLinkItem[];
  conversations: WorkspaceConversationItem[];
  activeConversationId: string;
  collapsed: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onTogglePinConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onToggleCollapsed: () => void;
}

function getInitials(name?: string | null) {
  return (name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface SessionActionsProps {
  session: WorkspaceConversationItem;
  onRename: (session: WorkspaceConversationItem) => void;
  onTogglePin: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

function SessionActions({
  session,
  onRename,
  onTogglePin,
  onDelete,
}: SessionActionsProps) {
  return (
    <>
      <ContextMenuItem onClick={() => onTogglePin(session.id)}>
        {session.pinned ? "Desafixar" : "Fixar"}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onRename(session)}>Renomear</ContextMenuItem>
      <ContextMenuItem>Duplicar sessão</ContextMenuItem>
      <ContextMenuItem variant="destructive" onClick={() => onDelete(session.id)}>
        Apagar
      </ContextMenuItem>
    </>
  );
}

export function ConversationSidebar({
  projectId,
  projectTitle,
  user,
  recentProjects,
  conversations,
  activeConversationId,
  collapsed,
  search,
  onSearchChange,
  onSelectConversation,
  onRenameConversation,
  onTogglePinConversation,
  onDeleteConversation,
  onToggleCollapsed,
}: ConversationSidebarProps) {
  const initials = getInitials(user.name);
  const [renameTarget, setRenameTarget] = useState<WorkspaceConversationItem | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const renameOpen = Boolean(renameTarget);
  const renameDisabled = useMemo(() => !draftTitle.trim(), [draftTitle]);

  const openRenameDialog = (conversation: WorkspaceConversationItem) => {
    setRenameTarget(conversation);
    setDraftTitle(conversation.title);
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setDraftTitle("");
  };

  const submitRename = () => {
    if (!renameTarget || !draftTitle.trim()) return;
    onRenameConversation(renameTarget.id, draftTitle.trim());
    closeRenameDialog();
  };

  return (
    <aside className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground theme-transition">
      <div className="glass-header border-b border-sidebar-border px-4 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/app" className="flex items-center gap-3">
            <div className="gradient-primary gradient-glow-subtle flex h-10 w-10 items-center justify-center rounded-2xl text-primary-foreground shadow-sm">
              <BookCopy className="h-5 w-5" />
            </div>
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold tracking-tight">appto</p>
                <p className="text-xs text-sidebar-foreground/70">Workspace académico</p>
              </div>
            ) : null}
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="focus-ring rounded-full text-current hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button asChild className="rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90">
                <Link href="/app/projects?new=1">
                  <FilePlus2 className="mr-2 h-4 w-4" /> Novo trabalho
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-sidebar-border bg-transparent">
                <Link href="/app/projects">
                  <FolderKanban className="mr-2 h-4 w-4" /> Projetos
                </Link>
              </Button>
            </div>

            <div className="glass glass-border rounded-3xl p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                Projeto actual
              </p>
              <Link
                href={`/app/projects/${projectId}/workspace`}
                className="card-hover mt-2 block rounded-2xl border border-border/60 bg-background/70 px-3 py-3"
              >
                <p className="truncate text-sm font-medium text-foreground">{projectTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">Assistente + documento + estrutura</p>
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {collapsed ? (
          <div className="space-y-2">
            <Button asChild variant="ghost" size="icon" className="h-10 w-full rounded-2xl hover:bg-sidebar-accent">
              <Link href="/app/projects?new=1" aria-label="Novo trabalho">
                <FilePlus2 className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-10 w-full rounded-2xl hover:bg-sidebar-accent">
              <Link href="/app/projects" aria-label="Projetos">
                <FolderKanban className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-10 w-full rounded-2xl hover:bg-sidebar-accent">
              <Link href="/app/credits" aria-label="Créditos">
                <Coins className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-10 w-full rounded-2xl hover:bg-sidebar-accent">
              <Link href="/app/settings" aria-label="Configurações">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                Navegação
              </div>
              <div className="space-y-1.5">
                <Link
                  href="/app/credits"
                  className="card-hover flex items-center gap-3 rounded-2xl border border-border/40 bg-card/70 px-3 py-3 text-sm text-foreground"
                >
                  <Coins className="h-4 w-4 text-primary" /> Créditos
                </Link>
                <Link
                  href="/app/settings"
                  className="card-hover flex items-center gap-3 rounded-2xl border border-border/40 bg-card/70 px-3 py-3 text-sm text-foreground"
                >
                  <Settings className="h-4 w-4 text-primary" /> Configurações
                </Link>
              </div>
            </section>

            <section className="space-y-2">
              <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                Projetos recentes
              </div>
              <div className="space-y-1.5">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/projects/${project.id}/workspace`}
                    className={cn(
                      "card-hover flex rounded-2xl border px-3 py-3 transition-colors",
                      project.id === projectId
                        ? "border-primary/30 bg-primary/10"
                        : "border-border/40 bg-card/70 hover:bg-accent/60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{project.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {project.wordCount.toLocaleString("pt-MZ")} palavras
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                  Sessões do assistente
                </span>
                <span className="text-[11px] text-sidebar-foreground/50">{conversations.length}</span>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Filtrar sessões"
                  className="h-10 rounded-2xl border-border/70 bg-background/70 pl-9"
                />
              </div>

              <div className="space-y-1.5">
                {conversations.map((conversation) => (
                  <ContextMenu key={conversation.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={cn(
                          "group flex items-start gap-2 rounded-2xl border px-3 py-3 transition-colors",
                          conversation.id === activeConversationId
                            ? "border-primary/30 bg-primary/10"
                            : "border-border/40 bg-card/70 hover:bg-accent/60"
                        )}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => onSelectConversation(conversation.id)}
                        >
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{conversation.title}</p>
                            {conversation.pinned ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                                fixa
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.subtitle}</p>
                        </button>

                        <div className="flex items-center gap-1 pl-2">
                          <span className="text-[11px] text-muted-foreground">{conversation.updatedLabel}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => onTogglePinConversation(conversation.id)}>
                                {conversation.pinned ? "Desafixar" : "Fixar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRenameDialog(conversation)}>
                                Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem>Duplicar sessão</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => onDeleteConversation(conversation.id)}>
                                Apagar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52">
                      <SessionActions
                        session={conversation}
                        onRename={openRenameDialog}
                        onTogglePin={onTogglePinConversation}
                        onDelete={onDeleteConversation}
                      />
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-10 w-10 border border-border/60">
                <AvatarImage src={user.image || undefined} alt={user.name || "Utilizador"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {!collapsed ? (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name || "Utilizador"}</p>
                  <p className="truncate text-xs text-sidebar-foreground/60">{user.email || "Sem email"}</p>
                </div>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-64">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user.name || "Utilizador"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email || "Sem email"}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/settings">Configurações</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/credits">Upgrade e créditos</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={(open) => !open && closeRenameDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear sessão</DialogTitle>
          </DialogHeader>
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Novo nome da sessão"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitRename();
              }
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRenameDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={submitRename} disabled={renameDisabled}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
