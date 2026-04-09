export type GenerationState = 
  | "BRIEFING" 
  | "QUEUED" 
  | "GENERATING" 
  | "READY" 
  | "FAILED" 
  | "NEEDS_REVIEW";

const validTransitions: Record<GenerationState, GenerationState[]> = {
  BRIEFING: ["QUEUED"],
  QUEUED: ["GENERATING", "FAILED"],
  GENERATING: ["READY", "FAILED", "NEEDS_REVIEW"],
  READY: [],
  FAILED: ["QUEUED"],
  NEEDS_REVIEW: ["GENERATING", "QUEUED"],
};

export function canTransition(from: GenerationState, to: GenerationState): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

export function isValidState(state: string): state is GenerationState {
  return state in validTransitions;
}

export function getValidTransitions(from: GenerationState): GenerationState[] {
  return validTransitions[from] ?? [];
}