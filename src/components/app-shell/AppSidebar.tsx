"use client";

import Link from "next/link";
import { BookCopy, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { appNavItems, isNavActive } from "./app-nav";

interface AppSidebarProps {
    currentPath: string;
    onNavigate?: () => void;
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function AppSidebar({
    currentPath,
    onNavigate,
    user,
}: AppSidebarProps) {
    return (
        <aside className="glass-premium sticky top-0 z-[var(--z-sidebar)] flex h-full w-[220px] shrink-0 flex-col rounded-[28px] text-sidebar-foreground">
            <div className="shrink-0 border-b border-white/10 px-3 pb-3 pt-4">
                <Link
                    href="/app"
                    onClick={onNavigate}
                    className="flex items-center gap-3"
                >
                    <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-2xl text-primary-foreground shadow-sm">
                        <BookCopy className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                            appto
                        </p>
                        <p className="truncate text-xs text-sidebar-foreground/70">
                            Gerador académico
                        </p>
                    </div>
                </Link>

                <p className="mt-3 text-xs leading-relaxed text-sidebar-foreground/60">
                    Entra, descreve o trabalho e deixa a plataforma montar a capa, a estrutura e o conteúdo inicial.
                </p>

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
            </nav>

            <div className="shrink-0 border-t border-sidebar-border/80 px-2 pb-2 pt-2.5">
                <UserMenu
                    user={user}
                    align="start"
                    showIdentity={true}
                    compact={true}
                />
            </div>
        </aside>
    );
}
