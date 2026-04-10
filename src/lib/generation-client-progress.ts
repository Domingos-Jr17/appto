const FAST_POLLING_STEPS = new Set([
  "Na fila do worker",
  "Worker assumiu a geração",
]);

export function shouldUseFastGenerationPolling(step?: string | null) {
  if (!step) {
    return false;
  }

  return FAST_POLLING_STEPS.has(step.trim());
}

export function getGenerationPollingIntervalMs(step?: string | null) {
  return shouldUseFastGenerationPolling(step) ? 1000 : 3000;
}
