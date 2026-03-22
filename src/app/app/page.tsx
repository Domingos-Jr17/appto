"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Coins,
  FilePenLine,
  FolderKanban,
  LayoutTemplate,
  Loader2,
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
}

interface UserData {
  credits: number;
  usedCredits: number;
  subscription: { plan: string; status: string } | null;
}

type ProjectType =
  | "monografia"
  | "tese"
  | "artigo"
  | "relatório"
  | "dissertação"
  | "ensaio";

const projectTypeLabels: Record<string, ProjectType> = {
  MONOGRAPHY: "monografia",
  DISSERTATION: "dissertação",
  THESIS: "tese",
  ARTICLE: "artigo",
  ESSAY: "ensaio",
  REPORT: "relatório",
};

const templates = [
  {
    title: "Monografia guiada",
    description: "Comece pelo tema, peça outline e passe rapidamente para o documento principal.",
    icon: BookOpen,
  },
  {
    title: "Artigo académico",
    description: "Estrutura mais curta, com secções pequenas e iteração rápida entre conversa e escrita.",
    icon: LayoutTemplate,
  },
  {
    title: "Estrutura livre",
    description: "Crie a árvore manualmente e use a IA apenas como apoio cirúrgico.",
    icon: FilePenLine,
  },
];

export default function WorkspaceHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
          setProjects(Array.isArray(projectsData) ? projectsData : []);
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
  const recentProjects = projects.slice(0, 5).map((project) => ({
    id: project.id,
    title: project.title,
    type: (projectTypeLabels[project.type] || "monografia") as ProjectType,
    course: project.description || "Sem descrição",
    lastUpdated: formatRelativeTime(new Date(project.updatedAt)),
    progress: calculateProgress(project),
    words: project.wordCount,
  }));

  const continueProject = recentProjects[0];
  const inProgressCount = projects.filter((project) =>
    ["DRAFT", "IN_PROGRESS", "REVIEW"].includes(project.status)
  ).length;
  const totalWords = projects.reduce((acc, project) => acc + project.wordCount, 0);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-border/60 bg-background/80 shadow-sm">
          <CardContent className="flex flex-col gap-8 p-6 lg:p-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                Workspace académico
              </Badge>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                  Olá, {firstName}. Continue a escrever sem voltar ao modo dashboard.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  O centro do produto agora é o fluxo entre conversa, documento e estrutura. Retome um projecto,
                  crie um novo trabalho ou use um template para arrancar mais rápido.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="rounded-full px-5">
                <Link href="/app/projects?new=1">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo trabalho
                </Link>
              </Button>
              {continueProject ? (
                <Button asChild variant="outline" className="rounded-full px-5">
                  <Link
                    href={`/app/editor?project=${continueProject.id}&mode=${
                      continueProject.words > 0 ? "document" : "chat"
                    }`}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continuar de onde parou
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Contexto rápido</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl bg-muted/45 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Em curso</p>
              <p className="mt-2 text-2xl font-semibold">{inProgressCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">trabalhos activos</p>
            </div>
            <div className="rounded-2xl bg-muted/45 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Créditos</p>
              <p className="mt-2 text-2xl font-semibold">
                {(userData?.credits || 0).toLocaleString("pt-MZ")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">saldo disponível</p>
            </div>
            <div className="rounded-2xl bg-muted/45 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Texto</p>
              <p className="mt-2 text-2xl font-semibold">{totalWords.toLocaleString("pt-MZ")}</p>
              <p className="mt-1 text-sm text-muted-foreground">palavras acumuladas</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Continuar de onde parou</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Os projectos recentes entram primeiro, com acesso directo ao modo certo.
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
            {recentProjects.length > 0 ? (
              recentProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/app/editor?project=${project.id}&mode=${project.words > 0 ? "document" : "chat"}`}
                  className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/55 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {index === 0 ? "Último aberto" : "Recente"}
                      </span>
                      <Badge variant="secondary" className="rounded-full">
                        {project.type}
                      </Badge>
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold">{project.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.course}</p>
                  </div>

                  <div className="flex min-w-[220px] items-center justify-between gap-4 rounded-2xl bg-background/70 px-4 py-3">
                    <div className="text-sm">
                      <p className="font-medium">{project.progress}%</p>
                      <p className="text-xs text-muted-foreground">{project.lastUpdated}</p>
                    </div>
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border/60 bg-muted/25 p-8 text-center">
                <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-medium">Ainda não há projectos</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Crie o primeiro trabalho e o aptto abre directamente no workspace principal.
                </p>
                <Button asChild className="mt-5 rounded-full">
                  <Link href="/app/projects?new=1">Criar primeiro trabalho</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Templates e atalhos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Entradas rápidas para começar com menos configuração manual.
            </p>
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
              <p className="text-sm font-semibold">Créditos disponíveis</p>
              <p className="mt-2 text-2xl font-semibold">
                {(userData?.credits || 0).toLocaleString("pt-MZ")}
              </p>
              <p className="mt-1 text-sm text-background/75">
                O saldo acompanha o workspace e continua visível no editor e na shell.
              </p>
              <Button asChild variant="secondary" className="mt-4 rounded-full">
                <Link href="/app/credits">
                  <Coins className="mr-2 h-4 w-4" />
                  Gerir créditos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="border-border/60 bg-background/80 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Como o fluxo funciona agora</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Clock3,
                title: "Comece pela conversa",
                description: "Use o modo de conversa para brainstorming, outline e pedidos pontuais à IA.",
              },
              {
                icon: FilePenLine,
                title: "Escreva no documento",
                description: "Passe para o modo documento quando a secção estiver pronta para edição contínua.",
              },
              {
                icon: FolderKanban,
                title: "Organize a estrutura",
                description: "Abra a estrutura para reordenar capítulos, acompanhar progresso e lançar novas secções.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl bg-muted/35 p-5">
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Acesso rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { href: "/app/projects", label: "Abrir biblioteca de projectos" },
              { href: "/app/credits", label: "Ver histórico de créditos" },
              { href: "/app/settings", label: "Rever conta e segurança" },
            ].map((item) => (
              <Button key={item.href} asChild variant="outline" className="h-12 w-full justify-between rounded-2xl">
                <Link href={item.href}>
                  {item.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function calculateProgress(project: Project): number {
  if (project.status === "COMPLETED") return 100;
  if (project.wordCount === 0) return 0;
  const expectedWords = 50 * 250;
  return Math.min(100, Math.round((project.wordCount / expectedWords) * 100));
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
