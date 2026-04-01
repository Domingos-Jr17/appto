"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { cn } from "@/lib/utils";
import { appNavItems, isNavActive } from "./app-nav";
import { AppSidebar } from "./AppSidebar";
import { AppShellDataProvider, useAppShellData } from "./AppShellDataContext";
import { AppHeader } from "./AppHeader";
import { UserMenu } from "./UserMenu";

const PAGE_TITLES: Record<string, string> = {
    "/app": "Início",
    "/app/trabalhos": "Trabalhos",
    "/app/credits": "Créditos",
    "/app/settings": "Perfil",
};

interface AppShellProps {
    children: React.ReactNode;
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

function AppShellChrome({ children, user }: AppShellProps) {
    const pathname = usePathname();
    const { projects } = useAppShellData();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const prefersReducedMotion = useReducedMotion();
    const appChromeRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    const title = useMemo(() => {
        const staticTitle = PAGE_TITLES[pathname];
        if (staticTitle) return staticTitle;

        const trabalhosMatch = pathname.match(/^\/app\/trabalhos\/([^/]+)/);
        if (trabalhosMatch) {
            const project = projects.find((p) => p.id === trabalhosMatch[1]);
            if (project) return project.title;
        }

        return "appto";
    }, [pathname, projects]);

    useEffect(() => {
        if (!isMobileMenuOpen) return;

        const originalOverflow = document.body.style.overflow;
        previousFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        document.body.style.overflow = "hidden";

        const focusFirstElement = window.setTimeout(() => {
            const dialog = mobileMenuRef.current;
            if (!dialog) return;

            const firstFocusable = dialog.querySelector<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );

            firstFocusable?.focus();
        }, 0);

        return () => {
            window.clearTimeout(focusFirstElement);
            document.body.style.overflow = originalOverflow;
            previousFocusRef.current?.focus();
        };
    }, [isMobileMenuOpen]);

    useEffect(() => {
        if (!isMobileMenuOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsMobileMenuOpen(false);
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const dialog = mobileMenuRef.current;
            if (!dialog) return;

            const focusableElements = Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            );

            if (focusableElements.length === 0) {
                event.preventDefault();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey && activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMobileMenuOpen]);

    useEffect(() => {
        const appChrome = appChromeRef.current;
        if (!appChrome) return;

        if (isMobileMenuOpen) {
            appChrome.setAttribute("inert", "");
            appChrome.setAttribute("aria-hidden", "true");
        } else {
            appChrome.removeAttribute("inert");
            appChrome.removeAttribute("aria-hidden");
        }

        return () => {
            appChrome.removeAttribute("inert");
            appChrome.removeAttribute("aria-hidden");
        };
    }, [isMobileMenuOpen]);

    return (
        <>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[var(--z-overlay)] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
            >
                Saltar para o conteúdo
            </a>
            <OfflineBanner />
            <div
                ref={appChromeRef}
                className="h-svh w-screen flex gap-2 overflow-hidden bg-background p-2 lg:gap-3 lg:p-3"
            >
                <div className="hidden lg:block">
                    <AppSidebar currentPath={pathname} />
                </div>

                <main id="main-content" className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <AppHeader
                        user={user}
                        onMenuToggle={() => setIsMobileMenuOpen((open) => !open)}
                        isMobileMenuOpen={isMobileMenuOpen}
                    />

                    <div
                        className={cn(
                            "min-w-0 min-h-0 flex-1",
                            pathname.startsWith("/app/trabalhos/")
                                ? "flex flex-col overflow-hidden"
                                : "overflow-y-auto px-4 pb-8 pt-5 lg:px-8 lg:pb-7 lg:py-7",
                        )}
                    >
                        {children}
                    </div>
                </main>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen ? (
                    <motion.div
                        key="app-mobile-menu"
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        className="mobile-shell-menu fixed inset-0 z-[var(--z-mobile)] lg:hidden"
                    >
                        <div
                            className="absolute inset-0 bg-background/14 backdrop-blur-[2px]"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />

                        <div className="mobile-shell-menu__layers" aria-hidden="true">
                            <div className="mobile-shell-menu__layer mobile-shell-menu__layer--soft" />
                            <div className="mobile-shell-menu__layer mobile-shell-menu__layer--strong" />
                        </div>

                        <motion.div
                            id="app-mobile-menu"
                            ref={mobileMenuRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="app-mobile-menu-title"
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                            className="relative z-10 flex h-full flex-col overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24"
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
                                        Navegação
                                    </p>
                                    <p id="app-mobile-menu-title" className="mt-2 text-2xl font-semibold tracking-tight text-white">
                                        Explora os teus trabalhos
                                    </p>
                                </div>
                                <Link
                                    href="/app/trabalhos?new=1"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-md transition hover:bg-white/24"
                                    aria-label="Novo trabalho"
                                >
                                    <FilePlus2 className="h-5 w-5" />
                                </Link>
                            </div>

                            <nav className="flex flex-col gap-2">
                                {appNavItems.map((item, index) => {
                                    const active = isNavActive(pathname, item.href);
                                    const Icon = item.icon;

                                    return (
                                        <motion.div
                                            key={item.href}
                                            initial={prefersReducedMotion ? false : { opacity: 0, x: 28 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 28 }}
                                            transition={{
                                                duration: prefersReducedMotion ? 0 : 0.28,
                                                delay: prefersReducedMotion ? 0 : 0.08 + index * 0.05,
                                                ease: [0.22, 1, 0.36, 1],
                                            }}
                                        >
                                            <Link
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={cn(
                                                    "group flex items-center gap-4 rounded-[28px] px-5 py-4 text-[1.45rem] font-semibold tracking-tight text-white/90 transition duration-200",
                                                    active
                                                        ? "bg-white/14 text-white shadow-lg shadow-black/10"
                                                        : "hover:bg-white/10 hover:text-white",
                                                )}
                                            >
                                                <Icon className="h-6 w-6 shrink-0" />
                                                <span className="flex-1">{item.label}</span>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </nav>

                            <motion.div
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{
                                    duration: prefersReducedMotion ? 0 : 0.28,
                                    delay: prefersReducedMotion ? 0 : 0.3,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className="mt-auto rounded-[28px] border border-white/12 bg-black/10 p-3 backdrop-blur-xl"
                            >
                                <UserMenu
                                    user={user}
                                    align="start"
                                    className="w-full rounded-[24px] border-white/12 bg-white/10 text-white hover:bg-white/16"
                                />
                            </motion.div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </>
    );
}

export function AppShell({ children, user }: AppShellProps) {
    return (
        <AppShellDataProvider>
            <AppShellChrome user={user}>{children}</AppShellChrome>
        </AppShellDataProvider>
    );
}
