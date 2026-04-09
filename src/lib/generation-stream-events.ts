export const GENERATION_REFETCH_EVENT_TYPES = new Set([
  "section-complete",
  "complete",
]);

const SSE_ROTATION_AGE_MS = 225_000;
const SSE_RECENT_ACTIVITY_WINDOW_MS = 15_000;
const SSE_MIN_HEALTHY_CONNECTION_AGE_MS = 60_000;
const SSE_MAX_CONSECUTIVE_FAILURES = 2;

export function shouldRefetchProjectOnGenerationEvent(eventType: string) {
  return GENERATION_REFETCH_EVENT_TYPES.has(eventType);
}

export function classifyGenerationStreamFailure(input: {
  connectionStartedAt: number;
  lastEventAt: number;
  consecutiveFailures: number;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const connectionAge = Math.max(0, now - input.connectionStartedAt);
  const inactivityMs = Math.max(0, now - input.lastEventAt);
  const wasHealthyLongEnough =
    connectionAge >= SSE_MIN_HEALTHY_CONNECTION_AGE_MS &&
    inactivityMs <= SSE_RECENT_ACTIVITY_WINDOW_MS;
  const reachedExpectedRotationAge = connectionAge >= SSE_ROTATION_AGE_MS;

  if (wasHealthyLongEnough || reachedExpectedRotationAge) {
    return {
      shouldReconnect: true,
      shouldFallbackToPolling: false,
      countsAsFailure: false,
      nextFailureCount: 0,
    };
  }

  const nextFailureCount = input.consecutiveFailures + 1;
  return {
    shouldReconnect: nextFailureCount < SSE_MAX_CONSECUTIVE_FAILURES,
    shouldFallbackToPolling: nextFailureCount >= SSE_MAX_CONSECUTIVE_FAILURES,
    countsAsFailure: true,
    nextFailureCount,
  };
}
