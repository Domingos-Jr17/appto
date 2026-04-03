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
  signal?: AbortSignal;
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
