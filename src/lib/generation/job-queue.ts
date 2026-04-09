import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

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
      step: "A processar em worker persistente",
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

export function triggerQueuedGenerationProcessing(
  processQueued: (limit?: number) => Promise<{ processed: number }>,
) {
  const workerSecret = env.INTERNAL_WORKER_SECRET;

  if (workerSecret) {
    void (async () => {
      try {
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
      } catch (error) {
        logger.warn("[worker] remote generation trigger failed; falling back to local execution", {
          error: error instanceof Error ? error.message : String(error),
        });
        try {
          const result = await processQueued(1);
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
      const result = await processQueued(1);
      logger.info("[worker] local generation processing completed", { processed: result.processed });
    } catch (error) {
      logger.error("[worker] local generation trigger failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}
