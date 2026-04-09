export const GENERATION_REFETCH_EVENT_TYPES = new Set([
  "section-complete",
  "complete",
]);

export function shouldRefetchProjectOnGenerationEvent(eventType: string) {
  return GENERATION_REFETCH_EVENT_TYPES.has(eventType);
}
