"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Coins,
  FilePenLine,
  FolderKanban,
  LayoutTemplate,
  Loader2,
  Network,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Project {
  id: string;
  title: string;
  type: string;
  description: string | null;
  status: string;
  wordCount: number;
  updatedAt: string;
  resumeMode: "chat" | "document" | "structure";
  lastEditedSection: {
    id: string;
    title: string;
    updatedAt: string;
  } | null;
  sectionSummary: {
    empty: number;
    started: number;
    drafting: number;
    review: number;
    stale: number;
  };
}

interface UserData {
  credits: number;
  usedCredits: number;
  subscription: { plan: string; status: string } | null;
}

const templates = [
  {
    title: "Monografia guiada",
    description: "Comece no chat, aprove um outline e passe rapidamente para o editor principal.",
    icon: BookOpen,
  },
  {
    title: "Artigo academico",
    description: "Fluxo curto para estrutura compacta, iteracao rapida e exportacao frequente.",
    icon: LayoutTemplate,
  },
  {
    title: "Estrutura livre",
    description: "Monte o plano manualmente e use a IA apenas como apoio tactico por secao.",
    icon: FilePenLine,
  },
];

const RESUME_COPY: Record<Project["resumeMode"], string> = {
  chat: "Retomar no chat",
  document: "Abrir documento",
  structure: "Ver estrutura",
};

