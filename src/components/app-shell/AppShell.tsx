"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, FilePlus2, FolderKanban, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { AppShellDataProvider, useAppShellData } from "./AppShellDataContext";
import { AppHeader } from "./AppHeader";

const PAGE_TITLES: Record<string, string> = {
  "/app": "Início",
  "/app/sessoes": "Sessões",
  "/app/credits": "Créditos",
  "/app/settings": "Definições",
};

const bottomNavItems = [
  { href: "/app/sessoes", label: "Sessões", icon: FolderKanban },
  { href: "/app/credits", label: "Créditos", icon: Coins },
  { href: "/app/settings", label: "Definições", icon: Settings },
] as const;

function isNavActive(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

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
  const { projects, credits } = useAppShellData();

  const title = useMemo(() => {
    const staticTitle = PAGE_TITLES[pathname];
    if (staticTitle) return staticTitle;

    const sessionMatch = pathname.match(/^\/app\/sessoes\/([^/]+)/);
    if (sessionMatch) {
      const project = projects.find((p) => p.id === sessionMatch[1]);
      if (project) return project.title;
    }

    return "appto";
  }, [pathname, projects]);

  return (
    <div className="h-svh w-screen flex overflow-hidden bg-background">
      <div className="hidden lg:block">
        <AppSidebar currentPath={pathname} credits={credits} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader title={title} user={user} />

        <div
          className={cn(
            "min-w-0 min-h-0 flex-1",
            pathname.startsWith("/app/sessoes/")
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto px-4 pb-24 pt-5 lg:px-8 lg:pb-7 lg:py-7"
          )}
        >
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-around rounded-2xl border border-border/60 bg-foreground/95 px-3 py-3 shadow-lg backdrop-blur-lg lg:hidden">
        {bottomNavItems.slice(0, 1).map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition-colors",
                active ? "text-background" : "text-background/60"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/app/sessoes?new=1"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-warm)] text-white shadow-md transition-transform hover:scale-105"
          aria-label="Nova sessão"
        >
          <FilePlus2 className="h-5 w-5" />
        </Link>

        {bottomNavItems.slice(1).map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition-colors",
                active ? "text-background" : "text-background/60"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <AppShellDataProvider>
      <AppShellChrome user={user}>{children}</AppShellChrome>
    </AppShellDataProvider>
  );
}
