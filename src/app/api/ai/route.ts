import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getFriendlyAIErrorMessage, getFriendlyAIErrorStatus } from "@/lib/ai";
import { processAiRequest } from "@/lib/ai-runtime";
import { getCacheStats } from "@/lib/ai-cache";
import { logger } from "@/lib/logger";
import { aiRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await processAiRequest({
      userId: session.user.id,
      action: parsed.data.action as never,
      text: parsed.data.text,
      context: parsed.data.context,
      projectId: parsed.data.projectId,
      useCache: parsed.data.useCache,
    });

    return NextResponse.json({
      success: true,
      response: result.response,
      remainingWorks: result.remainingWorks,
      package: result.packageKey,
      promptVersion: result.promptVersion,
      cached: result.cached,
      sources: result.sources,
    });
  } catch (error) {
    logger.error("AI generation error", { error: String(error) });
    return NextResponse.json(
      { error: getFriendlyAIErrorMessage(error) },
      { status: getFriendlyAIErrorStatus(error) },
    );
  }
}

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return NextResponse.json(getCacheStats());
}
