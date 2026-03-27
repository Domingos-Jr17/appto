import { describe, expect, test } from "bun:test";
import type { AppProjectRecord, CreditTransaction } from "@/lib/app-data";
import {
  buildDashboardSummary,
  getActiveSettingsTab,
  getVisibleCreditTransactions,
  shouldShowLowCreditsNotice,
} from "@/lib/workspace-ui";

const projects: AppProjectRecord[] = [
  {
    id: "p1",
    title: "Monografia sobre IA",
    type: "MONOGRAPHY",
    description: "Projecto principal",
    status: "IN_PROGRESS",
    wordCount: 1200,
    updatedAt: "2026-03-26T10:00:00.000Z",
    createdAt: "2026-03-20T10:00:00.000Z",
    lastEditedSection: {
      id: "s1",
      title: "Metodologia",
      updatedAt: "2026-03-26T10:00:00.000Z",
    },
    sectionSummary: {
      empty: 1,
      started: 1,
      drafting: 2,
      review: 2,
      stale: 0,
    },
  },
  {
    id: "p2",
    title: "Artigo sobre UX",
    type: "ARTICLE",
    description: null,
    status: "REVIEW",
    wordCount: 800,
    updatedAt: "2026-03-25T10:00:00.000Z",
    createdAt: "2026-03-21T10:00:00.000Z",
    lastEditedSection: null,
    sectionSummary: {
      empty: 0,
      started: 1,
      drafting: 1,
      review: 1,
      stale: 0,
    },
  },
  {
    id: "p3",
    title: "Relatorio final",
    type: "REPORT",
    description: null,
    status: "COMPLETED",
    wordCount: 400,
    updatedAt: "2026-03-24T10:00:00.000Z",
    createdAt: "2026-03-22T10:00:00.000Z",
    lastEditedSection: null,
    sectionSummary: {
      empty: 0,
      started: 0,
      drafting: 0,
      review: 0,
      stale: 0,
    },
  },
];

const transactions: CreditTransaction[] = Array.from({ length: 8 }, (_, index) => ({
  id: `tx-${index + 1}`,
  type: index % 2 === 0 ? "PURCHASE" : "USAGE",
  description: `Transaccao ${index + 1}`,
  amount: index % 2 === 0 ? 100 : -10,
  createdAt: `2026-03-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
}));

describe("workspace ui helpers", () => {
  test("buildDashboardSummary aggregates active work, words, review items, and next action", () => {
    expect(buildDashboardSummary(projects)).toEqual({
      activeProjects: 2,
      totalWords: 2400,
      reviewReady: 3,
      nextAction: 'Retomar a secção "Metodologia".',
    });
  });

  test("falls back to first session creation guidance when there is no lead project", () => {
    expect(buildDashboardSummary([]).nextAction).toBe(
      "Criar a primeira sessão e gerar um outline base."
    );
  });

  test("shows low credit notice only below the threshold", () => {
    expect(shouldShowLowCreditsNotice(49)).toBe(true);
    expect(shouldShowLowCreditsNotice(50)).toBe(false);
  });

  test("limits visible credit transactions until history is expanded", () => {
    const collapsedTransactions = getVisibleCreditTransactions(transactions, false, 6);
    const expandedTransactions = getVisibleCreditTransactions(transactions, true, 6);

    expect(collapsedTransactions).toHaveLength(6);
    expect(collapsedTransactions[0]?.id).toBe("tx-8");
    expect(expandedTransactions).toHaveLength(8);
    expect(expandedTransactions[0]?.id).toBe("tx-8");
  });

  test("keeps only valid settings tabs active", () => {
    expect(getActiveSettingsTab("seguranca")).toBe("seguranca");
    expect(getActiveSettingsTab("invalida")).toBe("perfil");
    expect(getActiveSettingsTab(null)).toBe("perfil");
  });
});
