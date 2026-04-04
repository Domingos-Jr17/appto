import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";
import { cleanupStoredFileLifecycle } from "@/lib/storage";
import { processQueuedGenerationJobs } from "@/lib/work-generation-jobs";

const WORKER_HEARTBEAT_KEY = "worker:heartbeat";
const MAX_RETRIES = 3;

async function updateHeartbeat() {
  try {
    await db.$executeRaw`
      INSERT INTO product_events (id, name, category, metadata, created_at)
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

async function retryFailedJob(jobId: string, projectId: string, _userId: string) {
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

  await db.generationJob.update({
    where: { id: jobId },
    data: {
      status: "GENERATING",
      step: "Retentativa automática",
      error: null,
      completedAt: null,
      startedAt: new Date(),
    },
  });

  logger.info("[worker] retrying failed generation job", { projectId, jobId, retryCount });
  return true;
}

export async function runWorkerPass() {
  const startedAt = Date.now();
  const results = {
    generation: { processed: 0, retried: 0, errors: 0 },
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
