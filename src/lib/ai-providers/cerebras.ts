import { env } from "@/lib/env";
import { createTextStreamFromSse } from "@/lib/ai-stream-parser";
import type { AIProvider, AIChatRequest, AIChatResponse } from "@/lib/ai-types";
import { AIRequestError } from "@/lib/ai-types";

const RETRY_DELAYS_MS = [800, 1600, 3200];
const DEFAULT_BASE_URL = "https://api.cerebras.ai/v1";
const DEFAULT_MODEL_PRIMARY = "qwen-3-235b-a22b-instruct-2507";
const DEFAULT_MAX_TOKENS = 8000;

function getDefaultTemperature() {
  return env.CEREBRAS_TEMPERATURE ?? 0.7;
}

function getDefaultTopP() {
  return env.CEREBRAS_TOP_P ?? 0.95;
}

interface CerebrasConfig {
  apiKey: string;
  baseUrl: string;
  primaryModel: string;
}

let configPromise: Promise<CerebrasConfig> | null = null;

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

async function loadConfig(): Promise<CerebrasConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const apiKey = env.CEREBRAS_API_KEY?.trim();
      const baseUrl = env.CEREBRAS_BASE_URL?.trim();
      const primaryModel = env.CEREBRAS_MODEL_PRIMARY?.trim();

      if (!apiKey) {
        throw new AIRequestError(
          "Configuration missing. Define CEREBRAS_API_KEY in the environment.",
          "cerebras"
        );
      }

      return {
        apiKey,
        baseUrl: baseUrl || DEFAULT_BASE_URL,
        primaryModel: primaryModel || DEFAULT_MODEL_PRIMARY,
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

function sanitizeRequestBody(body: AIChatRequest, model: string) {
  const sanitizedBody: Record<string, unknown> = {
    model,
    messages: body.messages,
    temperature: body.temperature ?? getDefaultTemperature(),
    top_p: body.top_p ?? getDefaultTopP(),
  };

  if (typeof body.stream === "boolean") {
    sanitizedBody.stream = body.stream;
  }

  if (typeof body.max_tokens === "number" && body.max_tokens > 0) {
    sanitizedBody.max_tokens = Math.min(body.max_tokens, env.DEFAULT_MAX_OUTPUT_TOKENS || DEFAULT_MAX_TOKENS);
  } else {
    sanitizedBody.max_tokens = env.DEFAULT_MAX_OUTPUT_TOKENS || DEFAULT_MAX_TOKENS;
  }

  if (typeof body.thinking !== "undefined") {
    sanitizedBody.thinking = body.thinking;
  }

  return sanitizedBody;
}

function shouldRetry(status: number | null): boolean {
  return status === null || status === 429 || status >= 500;
}

export class CerebrasProvider implements AIProvider {
  name = "cerebras";

  async chatCompletion(body: AIChatRequest): Promise<AIChatResponse> {
    const config = await loadConfig();
    let attempt = 0;

    while (true) {
      try {
        const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: body.signal,
          body: JSON.stringify(sanitizeRequestBody(body, config.primaryModel)),
        });

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          const status = response.status;

          if (shouldRetry(status) && attempt < RETRY_DELAYS_MS.length) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            attempt += 1;
            continue;
          }

          throw new AIRequestError(
            `API request failed with status ${status}: ${errorMessage}`,
            "cerebras",
            status
          );
        }

        return (await response.json()) as AIChatResponse;
      } catch (error) {
        if (error instanceof AIRequestError && shouldRetry(error.status)) {
          if (attempt < RETRY_DELAYS_MS.length) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            attempt += 1;
            continue;
          }
        }

        throw error;
      }
    }
  }

  async streamChatCompletion(body: AIChatRequest): Promise<ReadableStream<Uint8Array>> {
    const config = await loadConfig();
    const model = config.primaryModel;

    const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: body.signal,
      body: JSON.stringify({
        ...sanitizeRequestBody(body, model),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new AIRequestError(
        `API request failed with status ${response.status}: ${errorMessage}`,
        "cerebras",
        response.status
      );
    }

    if (!response.body) {
      throw new AIRequestError("Cerebras não devolveu body para streaming.", "cerebras", 502);
    }

    return createTextStreamFromSse(response.body, "cerebras");
  }
}
