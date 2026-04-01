import { env } from "@/lib/env";
import type { AIProvider, AIChatRequest, AIChatResponse } from "@/lib/ai";
import { AIRequestError } from "@/lib/ai";

const RETRY_DELAYS_MS = [800, 1600, 3200];
const DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4";
const DEFAULT_MODEL = "glm-4.7-flash";

interface ZAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

let configPromise: Promise<ZAIConfig> | null = null;

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

function parseStatusFromMessage(message: string) {
  const match = message.match(/status\s+(\d{3})/i);
  return match ? Number(match[1]) : null;
}

async function loadConfig(): Promise<ZAIConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const apiKey = env.ZAI_API_KEY?.trim();
      const baseUrl = env.ZAI_BASE_URL?.trim();

      if (!apiKey) {
        throw new AIRequestError(
          "Configuration missing. Define ZAI_API_KEY in the environment.",
          "zai"
        );
      }

      return {
        apiKey,
        baseUrl: baseUrl || DEFAULT_BASE_URL,
        model: DEFAULT_MODEL,
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
    thinking:
      body.thinking !== undefined ? body.thinking : { type: "disabled" },
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

  return sanitizedBody;
}

export class ZAIProvider implements AIProvider {
  name = "zai";

  async chatCompletion(body: AIChatRequest): Promise<AIChatResponse> {
    let attempt = 0;

    while (true) {
      try {
        const config = await loadConfig();
        const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Accept-Language": "en-US,en",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sanitizeRequestBody(body, config.model)),
        });

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new AIRequestError(
            `API request failed with status ${response.status}: ${errorMessage}`,
            "zai",
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
