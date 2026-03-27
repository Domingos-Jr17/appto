"use client";

import Link from "next/link";
import { type ComponentType, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  BookCopy,
  FilePlus2,
  FolderDot,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isWorkspaceNavActive, workspaceNavItems } from "./workspaceNav";
import type { WorkspaceSidebarConversationItem } from "./workspaceSidebarTypes";

export interface SidebarProject {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  wordCount: number;
  resumeMode?: "chat" | "document" | "structure";
  lastEditedSection?: {
    id: string;
    title: string;
    updatedAt: string;
  } | null;
  sectionSummary?: {
    empty: number;
    started: number;
    drafting: number;
    review: number;
    stale: number;
  };
}

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface WorkspaceSidebarConfig {
  currentProject?: {
    id: string;
    title: string;
    subtitle?: string;
  } | null;
  conversations: WorkspaceSidebarConversationItem[];
  activeConversationId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onTogglePinConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

interface ProjectSidebarProps {
  collapsed: boolean;
  currentPath: string;
  credits: number;
  projects: SidebarProject[];
  user: SidebarUser;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  workspace?: WorkspaceSidebarConfig;
}

function getProjectHref(project: SidebarProject) {
  return `/app/projects/${project.id}`;
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  currentPath,
  collapsed,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  currentPath: string;
  collapsed: boolean;
  badge?: string;
  onNavigate?: () => void;
}) {
  const active = isWorkspaceNavActive(currentPath, href);

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors",
        active
          ? "bg-sidebar-primary/12 text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-current")} />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
          {badge ? <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">{badge}</Badge> : null}
        </>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SessionActions({
  session,
  onRename,
  onTogglePin,
  onDelete,
}: {
  session: WorkspaceSidebarConversationItem;
  onRename: (session: WorkspaceSidebarConversationItem) => void;
  onTogglePin: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}) {
  return (
    <>
      <ContextMenuItem onClick={() => onTogglePin(session.id)}>
        {session.pinned ? "Desafixar" : "Fixar"}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onRename(session)}>Renomear</ContextMenuItem>
      <ContextMenuItem variant="destructive" onClick={() => onDelete(session.id)}>
        Apagar
      </ContextMenuItem>
    </>
  );
}

