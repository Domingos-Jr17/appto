import { env } from "@/lib/env";
import type { AIProvider, AIChatRequest, AIChatResponse } from "@/lib/ai-types";
import { AIRequestError } from "@/lib/ai-types";

const RETRY_DELAYS_MS = [800, 1600, 3200];
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "qwen/qwen3.6-plus-preview:free";

interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

let configPromise: Promise<OpenRouterConfig> | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);

  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

function _parseStatusFromMessage(message: string) {
  const match = message.match(/status\s+(\d{3})/i);
  return match ? Number(match[1]) : null;
}

async function loadConfig(): Promise<OpenRouterConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const apiKey = env.OPENROUTER_API_KEY?.trim();
      const baseUrl = env.OPENROUTER_BASE_URL?.trim();
      const model = env.OPENROUTER_MODEL?.trim();

      if (!apiKey) {
        throw new AIRequestError(
          "Configuration missing. Define OPENROUTER_API_KEY in the environment.",
          "openrouter"
        );
      }

      return {
        apiKey,
        baseUrl: baseUrl || DEFAULT_BASE_URL,
        model: model || DEFAULT_MODEL,
      };
    })().catch((error) => {
      configPromise = null;
      throw error;
    });
  }

  return configPromise;
}

async function parseErrorResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(responseText) as {
        error?: { message?: string } | string;
        message?: string;
      };

      if (typeof parsed.error === "string" && parsed.error) {
        return parsed.error;
      }

      if (parsed.error && typeof parsed.error === "object" && parsed.error.message) {
        return parsed.error.message;
      }

      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      return responseText;
    }
  }

  return responseText;
}

function sanitizeRequestBody(body: AIChatRequest, defaultModel: string) {
  const sanitizedBody: Record<string, unknown> = {
    model: body.model || defaultModel,
    messages: body.messages,
  };

  if (typeof body.stream === "boolean") {
    sanitizedBody.stream = body.stream;
  }

  if (typeof body.temperature === "number") {
    sanitizedBody.temperature = body.temperature;
  }

  if (typeof body.max_tokens === "number") {
    sanitizedBody.max_tokens = body.max_tokens;
  }

  if (typeof body.top_p === "number") {
    sanitizedBody.top_p = body.top_p;
  }

  // OpenRouter doesn't support the 'thinking' field from Z.AI
  // We intentionally omit it

  return sanitizedBody;
}

export class OpenRouterProvider implements AIProvider {
  name = "openrouter";

  async chatCompletion(body: AIChatRequest): Promise<AIChatResponse> {
    let attempt = 0;

    while (true) {
      try {
        const config = await loadConfig();
        const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aptto.mz",
            "X-Title": "aptto",
          },
          body: JSON.stringify(sanitizeRequestBody(body, config.model)),
        });

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new AIRequestError(
            `API request failed with status ${response.status}: ${errorMessage}`,
            "openrouter",
            response.status
          );
        }

        return (await response.json()) as AIChatResponse;
      } catch (error) {
        const status = error instanceof AIRequestError ? error.status : null;

        if (status === 429 && attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          attempt += 1;
          continue;
        }

        throw error;
      }
    }
  }
}
