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
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  // See: https://vercel.com/docs/cron-jobs# securing-cron-jobs
  const authHeader = request.headers.get("Authorization");
  const cronSecret = env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Fallback: also accept if no CRON_SECRET is set (Vercel auto-injects it)
  // and the request comes from Vercel's internal infrastructure
  const vercelRequestId = request.headers.get("x-vercel-id");
  if (!cronSecret && vercelRequestId) {
    return true;
  }

  return false;
}

async function handleWorkerRequest(request: NextRequest) {
  try {
    const isCron = isVercelCron(request);

    // Vercel Cron calls skip rate limiting and use CRON_SECRET validation
    // Manual calls require INTERNAL_WORKER_SECRET
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

export async function POST(request: NextRequest) {
  return handleWorkerRequest(request);
}

export async function GET(request: NextRequest) {
  return handleWorkerRequest(request);
}
