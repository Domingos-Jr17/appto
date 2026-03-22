import { env } from "@/lib/env";

const RETRY_DELAYS_MS = [800, 1600, 3200];
const DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4";

interface ZAIConfig {
  apiKey: string;
  baseUrl: string;
}

interface ZAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface ZAIChatCompletionRequest {
  model: string;
  messages: ZAIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  thinking?: unknown;
}

interface ZAIChatCompletionResponse {
  id?: string;
  choices: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

class ZAIRequestError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ZAIRequestError";
    this.status = status;
  }
}

let zaiConfigPromise: Promise<ZAIConfig> | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  if (normalizedBaseUrl.endsWith("/chat/completions")) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/chat/completions`;
}

function parseStatusFromMessage(message: string) {
  const match = message.match(/status\s+(\d{3})/i);
  return match ? Number(match[1]) : null;
}

async function loadZAIConfig() {
  if (!zaiConfigPromise) {
    zaiConfigPromise = (async () => {
      const apiKey = env.ZAI_API_KEY?.trim();
      const baseUrl = env.ZAI_BASE_URL?.trim();

      if (apiKey) {
        return {
          apiKey,
          baseUrl: baseUrl || DEFAULT_BASE_URL,
        };
      }

      throw new ZAIRequestError(
        "Configuration missing. Define ZAI_API_KEY in the environment before using AI routes."
      );
    })().catch((error) => {
      zaiConfigPromise = null;
      throw error;
    });
  }

  return zaiConfigPromise;
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

function sanitizeRequestBody(body: ZAIChatCompletionRequest) {
  const sanitizedBody: Record<string, unknown> = {
    model: body.model,
    messages: body.messages,
    thinking:
      body.thinking !== undefined
        ? body.thinking
        : { type: "disabled" },
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

export function getZAIErrorStatus(error: unknown) {
  if (error instanceof ZAIRequestError) {
    return error.status;
  }

  if (error instanceof Error) {
    return parseStatusFromMessage(error.message);
  }

  return null;
}

export function isZAIConfigError(error: unknown) {
  return error instanceof Error
    ? error.message.includes("Configuration missing")
    : false;
}

export function getFriendlyZAIErrorMessage(error: unknown) {
  if (isZAIConfigError(error)) {
    return "A configuração da IA está em falta ou inválida no servidor.";
  }

  switch (getZAIErrorStatus(error)) {
    case 400:
      return "O pedido enviado para a IA é inválido.";
    case 401:
      return "A autenticação da IA falhou. Verifique a API key configurada.";
    case 404:
      return "O endpoint configurado para a IA não foi encontrado.";
    case 429:
      return "A IA está temporariamente limitada por excesso de pedidos. Tente novamente em instantes.";
    default:
      return "A IA está indisponível neste momento.";
  }
}

export function getFriendlyZAIErrorStatus(error: unknown) {
  if (isZAIConfigError(error)) {
    return 503;
  }

  switch (getZAIErrorStatus(error)) {
    case 400:
      return 400;
    case 401:
    case 404:
      return 502;
    case 429:
      return 429;
    default:
      return 503;
  }
}

export async function createZAIChatCompletion(body: ZAIChatCompletionRequest) {
  let attempt = 0;

  while (true) {
    try {
      const config = await loadZAIConfig();
      const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Accept-Language": "en-US,en",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizeRequestBody(body)),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new ZAIRequestError(
          `API request failed with status ${response.status}: ${errorMessage}`,
          response.status
        );
      }

      return (await response.json()) as ZAIChatCompletionResponse;
    } catch (error) {
      const status = getZAIErrorStatus(error);

      if (status === 429 && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        attempt += 1;
        continue;
      }

      throw error;
    }
  }
}
