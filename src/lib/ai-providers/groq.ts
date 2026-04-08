import { env } from "@/lib/env";
import { createTextStreamFromSse } from "@/lib/ai-stream-parser";
import type { AIProvider, AIChatRequest, AIChatResponse } from "@/lib/ai-types";
import { AIRequestError } from "@/lib/ai-types";

const RETRY_DELAYS_MS = [800, 1600, 3200];
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

interface GroqConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

let configPromise: Promise<GroqConfig> | null = null;

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

async function loadConfig(): Promise<GroqConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const apiKey = env.GROQ_API_KEY?.trim();
      const baseUrl = env.GROQ_BASE_URL?.trim();
      const model = env.GROQ_MODEL?.trim();

      if (!apiKey) {
        throw new AIRequestError(
          "Configuration missing. Define GROQ_API_KEY in the environment.",
          "groq"
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

function sanitizeRequestBody(body: AIChatRequest, model: string) {
  const sanitizedBody: Record<string, unknown> = {
    model,
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

  if (typeof body.thinking !== "undefined") {
    sanitizedBody.thinking = body.thinking;
  }

  return sanitizedBody;
}

function shouldRetry(status: number | null): boolean {
  return status === null || status === 429 || status >= 500;
}

export class GroqProvider implements AIProvider {
  name = "groq";

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
          body: JSON.stringify(sanitizeRequestBody(body, config.model)),
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
            "groq",
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

    const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: body.signal,
      body: JSON.stringify({
        ...sanitizeRequestBody(body, config.model),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new AIRequestError(
        `API request failed with status ${response.status}: ${errorMessage}`,
        "groq",
        response.status
      );
    }

    if (!response.body) {
      throw new AIRequestError("Groq não devolveu body para streaming.", "groq", 502);
    }

    return createTextStreamFromSse(response.body, "groq");
  }
}
