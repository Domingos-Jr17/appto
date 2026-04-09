import { runAIChatCompletion } from "@/lib/ai";

export interface AICallOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  systemPrompt: string;
  userPrompt: string;
}

export async function callAI(input: AICallOptions) {
  return runAIChatCompletion({
    model: input.model ?? "default",
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
    temperature: input.temperature ?? 0.7,
    max_tokens: input.max_tokens ?? 2000,
  });
}

export async function callAIWithFallback(input: AICallOptions) {
  return callAI(input);
}