import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getFriendlyAIErrorMessage } from "@/lib/ai";
import { processAiRequest } from "@/lib/ai-runtime";
import { getCacheStats } from "@/lib/ai-cache";
import { logger } from "@/lib/logger";
import { aiRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const body = await request.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Dados inválidos", 400, "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const result = await processAiRequest({
      userId: session.user.id,
      action: parsed.data.action as never,
      text: parsed.data.text,
      context: parsed.data.context,
      projectId: parsed.data.projectId,
      useCache: parsed.data.useCache,
    });

    return apiSuccess({
      success: true,
      response: result.response,
      remainingWorks: result.remainingWorks,
      package: result.packageKey,
      promptVersion: result.promptVersion,
      cached: result.cached,
      sources: result.sources,
      warnings: result.warnings,
    });
  } catch (error) {
    logger.error("AI generation error", { error: String(error) });
    return handleApiError(error, getFriendlyAIErrorMessage(error));
  }
}

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return apiError("Não autorizado", 401);
  }

  return apiSuccess(await getCacheStats());
}
