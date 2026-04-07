export const WORK_GENERATION_STATUSES = [
  "BRIEFING",
  "GENERATING",
  "READY",
  "NEEDS_REVIEW",
  "FAILED",
] as const;

export type WorkGenerationLifecycleStatus = (typeof WORK_GENERATION_STATUSES)[number];

export type WorkspaceSectionState = "done" | "generating" | "streaming" | "pending";

export interface LiveGenerationSnapshot {
  status: string;
  progress: number;
  step?: string | null;
}

export function normalizeGenerationStatus(status?: string | null): WorkGenerationLifecycleStatus {
  if (status === "GENERATING" || status === "READY" || status === "NEEDS_REVIEW" || status === "FAILED") {
    return status;
  }

  return "BRIEFING";
}

export function isTerminalGenerationStatus(status?: string | null) {
  return status === "READY" || status === "FAILED" || status === "NEEDS_REVIEW";
}

export function normalizeGenerationProgress(status?: string | null, progress?: number | null) {
  const normalizedStatus = normalizeGenerationStatus(status);

  if (normalizedStatus === "READY" || normalizedStatus === "NEEDS_REVIEW" || normalizedStatus === "FAILED") {
    return 100;
  }

  if (normalizedStatus !== "GENERATING") {
    return 0;
  }

  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return 5;
  }

  return Math.max(5, Math.min(99, Math.round(progress)));
}

export function extractActiveSectionTitle(step?: string | null) {
  if (!step) {
    return null;
  }

  const match = step.match(/A gerar\s+(.+)/i);
  return match?.[1]?.trim() || null;
}

export function resolveGenerationSnapshot(input: {
  liveJob?: LiveGenerationSnapshot | null;
  fallbackStatus?: string | null;
}) {
  const status = normalizeGenerationStatus(input.liveJob?.status || input.fallbackStatus);
  const progress = normalizeGenerationProgress(status, input.liveJob?.progress);
  const step = input.liveJob?.step || getDefaultGenerationStep(status);

  return {
    status,
    progress,
    step,
    activeSectionTitle: extractActiveSectionTitle(step),
  };
}

export function getDefaultGenerationStep(status: WorkGenerationLifecycleStatus) {
  switch (status) {
    case "GENERATING":
      return "A preparar geração";
    case "READY":
      return "Trabalho pronto para revisão";
    case "FAILED":
      return "Falha na geração";
    case "NEEDS_REVIEW":
      return "Briefing actualizado - requer revisão";
    default:
      return "Briefing criado";
  }
}

export function resolveWorkspaceSectionState(input: {
  generationStatus?: string | null;
  activeSectionTitle?: string | null;
  hasPersistedContent: boolean;
  title: string;
  hasStreamingContent?: boolean;
}): WorkspaceSectionState {
  if (input.hasPersistedContent) {
    return "done";
  }

  if (input.hasStreamingContent) {
    return "streaming";
  }

  if (normalizeGenerationStatus(input.generationStatus) !== "GENERATING") {
    return "pending";
  }

  if (input.activeSectionTitle && input.activeSectionTitle === input.title) {
    return "generating";
  }

  return "pending";
}

export function createProgressTracker(totalSteps: number, initialProgress = 10) {
  const safeTotalSteps = Math.max(1, totalSteps);
  let completedSteps = 0;
  let currentProgress = initialProgress;

  return {
    getCurrentProgress() {
      return currentProgress;
    },
    advance() {
      completedSteps += 1;
      currentProgress = Math.min(
        99,
        Math.round((completedSteps / safeTotalSteps) * 90) + initialProgress,
      );
      return currentProgress;
    },
  };
}
