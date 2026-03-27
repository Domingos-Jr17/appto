"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BookOpen,
  FilePenLine,
  FolderKanban,
  LayoutTemplate,
  Network,
  Plus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useAppWorkspaceData } from "@/components/workspace/AppWorkspaceDataContext";
import type { AppProjectRecord } from "@/lib/app-data";
import { calculateProjectProgress } from "@/lib/progress";

const templates = [
  {
    title: "Monografia guiada",
    description: "Comece no chat, aprove um outline e passe rapidamente para o editor principal.",
    icon: BookOpen,
  },
  {
    title: "Artigo académico",
    description: "Fluxo curto para estrutura compacta, iteração rápida e exportação frequente.",
    icon: LayoutTemplate,
  },
  {
    title: "Estrutura livre",
    description: "Monte o plano manualmente e use a IA apenas como apoio táctico por secção.",
    icon: FilePenLine,
  },
];

const RESUME_COPY = "Abrir sessão";

export default function WorkspaceHomePage() {
  const { data: session, status } = useSession();
  const { projects, isLoading } = useAppWorkspaceData();
  const [showMainFlow, setShowMainFlow] = React.useState(true);

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setShowMainFlow(window.localStorage.getItem("appto:hide-main-flow") !== "1");
  }, []);

  if (isLoading || status === "loading") {
    return <DashboardSkeleton />;
  }

  const firstName = session?.user?.name?.split(" ")[0] || "Estudante";
  const leadProject = projects[0] || null;
  const activeProjects = projects.filter((project) =>
    ["DRAFT", "IN_PROGRESS", "REVIEW"].includes(project.status)
  ).length;
  const reviewReady = projects.reduce((total, project) => total + project.sectionSummary.review, 0);
  const totalWords = projects.reduce((total, project) => total + project.wordCount, 0);
  const shouldShowMainFlow = showMainFlow && projects.length < 3;

  const dismissMainFlow = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("appto:hide-main-flow", "1");
    }
    setShowMainFlow(false);
  };

  return (
    <div className="space-y-8">
      {/* Hero: welcome + resume project */}
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="surface-panel overflow-hidden rounded-xl bg-background/80">
          <CardContent className="flex flex-col gap-8 p-6 lg:p-8">
            <div className="space-y-4">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs">
                  Continuar sessão
                </Badge>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                  {firstName}, entre directamente no próximo passo.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  A área autenticada agora privilegia continuidade: retomar a última sessão,
                  abrir a última secção ou iniciar uma nova sessão sem passar por um dashboard pesado.
                </p>
              </div>
            </div>

            {leadProject ? (
              <div className="surface-muted card-hover rounded-xl p-5 lg:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {RESUME_COPY}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full">
                        {formatProjectType(leadProject.type)}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight">{leadProject.title}</h3>
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

                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild className="rounded-full px-5">
                      <Link href={getProjectHref(leadProject)}>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        {RESUME_COPY}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full px-5">
                      <Link href="/app/sessoes?new=1">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova sessão
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FolderKanban}
                title="Ainda não há sessões"
                description="Crie a primeira sessão e o fluxo principal abre logo em conversa, estrutura ou documento conforme o estado do trabalho."
                className="items-start text-left lg:items-start"
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

        {/* Stats sidebar */}
        <Card className="surface-panel rounded-xl bg-background/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Contexto rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="surface-muted rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Em curso</p>
              <p className="mt-2 text-2xl font-semibold">{activeProjects}</p>
                <p className="mt-1 text-sm text-muted-foreground">sessões activas</p>
            </div>
            <div className="surface-muted rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Palavras</p>
              <p className="mt-2 text-2xl font-semibold">{totalWords.toLocaleString("pt-MZ")}</p>
              <p className="mt-1 text-sm text-muted-foreground">acumuladas</p>
            </div>
            <div className="surface-muted rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prontas</p>
              <p className="mt-2 text-2xl font-semibold">{reviewReady}</p>
              <p className="mt-1 text-sm text-muted-foreground">secções em revisão final</p>
            </div>
            <div className="rounded-xl bg-foreground px-4 py-4 text-background">
              <p className="text-xs uppercase tracking-[0.16em] text-background/70">Próxima acção</p>
              <p className="mt-2 text-sm font-medium">
                {leadProject ? getNextAction(leadProject) : "Criar a primeira sessão e gerar um outline base."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Projects + Fluxo principal */}
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Recent sessions */}
          <Card className="surface-panel rounded-xl bg-background/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Sessões recentes</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Abra cada sessão no modo certo de continuidade.
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
                projects.slice(0, 5).map((project, index) => (
                  <div
                    key={project.id}
                      className="card-hover flex flex-col gap-4 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/55 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {index === 0 ? "Última sessão" : RESUME_COPY}
                        </span>
                        <Badge variant="secondary" className="rounded-full">
                          {formatProjectType(project.type)}
                        </Badge>
                      </div>
                      <h3 className="mt-2 truncate text-base font-semibold">{project.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {project.lastEditedSection
                          ? `Última secção: ${project.lastEditedSection.title}`
                          : "Sem secção iniciada ainda."}
                      </p>
                    </div>

                    <div className="flex min-w-[240px] items-center justify-between gap-4 rounded-2xl bg-background/70 px-4 py-3">
                      <div className="text-sm">
                         <p className="font-medium">{calculateProjectProgress(project)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(project.updatedAt))}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={getProjectHref(project)}
                          className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
                        >
                          Abrir sessão
                        </Link>
                        <div className="h-2 w-24 rounded-full bg-muted">
                           <div className="h-full rounded-full bg-primary" style={{ width: `${calculateProjectProgress(project)}%` }} />
                         </div>
                       </div>
                     </div>
                   </div>
                ))
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

          {shouldShowMainFlow ? (
            <Card className="surface-panel rounded-xl bg-background/80">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-lg">Fluxo principal</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Um guia rápido para a primeira sessão ou para retomar o método de trabalho.
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={dismissMainFlow}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  {
                    icon: LayoutTemplate,
                    title: "Conversar",
                    description: "Use o chat como ponto de partida para outline, ideias e decisões.",
                  },
                  {
                    icon: Network,
                    title: "Estruturar",
                    description: "Reordene capítulos, subtítulos e acompanhe o estado editorial.",
                  },
                  {
                    icon: FilePenLine,
                    title: "Escrever",
                    description: "Passe ao documento quando houver uma secção clara para desenvolver.",
                  },
                ].map((item) => (
                  <div key={item.title} className="surface-muted rounded-xl p-4">
                    <div className="w-fit rounded-xl bg-primary/10 p-2.5">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Templates */}
        <div className="space-y-5">
          <Card className="surface-panel rounded-xl bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Templates e atalhos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <Link
                  key={template.title}
                  href="/app/sessoes?new=1"
                  className="card-hover block rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/55"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-fit rounded-xl bg-primary/10 p-2.5">
                      <template.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{template.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function getProjectHref(project: AppProjectRecord) {
  return `/app/sessoes/${project.id}`;
}
function getNextAction(project: AppProjectRecord) {
  if (project.wordCount === 0) return "Gerar outline e aprovar a estrutura inicial.";
  if (project.lastEditedSection) return `Retomar a secção "${project.lastEditedSection.title}".`;
  if (project.sectionSummary.review > 0) return "Rever secções prontas e preparar exportação.";
  return "Abrir a sessão e continuar a escrita.";
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
