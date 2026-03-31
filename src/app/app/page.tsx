"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, FilePlus2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";
import { formatRelativeTime } from "@/lib/utils";

const QUICK_TYPES = [
  { label: "Monografia", href: "/app/trabalhos?new=1&type=MONOGRAPHY", tone: "success" },
  { label: "Relatório", href: "/app/trabalhos?new=1&type=REPORT", tone: "neutral" },
  { label: "Artigo científico", href: "/app/trabalhos?new=1&type=ARTICLE", tone: "neutral" },
  { label: "Proposta", href: "/app/trabalhos?new=1&type=RESEARCH_PROJECT", tone: "neutral" },
] as const;

export default function WorkspaceHomePage() {
  const { data: session, status } = useSession();
  const { projects, isLoading } = useAppShellData();

  if (isLoading || status === "loading") {
    return <DashboardSkeleton />;
  }

  const firstName = session?.user?.name?.split(" ")[0] || "Estudante";
  const leadProject = projects[0] || null;
  const recentProjects = projects.slice(0, 2);

  return (
    <div className="space-y-6">
      <Card className="glass glass-border overflow-hidden rounded-[28px] bg-background/80">
        <CardContent className="space-y-5 p-6 lg:p-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Olá, {firstName}</p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
              O que queres criar hoje?
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Escolhe o tipo de trabalho, diz o tema e deixa a aptto montar a capa, a estrutura e o conteúdo inicial.
            </p>
          </div>

          <Button asChild size="lg" className="h-14 rounded-2xl px-6 text-base shadow-sm shadow-primary/20">
            <Link href="/app/trabalhos?new=1">
              <FilePlus2 className="mr-2 h-5 w-5" />
              Criar trabalho académico
            </Link>
          </Button>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_TYPES.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={item.tone === "success"
                  ? "rounded-2xl border border-emerald-200/60 bg-emerald-50 px-4 py-3 transition-colors hover:bg-emerald-100/80 dark:border-emerald-500/20 dark:bg-emerald-500/12 dark:hover:bg-emerald-500/18"
                  : "rounded-2xl border border-border/60 bg-muted/25 px-4 py-3 transition-colors hover:bg-muted/45"}
              >
                <p className={item.tone === "success"
                  ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300"
                  : "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"}
                >
                  {item.tone === "success" ? "Mais usado" : "Criar rápido"}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{item.label}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass glass-border rounded-[28px] bg-background/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Continuar onde paraste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/app/trabalhos/${project.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/55 px-4 py-4 transition-colors hover:bg-background/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{project.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {formatProjectType(project.type)}
                    {project.brief?.institutionName ? ` · ${project.brief.institutionName}` : ""}
                    {project.updatedAt ? ` · ${formatRelativeTime(new Date(project.updatedAt))}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-primary">
                  Abrir →
                </span>
              </Link>
            ))
          ) : (
            <EmptyState
              icon={FileText}
              title="Ainda não há trabalhos"
              description="Crie o primeiro trabalho e a plataforma abre logo no ponto certo para rever o documento gerado."
              className="items-start py-10 text-left"
              action={
                <Button asChild className="rounded-full px-5">
                  <Link href="/app/trabalhos?new=1">Criar primeiro trabalho</Link>
                </Button>
              }
            />
          )}

          {leadProject ? (
            <div className="flex justify-end pt-2">
              <Button variant="ghost" asChild className="rounded-full px-4">
                  <Link href="/app/trabalhos">
                  Ver todos os trabalhos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function formatProjectType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
