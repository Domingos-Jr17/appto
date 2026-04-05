"use client";

import { Menu, X } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "@/components/ui-aptto/ThemeToggle";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string | null;
    };
    onMenuToggle?: () => void;
    isMobileMenuOpen?: boolean;
}

export function AppHeader({
    user,
    onMenuToggle,
    isMobileMenuOpen = false,
}: AppHeaderProps) {
    return (
        <header className="shrink-0 rounded-[24px] px-4 py-2 lg:px-6 lg:py-3 bg-card/70 backdrop-blur-xl border border-border/40 shadow-float-xl">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 lg:hidden">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-2xl border border-white/10 bg-background/20 text-foreground hover:bg-background/35"
                        onClick={onMenuToggle}
                        aria-label={
                            isMobileMenuOpen ? "Fechar menu" : "Abrir menu"
                        }
                        aria-expanded={isMobileMenuOpen}
                        aria-controls={
                            isMobileMenuOpen ? "app-mobile-menu" : undefined
                        }
                    >
                        {isMobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-tight lg:text-base text-foreground">
                        APPTO: Gerador de Trabalhos Académicos
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <ThemeToggle variant="button" />
                    <UserMenu user={user} />
                </div>
            </div>
        </header>
    );
}
