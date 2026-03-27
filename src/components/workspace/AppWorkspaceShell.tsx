"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ProjectSidebar, type SidebarProject } from "./ProjectSidebar";
import { AppWorkspaceDataProvider, useAppWorkspaceData } from "./AppWorkspaceDataContext";
import { WorkspaceHeader } from "./WorkspaceHeader";

interface AppWorkspaceShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

function AppWorkspaceShellChrome({ children, user }: AppWorkspaceShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { projects, credits } = useAppWorkspaceData();

  const mobileSidebar = useMemo(
    () => (
      <ProjectSidebar
        collapsed={false}
        currentPath={pathname}
        credits={credits}
        projects={projects as SidebarProject[]}
        user={user}
        onToggleCollapse={() => undefined}
        onNavigate={() => setMobileOpen(false)}
      />
    ),
    [credits, pathname, projects, user]
  );

  return (
    <div className="h-svh w-screen flex overflow-hidden bg-background">
      <div className="hidden lg:block">
        <ProjectSidebar
          collapsed={collapsed}
          currentPath={pathname}
          credits={credits}
          projects={projects as SidebarProject[]}
          user={user}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[340px] max-w-[92vw] border-none bg-transparent p-0 shadow-none">
            {mobileSidebar}
          </SheetContent>
        </Sheet>

        <WorkspaceHeader credits={credits} onOpenMobileNav={() => setMobileOpen(true)} />

        <div
          className={cn(
            "min-w-0 min-h-0 flex-1",
            pathname.startsWith("/app/projects/")
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

export function AppWorkspaceShell({ children, user }: AppWorkspaceShellProps) {
  const pathname = usePathname();
  const isProjectWorkspaceRoute = /^\/app\/projects\/[^/]+$/.test(pathname);

  if (isProjectWorkspaceRoute) {
    return <div className="h-svh w-screen overflow-hidden bg-background">{children}</div>;
  }

  return (
    <AppWorkspaceDataProvider>
      <AppWorkspaceShellChrome user={user}>{children}</AppWorkspaceShellChrome>
    </AppWorkspaceDataProvider>
  );
}
