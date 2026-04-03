import type { ProjectBrief } from "@/types/editor";

export interface AppProjectRecord {
  id: string;
  title: string;
  type: string;
  description: string | null;
  status: string;
  generationStatus?: "BRIEFING" | "GENERATING" | "READY" | "NEEDS_REVIEW" | "FAILED";
  generationProgress?: number;
  generationStep?: string | null;
  wordCount: number;
  updatedAt: string;
  createdAt: string;
  resumeMode?: "chat" | "document" | "structure";
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
  brief?: ProjectBrief | null;
}

export interface CreditTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  createdAt: string;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || fallbackMessage);
  }

  return data;
}

export function sortProjectsByUpdatedAt<T extends { updatedAt: string }>(projects: T[]) {
  return [...projects].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export async function fetchAppProjects(search = "") {
  const suffix = search ? `?${search}` : "";
  const response = await fetch(`/api/projects${suffix}`);
  const data = await readJson<AppProjectRecord[]>(response, "Não foi possível carregar os projectos.");
  return Array.isArray(data) ? data : [];
}

export async function fetchCreditsBalance() {
  const response = await fetch("/api/credits");
  const data = await readJson<{ balance?: number }>(response, "Não foi possível carregar o saldo de créditos.");
  return data.balance || 0;
}
