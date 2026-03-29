"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  const [mobileOpen, setMobileOpen] = useState(false);
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
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[300px] max-w-[92vw] border-none bg-transparent p-0 shadow-none">
            <SheetTitle className="sr-only">Navegação principal</SheetTitle>
            <AppSidebar
              currentPath={pathname}
              credits={credits}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <AppHeader title={title} user={user} onOpenMobileNav={() => setMobileOpen(true)} />

        <div
          className={cn(
            "min-w-0 min-h-0 flex-1",
            pathname.startsWith("/app/sessoes/")
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto px-4 py-5 lg:px-8 lg:py-7"
          )}
        >
          {children}
        </div>
      </div>
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
