import type { WorkBriefInput } from "@/types/editor";

export interface PromptOptions {
  type: string;
  brief: WorkBriefInput;
}

export function buildSectionPrompt(input: PromptOptions) {
  return `Gera um trabalho académico sobre: ${input.brief.objective ?? "tema não especificado"}`;
}

export function buildBriefPrompt(input: PromptOptions) {
  return buildSectionPrompt(input);
}