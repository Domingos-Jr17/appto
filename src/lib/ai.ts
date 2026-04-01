import { env } from "@/lib/env";
import { ZAIProvider } from "@/lib/ai-providers/zai";
import { OpenRouterProvider } from "@/lib/ai-providers/openrouter";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface AIChatRequest {
  model: string;
  messages: AIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  thinking?: unknown;
}

export interface AIChatResponse {
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

export interface AIProvider {
  name: string;
  chatCompletion(request: AIChatRequest): Promise<AIChatResponse>;
}

// ─── Error Classes ───────────────────────────────────────────────────────────

export class AIRequestError extends Error {
  status: number | null;
  provider: string;

  constructor(message: string, provider: string, status: number | null = null) {
    super(message);
    this.name = "AIRequestError";
    this.provider = provider;
    this.status = status;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function getAIProvider(): AIProvider {
  const provider = env.AI_PROVIDER?.toLowerCase()?.trim() || "openrouter";

  if (provider === "zai") {
    return new ZAIProvider();
  }

  // Default: OpenRouter (Qwen 3.6 Plus Preview)
  return new OpenRouterProvider();
}

// ─── Error Helpers ───────────────────────────────────────────────────────────

function parseStatusFromMessage(message: string) {
  const match = message.match(/status\s+(\d{3})/i);
  return match ? Number(match[1]) : null;
}

export function getAIErrorStatus(error: unknown) {
  if (error instanceof AIRequestError) {
    return error.status;
  }

  if (error instanceof Error) {
    return parseStatusFromMessage(error.message);
  }

  return null;
}

export function isAIConfigError(error: unknown) {
  return error instanceof Error
    ? error.message.includes("Configuration missing")
    : false;
}

export function getFriendlyAIErrorMessage(error: unknown) {
  if (isAIConfigError(error)) {
    return "A configuração da IA está em falta ou inválida no servidor.";
  }

  switch (getAIErrorStatus(error)) {
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

export function getFriendlyAIErrorStatus(error: unknown) {
  if (isAIConfigError(error)) {
    return 503;
  }

  switch (getAIErrorStatus(error)) {
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
