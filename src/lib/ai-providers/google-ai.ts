import { env } from "@/lib/env";
import type { AIProvider, AIChatRequest, AIChatResponse } from "@/lib/ai-types";
import { AIRequestError } from "@/lib/ai-types";

const RETRY_DELAYS_MS = [800, 1600, 3200];
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

interface GoogleAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

let configPromise: Promise<GoogleAIConfig> | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function getGenerateUrl(baseUrl: string, model: string, stream: boolean) {
  const normalized = normalizeBaseUrl(baseUrl);
  const method = stream ? "streamGenerateContent" : "generateContent";
  return `${normalized}/models/${model}:${method}?key=`;
}

async function loadConfig(): Promise<GoogleAIConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const apiKey = env.GOOGLE_AI_API_KEY?.trim();
      const baseUrl = env.GOOGLE_AI_BASE_URL?.trim();
      const model = env.GOOGLE_AI_MODEL?.trim();

      if (!apiKey) {
        throw new AIRequestError(
          "Configuration missing. Define GOOGLE_AI_API_KEY in the environment.",
          "google-ai"
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

function convertMessagesToGoogleFormat(messages: AIChatRequest["messages"]) {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      // Google uses systemInstruction instead of system role
      continue;
    }

    const role = message.role === "assistant" ? "model" : "user";
    contents.push({
      role,
      parts: [{ text: message.content }],
    });
  }

  return contents;
}

function getSystemInstruction(messages: AIChatRequest["messages"]) {
  const systemMessage = messages.find((m) => m.role === "system");
  if (systemMessage) {
    return { parts: [{ text: systemMessage.content }] };
  }
  return undefined;
}

function sanitizeRequestBody(body: AIChatRequest, defaultModel: string) {
  const model = body.model || defaultModel;
  const contents = convertMessagesToGoogleFormat(body.messages);
  const systemInstruction = getSystemInstruction(body.messages);

  const requestBody: Record<string, unknown> = {
    contents,
  };

  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  const generationConfig: Record<string, unknown> = {};

  if (typeof body.temperature === "number") {
    generationConfig.temperature = body.temperature;
  }

  if (typeof body.max_tokens === "number") {
    generationConfig.maxOutputTokens = body.max_tokens;
  }

  if (typeof body.top_p === "number") {
    generationConfig.topP = body.top_p;
  }

  // Force JSON output for structured generation
  generationConfig.responseMimeType = "application/json";

  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig;
  }

  return { model, requestBody };
}

function convertGoogleResponseToAIFormat(data: Record<string, unknown>, model: string): AIChatResponse {
  const candidates = (data.candidates as Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
    index?: number;
  }>) || [];

  const usageMetadata = data.usageMetadata as {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | undefined;

  return {
    id: `google-${model}-${Date.now()}`,
    choices: candidates.map((candidate) => ({
      index: candidate.index ?? 0,
      message: {
        role: "assistant",
        content: candidate.content?.parts?.[0]?.text || "",
      },
      finish_reason: candidate.finishReason || null,
    })),
    usage: usageMetadata
      ? {
          prompt_tokens: usageMetadata.promptTokenCount || 0,
          completion_tokens: usageMetadata.candidatesTokenCount || 0,
          total_tokens: usageMetadata.totalTokenCount || 0,
        }
      : undefined,
  };
}

export class GoogleAIProvider implements AIProvider {
  name = "google-ai";

  async chatCompletion(body: AIChatRequest): Promise<AIChatResponse> {
    let attempt = 0;

    while (true) {
      try {
        const config = await loadConfig();
        const { model, requestBody } = sanitizeRequestBody(body, config.model);
        const url = `${getGenerateUrl(config.baseUrl, model, false)}${config.apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: body.signal,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = errorText;

          try {
            const parsed = JSON.parse(errorText);
            errorMessage = parsed.error?.message || parsed.error?.status || errorText;
          } catch {
            // Use raw text if not JSON
          }

          throw new AIRequestError(
            `Google AI API request failed with status ${response.status}: ${errorMessage}`,
            "google-ai",
            response.status
          );
        }

        const data = (await response.json()) as Record<string, unknown>;
        return convertGoogleResponseToAIFormat(data, model);
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

  async streamChatCompletion(body: AIChatRequest): Promise<ReadableStream<Uint8Array>> {
    const config = await loadConfig();
    const { model, requestBody } = sanitizeRequestBody(body, config.model);
    const url = `${getGenerateUrl(config.baseUrl, model, true)}${config.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: body.signal,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIRequestError(
        `Google AI streaming failed with status ${response.status}: ${errorText}`,
        "google-ai",
        response.status,
      );
    }

    if (!response.body) {
      throw new AIRequestError("Google AI não devolveu body para streaming.", "google-ai", 502);
    }

    // Convert Google SSE stream to text stream
    return this.convertSSEToTextStream(response.body);
  }

  private convertSSEToTextStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
