import type { AppProjectRecord, CreditTransaction } from "@/lib/app-data";

export interface DashboardSummary {
  activeProjects: number;
  totalWords: number;
  reviewReady: number;
  nextAction: string;
}

export function buildDashboardSummary(projects: AppProjectRecord[]): DashboardSummary {
  const leadProject = projects[0] || null;

  return {
    activeProjects: projects.filter((project) =>
      ["DRAFT", "IN_PROGRESS", "REVIEW"].includes(project.status)
    ).length,
    totalWords: projects.reduce((total, project) => total + project.wordCount, 0),
    reviewReady: projects.reduce((total, project) => total + project.sectionSummary.review, 0),
    nextAction: leadProject
      ? getNextAction(leadProject)
      : "Criar o primeiro trabalho e gerar uma estrutura base.",
  };
}

export function shouldShowLowCreditsNotice(credits: number) {
  return credits < 50;
}

export function getVisibleCreditTransactions(
  transactions: CreditTransaction[],
  expanded: boolean,
  limit = 6
) {
  const orderedTransactions = [...transactions].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return expanded ? orderedTransactions : orderedTransactions.slice(0, limit);
}

function getNextAction(project: AppProjectRecord) {
  if (project.wordCount === 0) return "Gerar outline e aprovar a estrutura inicial.";
  if (project.lastEditedSection) return `Retomar a secção "${project.lastEditedSection.title}".`;
  if (project.sectionSummary.review > 0) return "Rever secções prontas e preparar exportação.";
  return "Abrir o trabalho e continuar a revisão.";
}
