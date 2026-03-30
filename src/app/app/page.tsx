"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";
import type { AppProjectRecord } from "@/lib/app-data";
import { calculateProjectProgress } from "@/lib/progress";
import { buildDashboardSummary } from "@/lib/workspace-ui";

const RESUME_COPY = "Abrir sessão";

export default function WorkspaceHomePage() {
  const { data: session, status } = useSession();
  const { projects, isLoading } = useAppShellData();

  if (isLoading || status === "loading") {
    return <DashboardSkeleton />;
  }

  const firstName = session?.user?.name?.split(" ")[0] || "Estudante";
  const leadProject = projects[0] || null;
  const summary = buildDashboardSummary(projects);

  const overviewItems = [
    {
      label: "Em curso",
      value: summary.activeProjects.toLocaleString("pt-MZ"),
      detail: "sessões activas",
    },
    {
      label: "Palavras",
      value: summary.totalWords.toLocaleString("pt-MZ"),
      detail: "no workspace",
    },
    {
      label: "Revisão final",
      value: summary.reviewReady.toLocaleString("pt-MZ"),
      detail: "secções prontas",
    },
    {
      label: "Próximo passo",
      value: summary.nextAction,
      detail: leadProject ? leadProject.title : "Primeira sessão",
      isText: true,
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass glass-border shadow-soft overflow-hidden rounded-2xl bg-background/80">
        <CardContent className="flex flex-col gap-8 p-6 lg:p-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {leadProject ? "Retomar trabalho" : "Começar uma sessão"}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
              {leadProject
                ? `${firstName}, volte ao que estava em progresso.`
                : `${firstName}, inicie a primeira sessão com um fluxo simples.`}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {leadProject
                ? "O dashboard fica reduzido ao essencial: continuar a sessão principal, perceber o estado actual e abrir rapidamente o trabalho recente."
                : "Crie a primeira sessão para abrir imediatamente o chat, a estrutura e o documento no mesmo fluxo de trabalho."}
            </p>
          </div>

          {leadProject ? (
            <div className="surface-muted rounded-xl p-5 lg:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {formatProjectType(leadProject.type)}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">{leadProject.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {leadProject.description || "Sem descrição."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{leadProject.wordCount.toLocaleString("pt-MZ")} palavras</span>
                    <span>·</span>
                    <span>{formatRelativeTime(new Date(leadProject.updatedAt))}</span>
                    {leadProject.lastEditedSection ? (
                      <>
                        <span>·</span>
                        <span>Última secção: {leadProject.lastEditedSection.title}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <Button asChild className="rounded-full px-5">
                  <Link href={getProjectHref(leadProject)}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {RESUME_COPY}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="Ainda não há sessões"
              description="Crie a primeira sessão e o workspace abre logo no ponto certo para começar a trabalhar."
              className="items-start text-left"
              action={
                <Button asChild className="rounded-full px-5">
                  <Link href="/app/sessoes?new=1">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeira sessão
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card className="glass glass-border shadow-soft rounded-2xl bg-background/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Visão rápida</CardTitle>
        </CardHeader>
<CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overviewItems.map((item) => (
            <div
              key={item.label}
              className="surface-muted rounded-xl p-4 transition-all duration-200 hover:bg-muted/70 hover:shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
              <p className={item.isText ? "mt-3 text-sm font-medium leading-6" : "mt-3 text-2xl font-semibold"}>
                {item.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass glass-border shadow-soft rounded-2xl bg-background/80">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Sessões recentes</CardTitle>
<p className="mt-1 text-sm text-muted-foreground">
              Aceda directamente às sessões mais recentes para continuar o trabalho.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href="/app/sessoes">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length > 0 ? (
            projects.slice(0, 4).map((project, index) => {
              const progress = calculateProjectProgress(project);

              return (
                <div
                  key={project.id}
                  className="card-hover flex flex-col gap-4 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/55 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {index === 0 ? "Última actividade" : formatProjectType(project.type)}
                    </p>
                    <div>
                      <h3 className="truncate text-base font-semibold">{project.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {project.lastEditedSection
                          ? `Última secção: ${project.lastEditedSection.title}`
                          : "Sem secção iniciada ainda."}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-[240px] items-center gap-4 lg:justify-end">
                    <div className="min-w-[120px] text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{progress}%</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(project.updatedAt))}
                        </p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-background/90">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <Button asChild variant="outline" className="rounded-full px-4">
                      <Link href={getProjectHref(project)}>{RESUME_COPY}</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="Sem sessões ainda"
              description="O workspace fica mais útil quando há uma sessão para continuar."
              action={
                <Button asChild className="rounded-full">
                  <Link href="/app/sessoes?new=1">Criar primeira sessão</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getProjectHref(project: AppProjectRecord) {
  return `/app/sessoes/${project.id}`;
}

function formatProjectType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString("pt-MZ");
}
