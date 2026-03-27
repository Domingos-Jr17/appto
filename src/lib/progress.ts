import type { AppProjectRecord } from "@/lib/app-data";

export function calculateProjectProgress(project: AppProjectRecord): number {
  if (project.status === "COMPLETED") return 100;

  const totalSections =
    project.sectionSummary.empty +
    project.sectionSummary.started +
    project.sectionSummary.drafting +
    project.sectionSummary.review +
    project.sectionSummary.stale;

  if (totalSections === 0) {
    return project.wordCount > 0 ? 16 : 8;
  }

  const weightedProgress =
    project.sectionSummary.empty * 10 +
    project.sectionSummary.started * 38 +
    project.sectionSummary.drafting * 72 +
    project.sectionSummary.review * 100 +
    project.sectionSummary.stale * 28;

  return Math.max(8, Math.min(100, Math.round(weightedProgress / totalSections)));
}
