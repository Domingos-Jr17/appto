"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AppSidebar, type SidebarProject } from "./AppSidebar";
import { AppShellDataProvider, useAppShellData } from "./AppShellDataContext";
import { AppHeader } from "./AppHeader";

const SIDEBAR_COLLAPSE_EVENT = "appto:sidebar-collapse";
const SIDEBAR_COLLAPSE_KEY = "appto:sidebar-collapsed";

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

  const subscribeToCollapse = useCallback((onStoreChange: () => void) => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    window.addEventListener("storage", onStoreChange);
    window.addEventListener(SIDEBAR_COLLAPSE_EVENT, onStoreChange);

    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(SIDEBAR_COLLAPSE_EVENT, onStoreChange);
    };
  }, []);

  const collapsed = useSyncExternalStore(
    subscribeToCollapse,
    () => (typeof window !== "undefined" ? window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1" : false),
    () => false
  );

  const toggleSidebarCollapse = useCallback(() => {
    if (typeof window === "undefined") return;
    const nextValue = !collapsed;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, nextValue ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSE_EVENT));
  }, [collapsed]);

  const mobileSidebar = useMemo(
    () => (
      <AppSidebar
        collapsed={false}
        currentPath={pathname}
        credits={credits}
        projects={projects as SidebarProject[]}
        onToggleCollapse={() => undefined}
        onNavigate={() => setMobileOpen(false)}
      />
    ),
    [credits, pathname, projects]
  );

  return (
    <div className="h-svh w-screen flex overflow-hidden bg-background">
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          currentPath={pathname}
          credits={credits}
          projects={projects as SidebarProject[]}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[340px] max-w-[92vw] border-none bg-transparent p-0 shadow-none">
            <SheetTitle className="sr-only">Navegação principal</SheetTitle>
            {mobileSidebar}
          </SheetContent>
        </Sheet>

        <AppHeader
          credits={credits}
          projects={projects as SidebarProject[]}
          user={user}
          onOpenMobileNav={() => setMobileOpen(true)}
        />

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
