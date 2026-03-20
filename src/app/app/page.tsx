"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Coins,
  FileText,
  CheckCircle2,
  Plus,
  Play,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

interface Project {
  id: string;
  title: string;
  type: string;
  description: string | null;
  status: string;
  wordCount: number;
  updatedAt: string;
  sections?: { id: string }[];
}

interface UserData {
  credits: number;
  usedCredits: number;
  subscription: { plan: string; status: string } | null;
}

const quickActions = [
  {
    title: "Novo Projecto",
    description: "Começar um novo trabalho académico",
    icon: Plus,
    href: "/app/projects",
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Continuar Trabalho",
    description: "Retomar o último projecto",
    icon: Play,
    href: "/app/editor",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "Ver Tutoriais",
    description: "Aprender a usar o aptto",
    icon: BookOpen,
    href: "#",
    color: "bg-sky-500/10 text-sky-500",
  },
];

const recommendations = [
  {
    title: "Estruture a sua monografia",
    description: "Use o assistente de estrutura para organizar os capítulos do seu trabalho.",
    action: "Começar",
  },
  {
    title: "Reveja as normas ABNT",
    description: "Temos um guia completo das normas ABNT para referências e formatação.",
    action: "Ver guia",
  },
  {
    title: "Melhore o seu português académico",
    description: "Sugestões de estilo e vocabulário para textos académicos.",
    action: "Explorar",
  },
];

type ProjectType = "monografia" | "tese" | "artigo" | "relatório" | "dissertação" | "ensaio";

const projectTypeLabels: Record<string, ProjectType> = {
  MONOGRAPHY: "monografia",
  DISSERTATION: "dissertação",
  THESIS: "tese",
  ARTICLE: "artigo",
  ESSAY: "ensaio",
  REPORT: "relatório",
};

export default function DashboardPage() {
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
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/user").then((r) => r.json()),
      ])
        .then(([projectsData, user]) => {
          setProjects(projectsData || []);
          setUserData(user);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [status, router]);

  if (isLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || "Estudante";

  // Calculate stats
  const activeProjects = projects.filter((p) => 
    p.status === "IN_PROGRESS" || p.status === "DRAFT"
  ).length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const completionRate = projects.length > 0 
    ? Math.round((completedProjects / projects.length) * 100) 
    : 0;
  const totalWords = projects.reduce((acc, p) => acc + p.wordCount, 0);

  const stats = [
    {
      title: "Projectos Activos",
      value: activeProjects,
      icon: FolderKanban,
      description: projects.length > 0 ? `${projects.length} total` : "Nenhum projeto",
    },
    {
      title: "Créditos Disponíveis",
      value: (userData?.credits || 0).toLocaleString(),
      icon: Coins,
      description: `~${Math.floor((userData?.credits || 0) / 50)} trabalhos`,
    },
    {
      title: "Palavras Escritas",
      value: totalWords.toLocaleString(),
      icon: FileText,
      description: `${Math.floor(totalWords / 250)} páginas`,
    },
    {
      title: "Taxa de Conclusão",
      value: `${completionRate}%`,
      icon: CheckCircle2,
      description: completedProjects > 0 ? `${completedProjects} concluídos` : "Sem projetos concluídos",
    },
  ];

  // Get recent projects (last 4)
  const recentProjects = projects.slice(0, 4).map((project) => ({
    id: project.id,
    title: project.title,
    type: (projectTypeLabels[project.type] || "monografia") as ProjectType,
    course: project.description || "Sem descrição",
    lastUpdated: formatRelativeTime(new Date(project.updatedAt)),
    progress: calculateProgress(project),
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Aqui está um resumo dos seus projectos académicos.
          </p>
        </div>
        <Button className="w-fit gap-2 gradient-primary text-primary-foreground hover:opacity-90" asChild>
          <Link href="/app/projects">
            <Plus className="h-4 w-4" />
            Novo Projecto
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Projects */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">
              Projectos Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/app/projects">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <ProjectCard key={project.id} {...project} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum projeto ainda</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Comece criando o seu primeiro projecto académico
                </p>
                <Button asChild>
                  <Link href="/app/projects">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Projecto
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">
                Acções Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-lg p-3 transition-all hover:bg-accent/50"
                >
                  <div className={`rounded-lg p-2 ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-primary" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="group flex items-start gap-3 rounded-lg p-3 transition-all hover:bg-accent/50"
                >
                  <div className="rounded-full bg-primary/10 p-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {rec.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                  >
                    {rec.action}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  return date.toLocaleDateString("pt-MZ");
}

function calculateProgress(project: Project): number {
  if (project.status === "COMPLETED") return 100;
  if (!project.sections || project.sections.length === 0) return 0;
  
  // Calculate based on word count (assume 250 words per page, 50 pages average thesis)
  const expectedWords = 50 * 250;
  return Math.min(100, Math.round((project.wordCount / expectedWords) * 100));
}