export function ProjectSidebar({
  collapsed,
  currentPath,
  credits,
  projects,
  user,
  onToggleCollapse,
  onNavigate,
  workspace,
}: ProjectSidebarProps) {
  const [projectSearch, setProjectSearch] = useState("");
  const [renameTarget, setRenameTarget] = useState<WorkspaceSidebarConversationItem | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const initials = (user.name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const filteredProjects = useMemo(() => {
    const normalized = projectSearch.trim().toLowerCase();
    if (!normalized) return projects;
    return projects.filter((project) => project.title.toLowerCase().includes(normalized));
  }, [projectSearch, projects]);

  const renameOpen = Boolean(renameTarget);

  const openRenameDialog = (conversation: WorkspaceSidebarConversationItem) => {
    setRenameTarget(conversation);
    setDraftTitle(conversation.title);
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setDraftTitle("");
  };

  const submitRename = () => {
    if (!renameTarget || !draftTitle.trim() || !workspace) return;
    workspace.onRenameConversation(renameTarget.id, draftTitle.trim());
    closeRenameDialog();
  };

  const recentProjects = [...filteredProjects]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, collapsed ? 4 : 10);

  return (
    <TooltipProvider delayDuration={0}>
      <>
        <aside
          className={cn(
            "app-shell-sidebar sticky top-0 flex h-screen flex-col border-r border-sidebar-border text-sidebar-foreground transition-all",
            collapsed ? "w-[96px]" : "w-[312px]"
          )}
        >
        <div className="shrink-0 border-b border-sidebar-border px-4 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/app" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
              <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-2xl text-primary-foreground shadow-sm">
                <BookCopy className="h-5 w-5" />
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight text-foreground">appto</p>
                  <p className="truncate text-xs text-sidebar-foreground/70">Workspace académico</p>
                </div>
              ) : null}
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden rounded-full text-current hover:bg-sidebar-accent hover:text-foreground lg:inline-flex"
              onClick={() => {
                if (!collapsed && projectSearch) {
                  setProjectSearch("");
                }
                onToggleCollapse();
              }}
              aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild className={cn("h-11 w-full rounded-2xl", collapsed && "px-0")}>
                  <Link href="/app/projects?new=1" onClick={onNavigate} aria-label="Novo projecto">
                    <FilePlus2 className="h-4 w-4" />
                    {!collapsed ? <span>Novo projecto</span> : null}
                  </Link>
                </Button>
              </TooltipTrigger>
              {collapsed ? <TooltipContent side="right">Novo projecto</TooltipContent> : null}
            </Tooltip>

            {!collapsed ? (
              <div className="surface-muted rounded-3xl px-3 py-3">
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-sidebar-foreground/70">
                  <span>{workspace?.currentProject ? "Projecto actual" : "Saldo disponível"}</span>
                  {!workspace?.currentProject ? <span>{credits.toLocaleString("pt-MZ")} créditos</span> : null}
                </div>

                {workspace?.currentProject ? (
                  <Link
                    href={`/app/projects/${workspace.currentProject.id}`}
                    onClick={onNavigate}
                    className="mt-2 block rounded-2xl border border-sidebar-border/70 bg-background/75 px-3 py-3 transition-colors hover:bg-background"
                  >
                    <p className="truncate text-sm font-medium text-foreground">{workspace.currentProject.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {workspace.currentProject.subtitle || "Assistente, estrutura e documento"}
                    </p>
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <div className="space-y-5">
            {!collapsed ? <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">Navegação</p> : null}

            <div className="space-y-1.5">
              {workspaceNavItems.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  currentPath={currentPath}
                  collapsed={collapsed}
                  badge={item.href === "/app/credits" && !collapsed ? credits.toLocaleString("pt-MZ") : undefined}
                  onNavigate={onNavigate}
                />
              ))}
            </div>

            <div className="space-y-3">
              {!collapsed ? (
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                    Projectos recentes
                  </span>
                  <span className="text-[11px] text-sidebar-foreground/50">{recentProjects.length}</span>
                </div>
              ) : null}

              {!collapsed ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    placeholder="Pesquisar projectos"
                    className="h-10 rounded-2xl border-sidebar-border bg-background/70 pl-10"
                  />
                </div>
              ) : null}

              {recentProjects.length > 0 ? (
                <div className="space-y-1.5">
                  {recentProjects.map((project) => {
                    const href = getProjectHref(project);
                    const active = currentPath === href;
                    const item = (
                      <Link
                        key={project.id}
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors",
                          active
                            ? "border-primary/30 bg-primary/10 text-foreground"
                            : "border-border/40 bg-card/60 text-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <FolderDot className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                        {!collapsed ? (
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{project.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {project.wordCount.toLocaleString("pt-MZ")} palavras
                            </p>
                          </div>
                        ) : null}
                      </Link>
                    );

                    if (!collapsed) return item;

                    return (
                      <Tooltip key={project.id}>
                        <TooltipTrigger asChild>{item}</TooltipTrigger>
                        <TooltipContent side="right">{project.title}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : !collapsed ? (
                <p className="rounded-2xl border border-dashed border-sidebar-border px-3 py-6 text-center text-sm text-sidebar-foreground/65">
                  {projectSearch ? "Nenhum projecto encontrado" : "Sem projectos recentes"}
                </p>
              ) : null}
            </div>

            {workspace && !collapsed ? (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                    Sessões do assistente
                  </span>
                  <span className="text-[11px] text-sidebar-foreground/50">{workspace.conversations.length}</span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={workspace.search}
                    onChange={(event) => workspace.onSearchChange(event.target.value)}
                    placeholder="Filtrar sessões"
                    className="h-10 rounded-2xl border-sidebar-border bg-background/70 pl-10"
                  />
                </div>

                <div className="space-y-1.5">
                  {workspace.conversations.map((conversation) => (
                    <ContextMenu key={conversation.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={cn(
                            "group flex items-start gap-2 rounded-2xl border px-3 py-3 transition-colors",
                            conversation.id === workspace.activeConversationId
                              ? "border-primary/30 bg-primary/10"
                              : "border-border/40 bg-card/70 hover:bg-accent/60"
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => workspace.onSelectConversation(conversation.id)}
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
                                <DropdownMenuItem onClick={() => workspace.onTogglePinConversation(conversation.id)}>
                                  {conversation.pinned ? "Desafixar" : "Fixar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRenameDialog(conversation)}>
                                  Renomear
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => workspace.onDeleteConversation(conversation.id)}
                                >
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
                          onTogglePin={workspace.onTogglePinConversation}
                          onDelete={workspace.onDeleteConversation}
                        />
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}

                  {workspace.conversations.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-sidebar-border px-3 py-6 text-center text-sm text-sidebar-foreground/65">
                      Sem sessões visíveis
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-sidebar-accent hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <Avatar className="h-10 w-10 border border-sidebar-border/80">
                  <AvatarImage src={user.image || undefined} alt={user.name || "Utilizador"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {!collapsed ? (
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name || "Utilizador"}</p>
                    <p className="truncate text-xs text-sidebar-foreground/60">{user.email || "Sem email"}</p>
                  </div>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-64">
              <DropdownMenuLabel className="space-y-1 px-2 py-2 font-normal">
                <p className="truncate text-sm font-medium text-foreground">{user.name || "Utilizador"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email || "Sem email"}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => void signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Terminar sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {workspace ? (
          <Dialog open={renameOpen} onOpenChange={(open) => (!open ? closeRenameDialog() : undefined)}>
            <DialogContent className="sm:max-w-md">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitRename();
                }}
              >
                <DialogHeader>
                  <DialogTitle>Renomear sessão</DialogTitle>
                </DialogHeader>
                <Input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Novo título da sessão"
                  autoFocus
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeRenameDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!draftTitle.trim()}>
                    Guardar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    </TooltipProvider>
  );
}
