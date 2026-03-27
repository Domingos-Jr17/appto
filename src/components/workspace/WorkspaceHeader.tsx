"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, PanelLeftOpen, Plus } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import type { SidebarProject } from "./ProjectSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

const PAGE_META: Record<
  string,
  {
    title: string;
    breadcrumb: { label: string; href?: string }[];
    actionLabel?: string;
    actionHref?: string;
  }
> = {
  "/app": {
    title: "Início",
    breadcrumb: [{ label: "Início" }],
  },
  "/app/sessoes": {
    title: "Sessões",
    breadcrumb: [{ label: "Início", href: "/app" }, { label: "Sessões" }],
    actionLabel: "Nova sessão",
    actionHref: "/app/sessoes?new=1",
  },
  "/app/credits": {
    title: "Créditos",
    breadcrumb: [{ label: "Início", href: "/app" }, { label: "Créditos" }],
  },
  "/app/settings": {
    title: "Definições",
    breadcrumb: [{ label: "Início", href: "/app" }, { label: "Definições" }],
  },
};

interface WorkspaceHeaderProps {
  credits: number;
  onOpenMobileNav?: () => void;
  projects: SidebarProject[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function WorkspaceHeader({ credits, onOpenMobileNav, projects, user }: WorkspaceHeaderProps) {
  const pathname = usePathname();

  const meta = useMemo(() => {
    const projectMatch = pathname.match(/^\/app\/sessoes\/([^/]+)$/);
    if (projectMatch) {
      const activeProject = projects.find((project) => project.id === projectMatch[1]);

      return {
        title: activeProject?.title || "Sessão activa",
        breadcrumb: [
          { label: "Início", href: "/app" },
          { label: "Sessões", href: "/app/sessoes" },
          { label: activeProject?.title || "Sessão activa" },
        ],
      };
    }

    if (pathname === "/app") return PAGE_META["/app"];
    if (pathname.startsWith("/app/sessoes")) return PAGE_META["/app/sessoes"];
    if (pathname.startsWith("/app/credits")) return PAGE_META["/app/credits"];
    if (pathname.startsWith("/app/settings")) return PAGE_META["/app/settings"];

    return PAGE_META["/app"];
  }, [pathname, projects]);

  const isProjectWorkspace = /^\/app\/sessoes\/[^/]+$/.test(pathname);

  return (
    <header className={isProjectWorkspace ? "app-shell-header shrink-0 border-b border-border/50 px-4 py-2.5 lg:px-6 lg:py-3" : "app-shell-header shrink-0 border-b border-border/50 px-4 py-3 lg:px-6 lg:py-4"}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {!isProjectWorkspace ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 rounded-full lg:hidden"
              onClick={onOpenMobileNav}
              aria-label="Abrir navegação"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : (
            <Link href="/app" className="mt-0.5 hidden rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-sm font-semibold text-foreground lg:inline-flex">
              aptto
            </Link>
          )}

          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">{meta.title}</h1>
            <Breadcrumb>
              <BreadcrumbList>
                {meta.breadcrumb.map((item, index) => (
                  <LinkFragment
                    key={`${item.label}-${index}`}
                    item={item}
                    isLast={index === meta.breadcrumb.length - 1}
                  />
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearch projects={projects} />
          <NotificationBell credits={credits} projects={projects} />
          <Button asChild type="button" variant="ghost" size="icon" className="rounded-full">
            <a href="mailto:suporte@appto.mz" aria-label="Pedir ajuda">
              <HelpCircle className="h-4 w-4" />
            </a>
          </Button>
          {meta.actionLabel && meta.actionHref ? (
            <Button asChild className="hidden rounded-full px-4 lg:inline-flex">
              <Link href={meta.actionHref}>
                <Plus className="h-4 w-4" />
                {meta.actionLabel}
              </Link>
            </Button>
          ) : null}
          <UserMenu user={user} showIdentity={!isProjectWorkspace} />
        </div>
      </div>
    </header>
  );
}

function LinkFragment({
  item,
  isLast,
}: {
  item: { label: string; href?: string };
  isLast: boolean;
}) {
  return (
    <>
      <BreadcrumbItem>
        {isLast ? (
          <BreadcrumbPage>{item.label}</BreadcrumbPage>
        ) : item.href ? (
          <BreadcrumbLink asChild>
            <Link href={item.href}>{item.label}</Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbLink>{item.label}</BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {!isLast ? <BreadcrumbSeparator /> : null}
    </>
  );
}
