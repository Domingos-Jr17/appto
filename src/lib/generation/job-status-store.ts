import { db } from "@/lib/db";
import { getPersistedGenerationSnapshot } from "@/lib/generation/run-repository";
import { logger } from "@/lib/logger";
import {
  getDefaultGenerationStep,
  normalizeGenerationProgress,
  normalizeGenerationStatus,
} from "@/lib/work-generation-state";

type JobStatus = "GENERATING" | "READY" | "FAILED";

export interface WorkGenerationJobStatus {
  projectId: string;
  status: JobStatus;
  progress: number;
  step: string;
  streamingContent?: string;
  streamingSectionTitle?: string;
  error?: string;
}

const jobStore = globalThis as typeof globalThis & {
  __apptoWorkGenerationJobs?: Map<string, WorkGenerationJobStatus>;
};

const jobs = jobStore.__apptoWorkGenerationJobs ?? new Map<string, WorkGenerationJobStatus>();
jobStore.__apptoWorkGenerationJobs = jobs;

function normalizeJobStatus(status?: string | null): JobStatus {
  const normalized = normalizeGenerationStatus(status);

  if (normalized === "READY" || normalized === "FAILED") {
    return normalized;
  }

  return "GENERATING";
}

async function persistJob(projectId: string, partial: Partial<WorkGenerationJobStatus>, userId?: string) {
  const current = await db.generationJob.findUnique({ where: { projectId } });
  const { streamingContent, streamingSectionTitle, status, progress, step, ...rest } = partial;
  const normalizedStatus = normalizeJobStatus(status || current?.status);
  const dbPartial = {
    ...rest,
    status: normalizedStatus,
    progress: normalizeGenerationProgress(normalizedStatus, progress ?? current?.progress),
    step: step || current?.step || getDefaultGenerationStep(normalizedStatus),
  };

  if (current) {
    await db.generationJob.update({
      where: { projectId },
      data: dbPartial,
    });
  } else if (userId) {
    await db.generationJob.create({
      data: {
        projectId,
        userId,
        status: dbPartial.status || "GENERATING",
        progress: dbPartial.progress || 0,
        step: dbPartial.step,
        error: partial.error,
      },
    });
  }
}

export function getWorkGenerationStatus(projectId: string): WorkGenerationJobStatus | null {
  return jobs.get(projectId) || null;
}

export async function getWorkGenerationStatusAsync(projectId: string): Promise<WorkGenerationJobStatus | null> {
  const inMemory = jobs.get(projectId);
  if (inMemory) return inMemory;

  const dbJob = await getPersistedGenerationSnapshot(projectId);
  if (!dbJob) {
    return null;
  }

  const status = normalizeJobStatus(dbJob.status);
  return {
    projectId,
    status,
    progress: normalizeGenerationProgress(status, dbJob.progress),
    step: dbJob.step || getDefaultGenerationStep(status),
    error: dbJob.error || undefined,
    streamingContent: dbJob.streamingContent || undefined,
    streamingSectionTitle: dbJob.streamingSectionTitle || undefined,
  };
}

export async function batchGetWorkGenerationStatusAsync(projectIds: string[]) {
  const result = new Map<string, WorkGenerationJobStatus>();

  for (const projectId of projectIds) {
    const inMemory = jobs.get(projectId);
    if (inMemory) {
      result.set(projectId, inMemory);
    }
  }

  const missingIds = projectIds.filter((id) => !result.has(id));
  if (missingIds.length > 0) {
    const dbJobs = await db.generationJob.findMany({
      where: { projectId: { in: missingIds } },
      select: { projectId: true, status: true, progress: true, step: true, error: true },
    });

    for (const job of dbJobs) {
      const status = normalizeJobStatus(job.status);
      result.set(job.projectId, {
        projectId: job.projectId,
        status,
        progress: normalizeGenerationProgress(status, job.progress),
        step: job.step || getDefaultGenerationStep(status),
        error: job.error || undefined,
      });
    }
  }

  return result;
}

export function setWorkGenerationJob(projectId: string, partial: Partial<WorkGenerationJobStatus>) {
  const current = jobs.get(projectId) || {
    projectId,
    status: "GENERATING" as JobStatus,
    progress: 0,
    step: getDefaultGenerationStep("GENERATING"),
  };

  const nextStatus = normalizeJobStatus(partial.status || current.status);
  const updated = {
    ...current,
    ...partial,
    status: nextStatus,
    progress: normalizeGenerationProgress(nextStatus, partial.progress ?? current.progress),
    step: partial.step || current.step || getDefaultGenerationStep(nextStatus),
  };
  jobs.set(projectId, updated);

  persistJob(projectId, updated).catch((error) => {
    logger.error("[work-generation] failed to persist in-memory job state", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

export async function setPersistedWorkGenerationJob(
  projectId: string,
  partial: {
    status?: string;
    progress?: number;
    step?: string;
    error?: string | null;
    completedAt?: Date | null;
    startedAt?: Date;
    streamingContent?: string | null;
    streamingSectionTitle?: string | null;
  },
) {
  const { streamingContent, streamingSectionTitle, ...dbPartial } = partial;
  await db.generationJob.update({
    where: { projectId },
    data: dbPartial,
  }).catch(() => null);
}
