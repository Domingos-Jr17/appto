"use client";

import Link from "next/link";
import {
    BookCopy,
    Coins,
    FilePlus2,
    FolderKanban,
    Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/app/sessoes", label: "Sessões", icon: FolderKanban },
    { href: "/app/credits", label: "Créditos", icon: Coins },
    { href: "/app/settings", label: "Definições", icon: Settings },
] as const;

function isNavActive(currentPath: string, href: string) {
    return currentPath === href || currentPath.startsWith(`${href}/`);
}

interface AppSidebarProps {
    currentPath: string;
    credits: number;
    onNavigate?: () => void;
}

export function AppSidebar({
    currentPath,
    credits,
    onNavigate,
}: AppSidebarProps) {
    return (
        <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="shrink-0 border-b border-sidebar-border px-4 pb-4 pt-5">
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
                            Workspace académico
                        </p>
                    </div>
                </Link>

                <Button asChild className="mt-4 h-11 w-full rounded-2xl">
                    <Link
                        href="/app/sessoes?new=1"
                        onClick={onNavigate}
                        aria-label="Nova sessão"
                    >
                        <FilePlus2 className="h-4 w-4" />
                        <span>Nova sessão</span>
                    </Link>
                </Button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
                <div className="space-y-1.5">
                    {navItems.map((item) => {
                        const active = isNavActive(currentPath, item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onNavigate}
                                className={cn(
                                    "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors",
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
                                {item.href === "/app/credits" ? (
                                    <Badge
                                        variant="outline"
                                        className="rounded-full px-2 py-0 text-[10px]"
                                    >
                                        {credits.toLocaleString("pt-MZ")}
                                    </Badge>
                                ) : null}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </aside>
    );
}
