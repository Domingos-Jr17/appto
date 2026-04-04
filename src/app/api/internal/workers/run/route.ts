import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { env } from "@/lib/env";
import { runWorkerPass } from "@/lib/worker-scheduler";

async function isAuthorized(request: NextRequest) {
  const headerSecret = request.headers.get("x-worker-secret");
  if (env.INTERNAL_WORKER_SECRET && headerSecret === env.INTERNAL_WORKER_SECRET) {
    return true;
  }

  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorized(request);
    if (!authorized) {
      return apiError("Não autorizado", 401);
    }

    const results = await runWorkerPass();

    return apiSuccess({ ok: true, ...results });
  } catch (error) {
    return handleApiError(error, "Não foi possível executar os workers.");
  }
}
