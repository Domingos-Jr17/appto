import { timingSafeEqual } from "node:crypto";

import { NextRequest } from "next/server";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { runWorkerPass } from "@/lib/worker-scheduler";

function hasValidWorkerSecret(headerSecret: string | null) {
  if (!env.INTERNAL_WORKER_SECRET || !headerSecret) {
    return false;
  }

  const expected = Buffer.from(env.INTERNAL_WORKER_SECRET);
  const provided = Buffer.from(headerSecret);
  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

function isVercelCron(request: NextRequest) {
  return request.headers.get("user-agent")?.includes("Vercel Cron") ?? false;
}

export async function POST(request: NextRequest) {
  try {
    const isCron = isVercelCron(request);

    // Vercel Cron calls don't need secret validation
    if (!isCron) {
      await enforceRateLimit(`internal-worker:${getClientIp(request) ?? "unknown"}`, 30, 60 * 1000);

      if (!hasValidWorkerSecret(request.headers.get("x-worker-secret"))) {
        return apiError("Não autorizado", 401);
      }
    }

    const results = await runWorkerPass();
    return apiSuccess({ ok: true, ...results });
  } catch (error) {
    logger.error("Internal worker execution failed", { error: String(error) });
    return handleApiError(error, "Não foi possível executar os workers.");
  }
}
