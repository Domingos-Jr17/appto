import { db } from "@/lib/db";
import { isTransientGenerationFailure } from "@/lib/generation/run-domain";
import {
  createGenerationRetryAttempt,
  updateGenerationAttemptState,
  updateGenerationRunState,
} from "@/lib/generation/run-repository";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";
import { cleanupStoredFileLifecycle } from "@/lib/storage";
import { processQueuedGenerationJobs } from "@/lib/work-generation-jobs";
import { subscriptionService } from "@/lib/subscription";

const WORKER_HEARTBEAT_KEY = "worker:heartbeat";
const MAX_RETRIES = 3;
const STALE_JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

async function updateHeartbeat() {
  try {
    await db.$executeRaw`
      INSERT INTO product_events (id, name, category, metadata, "createdAt")
      VALUES (${crypto.randomUUID()}, ${WORKER_HEARTBEAT_KEY}, 'ops', ${JSON.stringify({ ts: Date.now() })}::jsonb, NOW())
    `;
  } catch (error) {
    logger.warn("[worker] heartbeat failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getFailedJobsForRetry(limit = 5) {
  const retryCutoff = new Date(Date.now() - 5 * 60 * 1000);

  return db.generationJob.findMany({
    where: {
      status: "FAILED",
      completedAt: { gt: retryCutoff },
      OR: [
        { error: { contains: "timeout", mode: "insensitive" } },
        { error: { contains: "rate limit", mode: "insensitive" } },
        { error: { contains: "502", mode: "insensitive" } },
        { error: { contains: "503", mode: "insensitive" } },
        { error: { contains: "504", mode: "insensitive" } },
      ],
    },
    take: limit,
    select: {
      id: true,
      projectId: true,
      userId: true,
      error: true,
      startedAt: true,
    },
  });
}

async function retryFailedJob(jobId: string, projectId: string, userId: string) {
  const currentJob = await db.generationJob.findUnique({
    where: { id: jobId },
    select: { error: true, currentRunId: true },
  });

  if (!currentJob?.currentRunId || !isTransientGenerationFailure(currentJob.error)) {
    return false;
  }

  const retryCount = await db.generationJob.count({
    where: {
      projectId,
      status: "GENERATING",
      startedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (retryCount >= MAX_RETRIES) {
    logger.warn("[worker] max retries reached for project", { projectId, retryCount });
    return false;
  }

  const retryAttempt = await createGenerationRetryAttempt({
    runId: currentJob.currentRunId,
    userId,
    trigger: "AUTO_RETRY",
  });

  await db.generationJob.update({
    where: { id: jobId },
    data: {
      currentRunId: currentJob.currentRunId,
      status: "GENERATING",
      step: "Retentativa automática",
      error: null,
      completedAt: null,
      startedAt: new Date(),
    },
  });

  await Promise.all([
    updateGenerationRunState(currentJob.currentRunId, {
      status: "QUEUED",
      progress: 5,
      step: `Retentativa automática #${retryAttempt.attemptNumber}`,
      error: null,
      completedAt: null,
      activeSectionKey: null,
    }),
    updateGenerationAttemptState(retryAttempt.attemptId, {
      status: "QUEUED",
      trigger: "AUTO_RETRY",
      error: null,
      completedAt: null,
    }),
  ]);

  logger.info("[worker] retrying failed generation job", { projectId, jobId, retryCount });
  return true;
}

export async function runWorkerPass() {
  const startedAt = Date.now();
  const results = {
    generation: { processed: 0, retried: 0, errors: 0, staleMarkedFailed: 0 },
    storage: { pendingMarkedFailed: 0, removedFailed: 0, removedDeleted: 0 },
    heartbeat: false,
    durationMs: 0,
  };

  try {
    const generation = await processQueuedGenerationJobs(3);
    results.generation.processed = generation.processed;
  } catch (error) {
    logger.error("[worker] generation processing failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    results.generation.errors += 1;
  }

  // Mark stale jobs as FAILED (jobs stuck in GENERATING for > 15 minutes)
  try {
    const staleCutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);
    const staleJobs = await db.generationJob.findMany({
      where: {
        status: "GENERATING",
        startedAt: { lt: staleCutoff },
        completedAt: null,
      },
      select: { id: true, projectId: true, userId: true, step: true, startedAt: true },
    });

    for (const job of staleJobs) {
      logger.warn("[worker] marking stale job as FAILED", {
        projectId: job.projectId,
        step: job.step,
        startedAt: job.startedAt,
      });

      await db.generationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          step: "Job timed out — marked as stale by worker",
          error: `Stale worker lease expired after ${STALE_JOB_TIMEOUT_MS / 60000} minutes`,
          completedAt: new Date(),
        },
      });

      const runId = await db.generationJob.findUnique({
        where: { id: job.id },
        select: { currentRunId: true },
      }).then((record) => record?.currentRunId ?? null);

      if (runId) {
        const run = await db.generationRun.findUnique({
          where: { id: runId },
          select: { currentAttemptId: true },
        });

        await updateGenerationRunState(runId, {
          status: "FAILED",
          progress: 100,
          step: "Job timed out — marked as stale by worker",
          error: `Stale worker lease expired after ${STALE_JOB_TIMEOUT_MS / 60000} minutes`,
          completedAt: new Date(),
          activeSectionKey: null,
        }).catch(() => null);

        if (run?.currentAttemptId) {
          await updateGenerationAttemptState(run.currentAttemptId, {
            status: "FAILED",
            error: `Stale worker lease expired after ${STALE_JOB_TIMEOUT_MS / 60000} minutes`,
            completedAt: new Date(),
          }).catch(() => null);
        }
      }

      await db.projectBrief.update({
        where: { projectId: job.projectId },
        data: { generationStatus: "FAILED" },
      });

      await subscriptionService.refundWork(job.userId).catch(() => null);

      results.generation.staleMarkedFailed += 1;
    }

    if (staleJobs.length > 0) {
      logger.info("[worker] marked stale jobs as FAILED", { count: staleJobs.length });
    }
  } catch (error) {
    logger.error("[worker] stale job cleanup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const failedJobs = await getFailedJobsForRetry();
    for (const job of failedJobs) {
      const retried = await retryFailedJob(job.id, job.projectId, job.userId);
      if (retried) {
        results.generation.retried += 1;
      }
    }
  } catch (error) {
    logger.error("[worker] retry processing failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const storage = await cleanupStoredFileLifecycle();
    results.storage = { ...results.storage, ...storage };
  } catch (error) {
    logger.error("[worker] storage cleanup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await updateHeartbeat();
    results.heartbeat = true;
  } catch (error) {
    logger.error("[worker] heartbeat update failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  results.durationMs = Date.now() - startedAt;

  await trackProductEvent({
    name: "worker_pass_completed",
    category: "ops",
    metadata: results,
  }).catch(() => null);

  logger.info("[worker] pass completed", results);
  return results;
}
