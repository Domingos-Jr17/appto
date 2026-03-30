"use client";

import { Menu, X } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "@/components/ui-aptto/ThemeToggle";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
    title: string;
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    onMenuToggle?: () => void;
    isMobileMenuOpen?: boolean;
}

export function AppHeader({
    title,
    user,
    onMenuToggle,
    isMobileMenuOpen = false,
}: AppHeaderProps) {
    return (
        <header className="glass-premium shrink-0 rounded-[24px] px-4 py-2 text-sidebar-foreground lg:px-6 lg:py-3">
            <div className="flex items-center justify-between">
                <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">
                    {title}
                </h1>
                <div className="flex items-center gap-1.5">
                    <div className="lg:hidden">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-2xl border border-white/10 bg-background/20 text-foreground hover:bg-background/35"
                            onClick={onMenuToggle}
                            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls={isMobileMenuOpen ? "app-mobile-menu" : undefined}
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                    <ThemeToggle variant="button" />
                    <div className="lg:hidden">
                        <UserMenu user={user} />
                    </div>
                </div>
            </div>
        </header>
    );
}
