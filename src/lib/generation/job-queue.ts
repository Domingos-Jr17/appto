import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";

const JOB_RECLAIM_AFTER_MS = 10 * 60_000;

async function claimGenerationJob(projectId: string, startedAt: Date) {
  const result = await db.generationJob.updateMany({
    where: {
      projectId,
      status: "GENERATING",
      completedAt: null,
      startedAt,
    },
    data: {
      progress: 10,
      step: "Worker assumiu a geração",
      startedAt: new Date(),
      error: null,
    },
  });

  return result.count === 1;
}

export async function processQueuedGenerationJobs(
  processProjectGeneration: (projectId: string) => Promise<void>,
  limit = 2,
) {
  const staleCutoff = new Date(Date.now() - JOB_RECLAIM_AFTER_MS);
  const candidates = await db.generationJob.findMany({
    where: {
      status: "GENERATING",
      completedAt: null,
      OR: [
        { step: "Na fila do worker" },
        { step: "A continuar no próximo worker" },
        { startedAt: { lt: staleCutoff } },
      ],
    },
    orderBy: { startedAt: "asc" },
    take: limit,
    select: { projectId: true, startedAt: true },
  });

  let processed = 0;
  for (const candidate of candidates) {
    const claimed = await claimGenerationJob(candidate.projectId, candidate.startedAt);
    if (!claimed) {
      continue;
    }

    processed += 1;
    logger.info("[worker] processing generation job", { projectId: candidate.projectId });
    await processProjectGeneration(candidate.projectId);
  }

  return { processed };
}

async function runLocalProcessing(
  processQueued: (limit?: number) => Promise<{ processed: number }>,
  reason: "FAST_START_LOCAL" | "REMOTE_FALLBACK" | "LOCAL_ONLY",
) {
  const eventName =
    reason === "FAST_START_LOCAL"
      ? "worker_fast_start_local_requested"
      : reason === "REMOTE_FALLBACK"
        ? "worker_remote_trigger_fallback_local_requested"
        : "worker_local_trigger_requested";

  await trackProductEvent({
    name: eventName,
    category: "ops",
    metadata: { reason },
  }).catch(() => null);

  const result = await processQueued(1);

  await trackProductEvent({
    name: "worker_local_trigger_completed",
    category: "ops",
    metadata: {
      reason,
      processed: result.processed,
    },
  }).catch(() => null);

  return result;
}

export function triggerQueuedGenerationProcessing(
  processQueued: (limit?: number) => Promise<{ processed: number }>,
  options?: { fastStartLocal?: boolean },
) {
  const workerSecret = env.INTERNAL_WORKER_SECRET;

  if (workerSecret) {
    if (options?.fastStartLocal) {
      void (async () => {
        try {
          logger.info("[worker] starting local fast-start generation processing");
          const result = await runLocalProcessing(processQueued, "FAST_START_LOCAL");
          logger.info("[worker] local fast-start generation processing completed", {
            processed: result.processed,
          });
        } catch (error) {
          logger.error("[worker] local fast-start generation processing failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }

    void (async () => {
      try {
        await trackProductEvent({
          name: "worker_remote_trigger_requested",
          category: "ops",
        }).catch(() => null);

        const response = await fetch(`${env.APP_URL.replace(/\/$/, "")}/api/internal/workers/run`, {
          method: "POST",
          headers: {
            "x-worker-secret": workerSecret,
          },
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          logger.warn("[worker] remote generation trigger returned error", {
            status: response.status,
            body: body.slice(0, 200),
          });
          throw new Error(`Worker endpoint returned ${response.status}`);
        }

        const data = await response.json().catch(() => null);
        logger.info("[worker] remote generation trigger succeeded", { data });
        await trackProductEvent({
          name: "worker_remote_trigger_succeeded",
          category: "ops",
          metadata: { data },
        }).catch(() => null);
      } catch (error) {
        logger.warn("[worker] remote generation trigger failed; falling back to local execution", {
          error: error instanceof Error ? error.message : String(error),
        });
        await trackProductEvent({
          name: "worker_remote_trigger_failed",
          category: "ops",
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        }).catch(() => null);
        try {
          const result = await runLocalProcessing(processQueued, "REMOTE_FALLBACK");
          logger.info("[worker] fallback local processing completed", { processed: result.processed });
        } catch (fallbackError) {
          logger.error("[worker] fallback local processing also failed", {
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          });
        }
      }
    })();
    return;
  }

  void (async () => {
    try {
      logger.info("[worker] starting local generation processing (no worker secret)");
      const result = await runLocalProcessing(processQueued, "LOCAL_ONLY");
      logger.info("[worker] local generation processing completed", { processed: result.processed });
    } catch (error) {
      logger.error("[worker] local generation trigger failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}
