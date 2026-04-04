import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getFriendlyAIErrorMessage, getFriendlyAIErrorStatus } from "@/lib/ai";
import { streamAiRequest } from "@/lib/ai-runtime";
import { isFeatureVisible } from "@/lib/features";
import { logger } from "@/lib/logger";
import { aiRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isFeatureVisible("realTimeStreaming")) {
      return new Response(JSON.stringify({ error: "Streaming em tempo real ainda não está disponível." }), {
        status: 501,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const result = await streamAiRequest({
      userId: session.user.id,
      action: parsed.data.action as never,
      text: parsed.data.text,
      context: parsed.data.context,
      projectId: parsed.data.projectId,
      useCache: parsed.data.useCache,
    });

    return new Response(result.stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Aptto-Package": result.packageKey,
        "X-Aptto-Prompt-Version": result.promptVersion,
        "X-Aptto-Remaining-Works": String(result.remainingWorks),
        "X-Aptto-Cached": String(result.cached),
        "X-Aptto-Warnings": encodeURIComponent(result.warnings.join(" | ")),
      },
    });
  } catch (error) {
    logger.error("AI stream generation error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: getFriendlyAIErrorMessage(error) }),
      {
        status: getFriendlyAIErrorStatus(error),
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