export default function WorkspaceHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [userData, setUserData] = React.useState<UserData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      Promise.all([
        fetch("/api/projects").then((response) => response.json()),
        fetch("/api/user").then((response) => response.json()),
      ])
        .then(([projectsData, user]) => {
          const normalizedProjects = Array.isArray(projectsData) ? projectsData : [];
          normalizedProjects.sort(
            (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
          );
          setProjects(normalizedProjects);
          setUserData(user);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [router, status]);

  if (isLoading || status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] || "Estudante";
  const leadProject = projects[0] || null;
  const activeProjects = projects.filter((project) =>
    ["DRAFT", "IN_PROGRESS", "REVIEW"].includes(project.status)
  ).length;
  const reviewReady = projects.reduce((total, project) => total + project.sectionSummary.review, 0);
  const totalWords = projects.reduce((total, project) => total + project.wordCount, 0);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-border/60 bg-background/80 shadow-sm">
          <CardContent className="flex flex-col gap-8 p-6 lg:p-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs">
                Continuar trabalho
              </Badge>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                  {firstName}, entre directamente no proximo passo.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  A area autenticada agora privilegia continuidade: retomar o ultimo projecto,
                  abrir a ultima secao ou iniciar um novo trabalho sem passar por um dashboard pesado.
                </p>
              </div>
            </div>

            {leadProject ? (
              <div className="rounded-[32px] border border-border/60 bg-muted/25 p-5 lg:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {RESUME_COPY[leadProject.resumeMode]}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full">
                        {formatProjectType(leadProject.type)}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight">{leadProject.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {leadProject.description || "Sem descricao."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{leadProject.wordCount.toLocaleString("pt-MZ")} palavras</span>
                      <span>·</span>
                      <span>{formatRelativeTime(new Date(leadProject.updatedAt))}</span>
                      {leadProject.lastEditedSection ? (
                        <>
                          <span>·</span>
                          <span>Ultima secao: {leadProject.lastEditedSection.title}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild className="rounded-full px-5">
                      <Link href={getProjectHref(leadProject)}>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        {RESUME_COPY[leadProject.resumeMode]}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full px-5">
                      <Link href="/app/projects?new=1">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo trabalho
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] border border-dashed border-border/60 bg-muted/20 p-6 lg:p-8">
                <div className="max-w-2xl space-y-4">
                  <h3 className="text-2xl font-semibold tracking-tight">Ainda nao ha projectos</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Crie o primeiro trabalho e o fluxo principal abre logo em conversa, estrutura ou documento conforme o estado do projecto.
                  </p>
                  <Button asChild className="rounded-full px-5">
                    <Link href="/app/projects?new=1">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeiro trabalho
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Contexto rapido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-muted/45 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Em curso</p>
              <p className="mt-2 text-2xl font-semibold">{activeProjects}</p>
              <p className="mt-1 text-sm text-muted-foreground">trabalhos activos</p>
            </div>
            <div className="rounded-2xl bg-muted/45 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Creditos</p>
              <p className="mt-2 text-2xl font-semibold">
                {(userData?.credits || 0).toLocaleString("pt-MZ")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">saldo disponivel</p>
            </div>
            <div className="rounded-2xl bg-muted/45 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prontas</p>
              <p className="mt-2 text-2xl font-semibold">{reviewReady}</p>
              <p className="mt-1 text-sm text-muted-foreground">seccoes em revisao final</p>
            </div>
            <div className="rounded-2xl bg-foreground px-4 py-4 text-background">
              <p className="text-xs uppercase tracking-[0.16em] text-background/70">Proxima accao</p>
              <p className="mt-2 text-sm font-medium">
                {leadProject ? getNextAction(leadProject) : "Criar o primeiro projecto e gerar um outline base."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Projectos recentes</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                A lista ja abre cada projecto no modo certo de continuidade.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="rounded-full">
              <Link href="/app/projects">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length > 0 ? (
              projects.slice(0, 5).map((project, index) => (
                <Link
                  key={project.id}
                  href={getProjectHref(project)}
                  className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/55 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {index === 0 ? "Ultimo aberto" : RESUME_COPY[project.resumeMode]}
                      </span>
                      <Badge variant="secondary" className="rounded-full">
                        {formatProjectType(project.type)}
                      </Badge>
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold">{project.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {project.lastEditedSection
                        ? `Ultima secao: ${project.lastEditedSection.title}`
                        : "Sem secao iniciada ainda."}
                    </p>
                  </div>

                  <div className="flex min-w-[240px] items-center justify-between gap-4 rounded-2xl bg-background/70 px-4 py-3">
                    <div className="text-sm">
                      <p className="font-medium">{getProgress(project)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(project.updatedAt))}
                      </p>
                    </div>
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${getProgress(project)}%` }} />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border/60 bg-muted/25 p-8 text-center">
                <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-medium">Sem projectos ainda</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  O workspace fica mais util quando ha um projecto para continuar. Pode criar um agora ou usar um template de arranque.
                </p>
                <Button asChild className="mt-5 rounded-full">
                  <Link href="/app/projects?new=1">Criar primeiro trabalho</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Fluxo principal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                {
                  icon: LayoutTemplate,
                  title: "Conversar",
                  description: "Use o chat como ponto de partida para outline, ideias e decisoes.",
                },
                {
                  icon: Network,
                  title: "Estruturar",
                  description: "Reordene capitulos, subtitulos e acompanhe o estado editorial.",
                },
                {
                  icon: FilePenLine,
                  title: "Escrever",
                  description: "Passe ao documento quando houver uma secao clara para desenvolver.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl bg-muted/35 p-4">
                  <div className="w-fit rounded-2xl bg-primary/10 p-2.5">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Templates e atalhos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <Link
                  key={template.title}
                  href="/app/projects?new=1"
                  className="block rounded-3xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/55"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-fit rounded-2xl bg-primary/10 p-2.5">
                      <template.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{template.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                </Link>
              ))}

              <div className="rounded-3xl border border-border/50 bg-foreground px-5 py-4 text-background">
                <p className="text-sm font-semibold">Palavras acumuladas</p>
                <p className="mt-2 text-2xl font-semibold">{totalWords.toLocaleString("pt-MZ")}</p>
                <p className="mt-1 text-sm text-background/75">
                  O progresso total do workspace continua visivel sem dominar a pagina inicial.
                </p>
                <Button asChild variant="secondary" className="mt-4 rounded-full">
                  <Link href="/app/credits">
                    <Coins className="mr-2 h-4 w-4" />
                    Gerir creditos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function getProjectHref(project: Project) {
  const mode = project.resumeMode;
  const qs = mode && mode !== "document" ? `?mode=${mode}` : "";
  return `/app/projects/${project.id}${qs}`;
}

function getProgress(project: Project): number {
  if (project.status === "COMPLETED") return 100;

  const total =
    project.sectionSummary.empty +
    project.sectionSummary.started +
    project.sectionSummary.drafting +
    project.sectionSummary.review +
    project.sectionSummary.stale;

  if (total === 0) return project.wordCount > 0 ? 16 : 8;

  const weighted =
    project.sectionSummary.empty * 10 +
    project.sectionSummary.started * 38 +
    project.sectionSummary.drafting * 72 +
    project.sectionSummary.review * 100 +
    project.sectionSummary.stale * 28;

  return Math.max(8, Math.min(100, Math.round(weighted / total)));
}

function getNextAction(project: Project) {
  if (project.wordCount === 0) return "Gerar outline e aprovar a estrutura inicial.";
  if (project.lastEditedSection) return `Retomar a secao "${project.lastEditedSection.title}".`;
  if (project.sectionSummary.review > 0) return "Rever secoes prontas e preparar exportacao.";
  return "Abrir o projecto e continuar a escrita.";
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
  if (diffMins < 60) return `ha ${diffMins} min`;
  if (diffHours < 24) return `ha ${diffHours}h`;
  if (diffDays < 7) return `ha ${diffDays} dias`;
  return date.toLocaleDateString("pt-MZ");
}
