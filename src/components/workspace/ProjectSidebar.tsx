"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  BookCopy,
  FilePlus2,
  FolderDot,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isWorkspaceNavActive, workspaceNavItems } from "./workspaceNav";

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

interface ProjectSidebarProps {
  collapsed: boolean;
  currentPath: string;
  credits: number;
  projects: SidebarProject[];
  user: SidebarUser;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
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

export function ProjectSidebar({
  collapsed,
  currentPath,
  credits,
  projects,
  user,
  onToggleCollapse,
  onNavigate,
}: ProjectSidebarProps) {
  const [search, setSearch] = useState("");

  const initials = (user.name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const filteredProjects = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return projects;
    return projects.filter((project) => project.title.toLowerCase().includes(normalized));
  }, [projects, search]);

  useEffect(() => {
    if (collapsed && search) {
      setSearch("");
    }
  }, [collapsed, search]);

  const recentProjects = [...filteredProjects]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, collapsed ? 4 : 10);

  return (
    <TooltipProvider delayDuration={0}>
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
              onClick={onToggleCollapse}
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
                  <span>Saldo disponível</span>
                  <span>{credits.toLocaleString("pt-MZ")} créditos</span>
                </div>
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
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
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
                  {search ? "Nenhum projecto encontrado" : "Sem projectos recentes"}
                </p>
              ) : null}
            </div>
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
    </TooltipProvider>
  );
}
