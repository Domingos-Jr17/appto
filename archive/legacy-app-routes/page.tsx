"use client";

import * as React from "react";
import Link from "next/link";
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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stat = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  description: string;
};

type Project = {
  id: string;
  title: string;
  type: "monografia" | "artigo" | "tese" | "relatório";
  course: string;
  lastUpdated: string;
  progress: number;
};

function StatsCard({ title, value, icon: Icon, trend, description }: Stat) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{description}</span>
          {trend ? (
            <span className={trend.isPositive ? "text-emerald-600" : "text-rose-600"}>
              {trend.isPositive ? "+" : "-"}
              {trend.value}%
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ title, type, course, lastUpdated, progress }: Project) {
  return (
    <Card className="border-border/50 bg-background/70 transition-colors hover:bg-accent/30">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="line-clamp-2 text-base font-semibold">{title}</CardTitle>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {type}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{course}</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso: {progress}%</span>
          <span>{lastUpdated}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Mock data
const stats = [
  {
    title: "Projectos Activos",
    value: 4,
    icon: FolderKanban,
    trend: { value: 12, isPositive: true },
    description: "1 novo este mês",
  },
  {
    title: "Créditos Disponíveis",
    value: "2,450",
    icon: Coins,
    description: "~50 trabalhos",
  },
  {
    title: "Trabalhos Este Mês",
    value: 8,
    icon: FileText,
    trend: { value: 25, isPositive: true },
    description: "3 em progresso",
  },
  {
    title: "Taxa de Conclusão",
    value: "94%",
    icon: CheckCircle2,
    trend: { value: 4, isPositive: true },
    description: "Acima da média",
  },
];

const recentProjects = [
  {
    id: "1",
    title: "Impacto das Tecnologias Digitais no Ensino Superior Moçambicano",
    type: "monografia" as const,
    course: "Educação - UEM",
    lastUpdated: "há 2 horas",
    progress: 75,
  },
  {
    id: "2",
    title: "Análise de Políticas Públicas de Saúde em Moçambique",
    type: "artigo" as const,
    course: "Saúde Pública - ISCISA",
    lastUpdated: "ontem",
    progress: 45,
  },
  {
    id: "3",
    title: "Desenvolvimento Sustentável e Agricultura Familiar",
    type: "tese" as const,
    course: "Desenvolvimento Rural - UEM",
    lastUpdated: "há 3 dias",
    progress: 30,
  },
  {
    id: "4",
    title: "Relatório de Estágio - Banco de Moçambique",
    type: "relatório" as const,
    course: "Economia - UEM",
    lastUpdated: "há 1 semana",
    progress: 90,
  },
];

const quickActions = [
  {
    title: "Novo Projecto",
    description: "Começar um novo trabalho académico",
    icon: Plus,
    href: "/novo",
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Continuar Trabalho",
    description: "Retomar o último projecto",
    icon: Play,
    href: "/editor",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "Ver Tutoriais",
    description: "Aprender a usar o aptto",
    icon: BookOpen,
    href: "/tutoriais",
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

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Olá, João! 👋
          </h1>
          <p className="text-muted-foreground">
            Aqui está um resumo dos seus projectos académicos.
          </p>
        </div>
        <Button className="w-fit gap-2 gradient-primary text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" />
          Novo Projecto
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
            trend={stat.trend}
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
              <Link href="/projects">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {recentProjects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
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
