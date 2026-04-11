"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { FilePlus2, X, Trash2 } from "lucide-react";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { PWAInstallBanner } from "./PWAInstallBanner";
import { cn } from "@/lib/utils";
import { getAppNavItems } from "./app-nav";
import { AppSidebar } from "./AppSidebar";
import { AppShellDataProvider, useAppShellData } from "./AppShellDataContext";
import { AccountDataProvider } from "@/hooks/use-account-data";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "@/components/ui-aptto/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchWithRetry } from "@/lib/fetch-retry";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppShellProps {
    children: React.ReactNode;
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string | null;
        emailVerified?: Date | null;
    };
}

function AppShellChrome({ children, user }: AppShellProps) {
    const pathname = usePathname();
    const { projects, refresh } = useAppShellData();
    const { toast } = useToast();
    const t = useTranslations("appShell");
    const tNav = useTranslations("appShell.nav");
    const tCommon = useTranslations("common");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [bannerDismissed, setBannerDismissed] = useState(() =>
        typeof window !== "undefined" ? sessionStorage.getItem("email-verification-banner-dismissed") === "true" : false
    );
    const [sendingVerification, setSendingVerification] = useState(false);
    const prefersReducedMotion = useReducedMotion();
    const appChromeRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const navItems = getAppNavItems(tNav);

    const showVerificationBanner =
        !user.emailVerified && !bannerDismissed;

    const handleDismissBanner = () => {
        setBannerDismissed(true);
        sessionStorage.setItem("email-verification-banner-dismissed", "true");
    };

    const handleSendVerification = async () => {
        setSendingVerification(true);
        try {
            const response = await fetchWithRetry("/api/auth/send-verification", {
                method: "POST",
                retries: 1,
            });
            if (!response.ok) throw new Error(t("errorSending"));
            toast({ title: t("verificationEmailSent"), description: t("verificationEmailDesc") });
            handleDismissBanner();
        } catch {
            toast({ title: t("errorSending"), description: t("errorSendingEmail"), variant: "destructive" });
        } finally {
            setSendingVerification(false);
        }
    };

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

    const handleDeleteProject = async (id: string) => {
        setDeleteTarget(id);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const response = await fetchWithRetry(`/api/projects/${deleteTarget}`, {
                method: "DELETE",
                retries: 1,
            });
            if (!response.ok) throw new Error(t("errorDeleting"));
            toast({ title: t("workDeleted") });
            await refresh();
        } catch {
            toast({ title: t("errorDeleting"), description: t("deleteErrorDescription"), variant: "destructive" });
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleArchiveProject = async (id: string) => {
        try {
            const currentWork = projects.find((p) => p.id === id);
            const newStatus = currentWork?.status === "ARCHIVED" ? "IN_PROGRESS" : "ARCHIVED";
            const response = await fetchWithRetry(`/api/projects/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                retries: 1,
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) throw new Error(t("errorUpdating"));
            toast({
                title: newStatus === "ARCHIVED" ? t("workArchived") : t("workRestored"),
            });
            await refresh();
        } catch {
            toast({ title: t("errorUpdating"), description: t("updateErrorDescription"), variant: "destructive" });
        }
    };

    const handleEditProject = async (id: string) => {
        const project = projects.find((p) => p.id === id);
        if (!project) return;
        setEditTarget(id);
        setEditTitle(project.title);
    };

    const confirmEdit = async () => {
        if (!editTarget || !editTitle.trim()) return;
        try {
            const response = await fetch(`/api/projects/${editTarget}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: editTitle.trim() }),
            });
            if (!response.ok) throw new Error(t("errorRenaming"));
            toast({ title: t("titleUpdated") });
            await refresh();
        } catch {
            toast({ title: t("errorRenaming"), description: t("renameErrorDescription"), variant: "destructive" });
        } finally {
            setEditTarget(null);
            setEditTitle("");
        }
    };

    return (
        <>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[var(--z-overlay)] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
            >
                {t("skipContent")}
            </a>
            <OfflineBanner />
            <PWAInstallBanner />
            <AnimatePresence>
                {showVerificationBanner ? (
                    <motion.div
                        key="verification-banner"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-3 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
                            <p className="flex-1 text-sm text-amber-700 dark:text-amber-300">
                                {t("emailNotVerified")}
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 dark:hover:text-amber-200 font-medium"
                                onClick={handleSendVerification}
                                disabled={sendingVerification}
                            >
                                {sendingVerification ? t("sending") : t("verifyNow")}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600/60 hover:text-amber-700 hover:bg-amber-500/20 dark:text-amber-400/60 dark:hover:text-amber-300"
                                onClick={handleDismissBanner}
                                aria-label={t("close")}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
            <div
                ref={appChromeRef}
                className="h-svh w-screen flex gap-2 overflow-hidden bg-gradient-to-br from-background via-muted/20 to-muted/30 p-2 lg:gap-3 lg:p-3"
            >
                <div className="hidden lg:block">
                    <AppSidebar
                        currentPath={pathname}
                        onDelete={handleDeleteProject}
                        onArchive={handleArchiveProject}
                        onEdit={handleEditProject}
                    />
                </div>

                <main id="main-content" className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className={cn(isMobileMenuOpen && "lg:hidden")}>
                        <AppHeader
                            user={user}
                            onMenuToggle={() => setIsMobileMenuOpen((open) => !open)}
                            isMobileMenuOpen={isMobileMenuOpen}
                        />
                    </div>

                    <div
                        className={cn(
                            "min-w-0 min-h-0 flex-1",
                            pathname.startsWith("/app/trabalhos/")
                                ? "flex flex-col overflow-hidden"
                                : "overflow-y-auto px-4 pb-24 pt-5 lg:px-8 lg:pb-7 lg:py-7",
                        )}
                    >
                        {children}
                    </div>

                    <MobileBottomNav />
                </main>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen ? (
                    <motion.div
                        key="app-mobile-menu-header"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-[70] flex items-center gap-2 bg-background/95 backdrop-blur-sm px-4 py-3 lg:hidden"
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-2xl border border-white/10 bg-background/20 text-foreground hover:bg-background/35"
                            onClick={() => setIsMobileMenuOpen(false)}
                            aria-label={t("header.menuClose")}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <p className="flex-1 truncate text-base font-semibold text-foreground">
                            {t("header.title")}
                        </p>
                        <ThemeToggle variant="button" />
                    </motion.div>
                ) : null}
            </AnimatePresence>

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
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">{t("menu")}</p>
                                    <p id="app-mobile-menu-title" className="mt-2 text-2xl font-semibold tracking-tight text-white">
                                        {t("settingsAndAccount")}
                                    </p>
                                </div>
                                <Link
                                    href="/app"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-white transition hover:bg-white/24"
                                    aria-label={t("newWorkLabel")}
                                >
                                    <FilePlus2 className="h-5 w-5" />
                                </Link>
                            </div>

                            <nav className="flex flex-col gap-2">
                                <motion.div
                                    key="new-work"
                                    initial={prefersReducedMotion ? false : { opacity: 0, x: 28 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 28 }}
                                    transition={{
                                        duration: prefersReducedMotion ? 0 : 0.28,
                                        delay: prefersReducedMotion ? 0 : 0.08,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                >
                                    <Link
                                        href="/app"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={cn(
                                            "group flex items-center gap-4 rounded-[28px] px-5 py-4 text-[1.45rem] font-semibold tracking-tight text-emerald-400 transition duration-200",
                                            "hover:bg-emerald-400/10 hover:text-emerald-300",
                                        )}
                                    >
                                        <FilePlus2 className="h-6 w-6 shrink-0" />
                                        <span className="flex-1">{t("newWorkLabel")}</span>
                                    </Link>
                                </motion.div>

                                {navItems.map((item, index) => {
                                    const active = pathname === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <motion.div
                                            key={item.href}
                                            initial={prefersReducedMotion ? false : { opacity: 0, x: 28 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 28 }}
                                            transition={{
                                                duration: prefersReducedMotion ? 0 : 0.28,
                                                delay: prefersReducedMotion ? 0 : 0.12 + index * 0.05,
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
                                className="mt-auto rounded-[28px] border border-white/12 bg-black/10 p-3"
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

            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            {t("deleteWorkTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteWorkDesc", {
                                title: projects.find((p) => p.id === deleteTarget)?.title || t("thisWork"),
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {tCommon("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={editTarget !== null}
                onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditTitle(""); } }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("renameWorkTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("renameWorkDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={t("renamePlaceholder")}
                            autoFocus
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setEditTarget(null); setEditTitle(""); }}>
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmEdit}>
                            {tCommon("save")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export function AppShell({ children, user }: AppShellProps) {
    return (
        <AppShellDataProvider>
            <AccountDataProvider>
                <AppShellChrome user={user}>{children}</AppShellChrome>
            </AccountDataProvider>
        </AppShellDataProvider>
    );
}
