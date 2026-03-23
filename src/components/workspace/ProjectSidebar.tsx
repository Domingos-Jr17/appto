"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  BookCopy,
  ChevronLeft,
  ChevronRight,
  Coins,
  FilePlus2,
  FolderDot,
  LogOut,
  Search,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em curso",
  REVIEW: "Em revisao",
  COMPLETED: "Concluido",
  ARCHIVED: "Arquivado",
};

const RESUME_COPY: Record<NonNullable<SidebarProject["resumeMode"]>, string> = {
  chat: "Retomar no chat",
  document: "Abrir documento",
  structure: "Ver estrutura",
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "agora";
  if (diffHours < 24) return `ha ${diffHours}h`;
  if (diffDays < 7) return `ha ${diffDays}d`;
  return date.toLocaleDateString("pt-MZ", {
    day: "2-digit",
    month: "short",
  });
}

function getProjectProgress(project: SidebarProject) {
  if (project.status === "COMPLETED") return 100;

  const summary = project.sectionSummary;
  if (!summary) {
    if (project.wordCount <= 0) return 8;
    return Math.min(90, Math.max(14, Math.round((project.wordCount / 12500) * 100)));
  }

  const total = summary.empty + summary.started + summary.drafting + summary.review + summary.stale;
  if (total === 0) return project.wordCount > 0 ? 18 : 8;

  const weighted =
    summary.empty * 10 +
    summary.started * 38 +
    summary.drafting * 72 +
    summary.review * 100 +
    summary.stale * 28;

  return Math.max(8, Math.min(100, Math.round(weighted / total)));
}

function getProjectHref(project: SidebarProject) {
  const mode = project.resumeMode || (project.wordCount > 0 ? "document" : "chat");
  const qs = mode !== "document" ? `?mode=${mode}` : "";
  return `/app/projects/${project.id}${qs}`;
}

function getProjectMeta(project: SidebarProject) {
  const primary = RESUME_COPY[project.resumeMode || "chat"];
  const secondary = project.lastEditedSection?.title || STATUS_LABELS[project.status] || "Em curso";
  return `${primary} · ${secondary}`;
}

function Section({
  title,
  items,
  currentPath,
  onNavigate,
}: {
  title: string;
  items: SidebarProject[];
  currentPath: string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((project) => {
          const href = getProjectHref(project);
          const isActive = currentPath.startsWith("/app/editor") && href.includes(project.id);
          const progress = getProjectProgress(project);

          return (
            <Link
              key={project.id}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group block rounded-2xl border px-3 py-3 transition-colors",
                isActive
                  ? "border-primary/30 bg-primary/10"
                  : "border-transparent bg-muted/35 hover:border-border/70 hover:bg-muted/55"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{project.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{getProjectMeta(project)}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    {formatRelativeTime(project.updatedAt)}
                  </p>
                </div>
                <span className="mt-0.5 text-xs text-muted-foreground">{progress}%</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-background/70">
                <div
                  className="h-full rounded-full bg-primary/80 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
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

  const recentProjects = [...filteredProjects]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5);
  const inProgressProjects = filteredProjects
    .filter((project) => ["DRAFT", "IN_PROGRESS", "REVIEW"].includes(project.status))
    .slice(0, 5);
  const completedProjects = filteredProjects
    .filter((project) => project.status === "COMPLETED")
    .slice(0, 4);

  const quickLinks = [
    {
      href: "/app/credits",
      label: "Creditos",
      icon: Coins,
      meta: `${credits.toLocaleString("pt-MZ")}`,
    },
    {
      href: "/app/settings",
      label: "Definicoes",
      icon: Settings,
      meta: "Conta",
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
        <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col border-r border-border/60 bg-[#faf6ef] text-foreground transition-all dark:bg-[#12110f]",
          collapsed ? "w-[92px]" : "w-[320px]"
        )}
      >
        <div className="flex items-center justify-between px-4 pb-4 pt-5">
          <Link href="/app" onClick={onNavigate} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <BookCopy className="h-5 w-5" />
            </div>
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold tracking-tight">appto</p>
                <p className="text-xs text-muted-foreground">Workspace academico</p>
              </div>
            ) : null}
          </Link>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-9 w-9 rounded-full lg:inline-flex"
                onClick={onToggleCollapse}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="px-4 pb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                className={cn(
                  "h-11 w-full justify-start rounded-2xl bg-foreground px-4 text-background hover:bg-foreground/90",
                  collapsed && "justify-center px-0"
                )}
              >
                <Link href="/app/projects?new=1" onClick={onNavigate}>
                  <FilePlus2 className="h-4 w-4" />
                  {!collapsed ? <span className="ml-2">Novo trabalho</span> : null}
                </Link>
              </Button>
            </TooltipTrigger>
            {collapsed ? <TooltipContent side="right">Novo trabalho</TooltipContent> : null}
          </Tooltip>
        </div>

        <div className="flex-1 overflow-hidden px-3 pb-3">
          {collapsed ? (
            <div className="space-y-3">
              {recentProjects.slice(0, 5).map((project) => (
                <Tooltip key={project.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={getProjectHref(project)}
                      onClick={onNavigate}
                      className="flex h-12 items-center justify-center rounded-2xl bg-muted/45 hover:bg-muted"
                    >
                      <FolderDot className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="space-y-1">
                      <p className="font-medium">{project.title}</p>
                      <p className="text-xs">{getProjectMeta(project)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col gap-5 overflow-hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar projectos"
                  className="h-11 rounded-2xl border-border/70 bg-background/70 pl-10"
                />
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                <Section title="Continuar" items={recentProjects} currentPath={currentPath} onNavigate={onNavigate} />
                <Section title="Em curso" items={inProgressProjects} currentPath={currentPath} onNavigate={onNavigate} />
                <Section title="Concluidos" items={completedProjects} currentPath={currentPath} onNavigate={onNavigate} />

                <div className="space-y-2">
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                    Navegacao
                  </p>
                  <Link
                    href="/app/projects"
                    onClick={onNavigate}
                    className="flex items-center justify-between rounded-2xl border border-transparent bg-muted/35 px-3 py-3 hover:border-border/70 hover:bg-muted/55"
                  >
                    <span className="text-sm font-medium">Biblioteca de projectos</span>
                    <span className="text-xs text-muted-foreground">Todos</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 px-3 py-3">
          <div className="space-y-1">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.href);

              const content = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center rounded-2xl px-3 py-3 transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!collapsed ? (
                    <>
                      <span className="ml-3 text-sm font-medium">{item.label}</span>
                      <span className="ml-auto text-xs opacity-80">{item.meta}</span>
                    </>
                  ) : null}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={item.href}>{content}</div>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "mt-3 flex w-full items-center rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:bg-muted/45",
                  collapsed && "justify-center px-0"
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || undefined} alt={user.name || "Utilizador"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {!collapsed ? (
                  <div className="ml-3 min-w-0">
                    <p className="truncate text-sm font-medium">{user.name || "Utilizador"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email || ""}</p>
                  </div>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-60">
              <DropdownMenuItem asChild>
                <Link href="/app/settings" onClick={onNavigate}>
                  <Settings className="mr-2 h-4 w-4" />
                  Definicoes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => void signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Terminar sessao
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
