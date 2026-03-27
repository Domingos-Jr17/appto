"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ProjectSidebar, type SidebarProject } from "./ProjectSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";

interface AppWorkspaceShellProps {
  children: React.ReactNode;
}

export function AppWorkspaceShell({ children }: AppWorkspaceShellProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [credits, setCredits] = useState(0);
  const [projects, setProjects] = useState<SidebarProject[]>([]);
  const isProjectWorkspaceRoute = /^\/app\/projects\/[^/]+(?:\/workspace)?$/.test(pathname);

  useEffect(() => {
    if (status !== "authenticated" || isProjectWorkspaceRoute) return;

    let active = true;

    Promise.all([
      fetch("/api/projects").then((response) => response.json()),
      fetch("/api/credits").then((response) => response.json()),
    ])
      .then(([projectsData, creditsData]) => {
        if (!active) return;

        setProjects(
          Array.isArray(projectsData)
            ? projectsData.map((project) => ({
                id: project.id,
                title: project.title,
                status: project.status,
                updatedAt: project.updatedAt,
                wordCount: project.wordCount ?? 0,
                resumeMode: project.resumeMode,
                lastEditedSection: project.lastEditedSection,
                sectionSummary: project.sectionSummary,
              }))
            : []
        );
        setCredits(creditsData.balance || 0);
      })
      .catch(() => {
        if (!active) return;
        setProjects([]);
      });

    return () => {
      active = false;
    };
  }, [isProjectWorkspaceRoute, pathname, status]);

  const mobileSidebar = useMemo(
    () => (
      <ProjectSidebar
        collapsed={false}
        currentPath={pathname}
        credits={credits}
        projects={projects}
        user={session?.user || {}}
        onToggleCollapse={() => undefined}
        onNavigate={() => setMobileOpen(false)}
      />
    ),
    [credits, pathname, projects, session?.user]
  );

  if (status === "loading") {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) return null;

  if (isProjectWorkspaceRoute) {
    return <div className="h-svh w-screen overflow-hidden bg-background">{children}</div>;
  }

  return (
    <div className="h-svh w-screen flex overflow-hidden bg-background">
      <div className="hidden lg:block">
        <ProjectSidebar
          collapsed={collapsed}
          currentPath={pathname}
          credits={credits}
          projects={projects}
          user={session.user}
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
            pathname.startsWith("/app/editor") || pathname.startsWith("/app/projects/")
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
