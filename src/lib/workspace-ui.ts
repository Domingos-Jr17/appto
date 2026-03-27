import type { AppProjectRecord, CreditTransaction } from "@/lib/app-data";

export const SETTINGS_TABS = [
  {
    value: "perfil",
    label: "Perfil",
    description: "Gira as suas informações pessoais",
  },
  {
    value: "preferencias",
    label: "Preferências",
    description: "Personalize a sua experiência",
  },
  {
    value: "seguranca",
    label: "Segurança",
    description: "Definições de segurança da conta",
  },
  {
    value: "notificacoes",
    label: "Notificações",
    description: "Gira as suas preferências de notificação",
  },
  {
    value: "conta",
    label: "Conta",
    description: "Gestão da conta",
  },
] as const;

export const SETTINGS_TAB_VALUES = SETTINGS_TABS.map((tab) => tab.value) as [
  (typeof SETTINGS_TABS)[number]["value"],
  ...(typeof SETTINGS_TABS)[number]["value"][],
];

export type SettingsTabValue = (typeof SETTINGS_TAB_VALUES)[number];

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
      : "Criar a primeira sessão e gerar um outline base.",
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

export function getActiveSettingsTab(requestedTab: string | null): SettingsTabValue {
  return SETTINGS_TAB_VALUES.find((tab) => tab === requestedTab) || "perfil";
}

function getNextAction(project: AppProjectRecord) {
  if (project.wordCount === 0) return "Gerar outline e aprovar a estrutura inicial.";
  if (project.lastEditedSection) return `Retomar a secção "${project.lastEditedSection.title}".`;
  if (project.sectionSummary.review > 0) return "Rever secções prontas e preparar exportação.";
  return "Abrir a sessão e continuar a escrita.";
}
