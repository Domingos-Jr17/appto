"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  BookCopy,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FolderDot,
  FolderKanban,
  LogOut,
  Search,
  Settings,
  Coins,
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

function getProjectHref(project: SidebarProject) {
  return `/app/projects/${project.id}`;
}

function ProjectList({
  items,
  currentPath,
  onNavigate,
}: {
  items: SidebarProject[];
  currentPath: string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {items.map((project) => {
        const href = getProjectHref(project);
        const isActive =
          (currentPath.startsWith("/app/projects/") || currentPath.startsWith("/app/editor")) &&
          href.includes(project.id);

        return (
          <Link
            key={project.id}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "bg-foreground/10 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <FolderDot className="h-4 w-4 shrink-0" />
            <span className="truncate">{project.title}</span>
          </Link>
        );
      })}
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
    .slice(0, 10);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col border-r border-border/60 bg-[#faf6ef] text-foreground transition-all dark:bg-[#12110f]",
          collapsed ? "w-[92px]" : "w-[320px]"
        )}
      >
        {/* Zone 1: Sticky header */}
        <div className="shrink-0 border-b border-border/40">
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

          <div className="px-4 pb-3 space-y-2">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="outline"
                  className={cn(
                    "h-10 w-full justify-start rounded-2xl px-4",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Link href="/app/projects" onClick={onNavigate}>
                    <FolderKanban className="h-4 w-4" />
                    {!collapsed ? <span className="ml-2">Projetos</span> : null}
                  </Link>
                </Button>
              </TooltipTrigger>
              {collapsed ? <TooltipContent side="right">Projetos</TooltipContent> : null}
            </Tooltip>
          </div>
        </div>

        {/* Zone 2: Scrollable middle */}
        <div className="flex-1 overflow-hidden px-3 py-3">
          {collapsed ? (
            <div className="space-y-2">
              {recentProjects.slice(0, 5).map((project) => (
                <Tooltip key={project.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={getProjectHref(project)}
                      onClick={onNavigate}
                      className="flex h-10 items-center justify-center rounded-xl bg-muted/45 hover:bg-muted"
                    >
                      <FolderDot className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{project.title}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col gap-4 overflow-hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar..."
                  className="h-10 rounded-xl border-border/70 bg-background/70 pl-10"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                <ProjectList
                  items={filteredProjects}
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                />
                {filteredProjects.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {search ? "Nenhum resultado" : "Sem projectos ainda"}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Zone 3: Sticky footer - user menu */}
        <div className="shrink-0 border-t border-border/60 px-3 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted/45",
                  collapsed && "justify-center px-0"
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || undefined} alt={user.name || "Utilizador"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {!collapsed ? (
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name || "Utilizador"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email || ""}</p>
                  </div>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-60">
              <DropdownMenuItem asChild>
                <Link href="/app/credits" onClick={onNavigate}>
                  <Coins className="mr-2 h-4 w-4" />
                  Creditos
                  <span className="ml-auto text-xs text-muted-foreground">{credits.toLocaleString("pt-MZ")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
