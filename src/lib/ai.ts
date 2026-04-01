import { env } from "@/lib/env";

// Import types from separate file to avoid circular dependency
import type {
  AIProvider,
  AIChatRequest,
  AIChatResponse,
  AIMessage,
} from "@/lib/ai-types";
import { AIRequestError } from "@/lib/ai-types";

// Re-export types for backward compatibility
export type { AIProvider, AIChatRequest, AIChatResponse, AIMessage };
export { AIRequestError };

// ─── Provider imports (lazy) ──────────────────────────────────────────────
// Note: Providers are imported dynamically to avoid circular dependency at module load time

// ─── Factory ─────────────────────────────────────────────────────────────────

export function getAIProvider(): AIProvider {
  const provider = env.AI_PROVIDER?.toLowerCase()?.trim() || "openrouter";

  if (provider === "zai") {
    // Dynamic import to avoid circular dependency
    const { ZAIProvider } = require("@/lib/ai-providers/zai");
    return new ZAIProvider();
  }

  // Default: OpenRouter (Qwen 3.6 Plus Preview)
  const { OpenRouterProvider } = require("@/lib/ai-providers/openrouter");
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
