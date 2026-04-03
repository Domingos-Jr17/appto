import { env } from "@/lib/env";
import { logOperationalEvent } from "@/lib/observability";

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

type ProviderName = "openrouter" | "zai";

async function instantiateProvider(provider: ProviderName): Promise<AIProvider> {
  
  if (provider === "zai") {
    const { ZAIProvider } = await import("@/lib/ai-providers/zai");
    return new ZAIProvider();
  }

  const { OpenRouterProvider } = await import("@/lib/ai-providers/openrouter");
  return new OpenRouterProvider();
}

export async function getAIProvider(): Promise<AIProvider> {
  return instantiateProvider((env.AI_PROVIDER?.toLowerCase()?.trim() || "openrouter") as ProviderName);
}

function getProviderCandidates(): ProviderName[] {
  const primary = (env.AI_PROVIDER?.toLowerCase()?.trim() || "openrouter") as ProviderName;
  const configuredFallback = env.AI_FALLBACK_PROVIDER?.toLowerCase()?.trim() as ProviderName | undefined;
  const fallback = configuredFallback && configuredFallback !== primary
    ? configuredFallback
    : primary === "openrouter"
      ? "zai"
      : "openrouter";

  return [primary, fallback];
}

function shouldFallback(error: unknown) {
  if (error instanceof AIRequestError) {
    return error.status === null || error.status === 429 || error.status >= 500;
  }

  return error instanceof Error && /timeout|abort/i.test(error.message);
}

async function runProviderWithTimeout(provider: AIProvider, request: AIChatRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  try {
    return await provider.chatCompletion({
      ...request,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIRequestError(
        `AI request timed out after ${env.AI_REQUEST_TIMEOUT_MS}ms`,
        provider.name,
        504,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runAIChatCompletion(request: AIChatRequest): Promise<AIChatResponse> {
  const providers = getProviderCandidates();
  let lastError: unknown;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = await instantiateProvider(providers[index]!);

    try {
      return await runProviderWithTimeout(provider, request);
    } catch (error) {
      lastError = error;
      const hasAnotherProvider = index < providers.length - 1;
      if (!hasAnotherProvider || !shouldFallback(error)) {
        throw error;
      }

      logOperationalEvent("ai_provider_fallback", {
        failedProvider: provider.name,
        fallbackProvider: providers[index + 1],
        reason: error instanceof Error ? error.message : String(error),
      }, "warn");
    }
  }

  throw lastError instanceof Error ? lastError : new Error("A IA está indisponível neste momento.");
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
    case 504:
      return "A IA demorou demasiado a responder. Tente novamente em instantes.";
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
    case 504:
      return 504;
    default:
      return 503;
  }
}
