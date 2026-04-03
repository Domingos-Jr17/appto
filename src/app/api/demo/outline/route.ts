import { NextRequest } from "next/server";
import { apiError, apiSuccess, parseBody } from "@/lib/api";
import { demoOutlineSchema } from "@/lib/validators";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getAIProvider,
  getFriendlyAIErrorStatus,
  isAIConfigError,
} from "@/lib/ai";
import {
  buildFallbackOutline,
  parseDemoOutlineResponse,
} from "@/lib/demo-outline";

const DEMO_RATE_LIMIT = {
  limit: 5,
  windowMs: 1000 * 60 * 60,
};

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("DemoTimeout")), timeoutMs)
    ),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const { topic } = await parseBody(request, demoOutlineSchema);
    const normalizedTopic = topic.trim();

    try {
        await enforceRateLimit(
          `demo-outline:${getRequestIp(request)}`,
          DEMO_RATE_LIMIT.limit,
          DEMO_RATE_LIMIT.windowMs
      );
    } catch (error) {
      return apiError(
        error instanceof Error ? error.message : "Demasiadas tentativas.",
        429,
        "RATE_LIMITED"
      );
    }

    const prompt = `Gere um sumário académico curto em Português de Moçambique para o tema abaixo.

Tema: ${normalizedTopic}

Responda apenas em JSON válido, sem markdown, sem texto extra, com este formato:
{
  "title": "string",
  "sections": [
    {
      "number": "1",
      "title": "string",
      "subsections": ["string", "string", "string"]
    }
  ],
  "stats": {
    "pages": "string",
    "references": "string",
    "time": "string"
  }
}

Regras:
- 4 a 6 secções
- 2 a 3 subseções por secção
- foco académico realista
- sem prometer RAG, citações verificadas ou fontes locais
- pages deve ser uma estimativa curta, ex: "12-18"
- references deve ser uma sugestão curta, ex: "8-12 fontes para revisão inicial"
- time deve ser uma frase curta de benefício
- não incluir texto fora do JSON`;

    try {
      const provider = await getAIProvider();
      const completion = await withTimeout(
        provider.chatCompletion({
          model: "", // Provider uses its default model
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente de demonstração pública do aptto. Gere outlines académicos curtos, claros e realistas em português de Moçambique.",
            },
            { role: "user", content: prompt },
          ],
        }),
        12000
      );

      const content = completion.choices[0]?.message?.content || "";
      const outline = parseDemoOutlineResponse(content);

      if (!outline) {
        return apiSuccess({
          success: true,
          outline: buildFallbackOutline(normalizedTopic),
          source: "fallback" as const,
        });
      }

      return apiSuccess({
        success: true,
        outline,
        source: "real" as const,
      });
    } catch (error) {
      const status = getFriendlyAIErrorStatus(error);
      const shouldFallback =
        error instanceof Error &&
        (error.message === "DemoTimeout" ||
          isAIConfigError(error) ||
          status === 429 ||
          status >= 500);

      if (shouldFallback) {
        return apiSuccess({
          success: true,
          outline: buildFallbackOutline(normalizedTopic),
          source: "fallback" as const,
        });
      }

      return apiError("Não foi possível gerar o sumário neste momento.", 503, "DEMO_UNAVAILABLE");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Demasiadas tentativas. Tente novamente em instantes.") {
      return apiError(error.message, 429, "RATE_LIMITED");
    }

    return apiError("Pedido inválido", 400, "VALIDATION_ERROR");
  }
}
