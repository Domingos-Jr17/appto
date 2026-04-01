"use client";

import Link from "next/link";
import { BookCopy, FilePlus2, MoreVertical, Trash2, Archive, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppShellData } from "./AppShellDataContext";
import { appNavItems, isNavActive } from "./app-nav";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
    currentPath: string;
    onNavigate?: () => void;
    onDelete?: (id: string) => void;
    onArchive?: (id: string) => void;
    onEdit?: (id: string) => void;
}

export function AppSidebar({
    currentPath,
    onNavigate,
    onDelete,
    onArchive,
    onEdit,
}: AppSidebarProps) {
    const { projects } = useAppShellData();

    const recentProjects = projects
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4);

    return (
        <aside className="glass-premium sticky top-0 z-[var(--z-sidebar)] flex h-full w-[240px] shrink-0 flex-col rounded-[28px] text-sidebar-foreground">
            <div className="shrink-0 flex flex-col items-center border-b border-white/10 px-3 pb-3 pt-4">
                <Link
                    href="/app"
                    onClick={onNavigate}
                    className="flex items-center justify-center"
                >
                    <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-2xl text-primary-foreground shadow-sm">
                        <BookCopy className="h-5 w-5" />
                    </div>
                </Link>

                <Button asChild className="mt-4 h-10 w-full rounded-2xl">
                    <Link
                        href="/app/trabalhos?new=1"
                        onClick={onNavigate}
                        aria-label="Criar trabalho académico"
                    >
                        <FilePlus2 className="h-4 w-4" />
                        <span>Criar trabalho</span>
                    </Link>
                </Button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
                <div className="space-y-1">
                    {appNavItems.map((item) => {
                        const active = isNavActive(currentPath, item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onNavigate}
                                className={cn(
                                    "group flex items-center gap-2 rounded-2xl px-2.5 py-2 text-xs transition-colors",
                                    active
                                        ? "bg-sidebar-primary/12 text-foreground"
                                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                                )}
                                aria-current={active ? "page" : undefined}
                            >
                                <Icon
                                    className={cn(
                                        "h-4 w-4 shrink-0",
                                        active
                                            ? "text-primary"
                                            : "text-current",
                                    )}
                                />
                                <span className="min-w-0 flex-1 truncate font-medium">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {recentProjects.length > 0 && (
                    <>
                        <div className="my-3 border-t border-sidebar-border/40" />
                        <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/50">
                            Trabalhos recentes
                        </p>
                        <div className="space-y-0.5">
                            {recentProjects.map((project) => {
                                const isActive = currentPath === `/app/trabalhos/${project.id}`;
                                return (
                                    <div key={project.id} className={cn(
                                        "group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors",
                                        isActive
                                            ? "bg-sidebar-primary/12 text-foreground"
                                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-foreground"
                                    )}>
                                        <Link
                                            href={`/app/trabalhos/${project.id}`}
                                            onClick={onNavigate}
                                            className="flex min-w-0 flex-1 items-center gap-2"
                                        >
                                            <span className={cn(
                                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                                isActive ? "bg-primary" : "bg-sidebar-foreground/30"
                                            )} />
                                            <span className="min-w-0 flex-1 truncate font-medium">
                                                {project.title}
                                            </span>
                                        </Link>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                                    aria-label="Mais opções"
                                                >
                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => onEdit?.(project.id)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Renomear
                                                </DropdownMenuItem>
                                                {project.status === "archived" ? (
                                                    <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Restaurar
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Arquivar
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => onDelete?.(project.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </nav>
        </aside>
    );
}
