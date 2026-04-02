"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";

interface PollingConfig {
  initial: number;
  max: number;
  multiplier: number;
}

const DEFAULT_CONFIG: PollingConfig = {
  initial: 3000,
  max: 10000,
  multiplier: 1.5,
};

interface UseGenerationPollingOptions {
  projectId: string;
  generationStatus: string | undefined;
  onFetch: () => Promise<void>;
  getDoneCount: () => number;
  enabled?: boolean;
  maxTimeout?: number;
  config?: Partial<PollingConfig>;
}

export function useGenerationPolling({
  projectId,
  generationStatus,
  onFetch,
  getDoneCount,
  enabled = true,
  maxTimeout = 120_000,
  config: configOverrides,
}: UseGenerationPollingOptions) {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef(DEFAULT_CONFIG.initial);
  const lastDoneCountRef = useRef(0);

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...(configOverrides || {}) }),
    [configOverrides]
  );
  const isGenerating = generationStatus === "GENERATING";

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = config.initial;
    lastDoneCountRef.current = getDoneCount();

    const tick = async () => {
      const prevCount = lastDoneCountRef.current;
      await onFetch();
      const currentCount = getDoneCount();
      const hasProgress = currentCount > prevCount;
      lastDoneCountRef.current = currentCount;

      intervalRef.current = hasProgress
        ? config.initial
        : Math.min(intervalRef.current * config.multiplier, config.max);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = setInterval(tick, intervalRef.current);
      }
    };

    pollingRef.current = setInterval(tick, intervalRef.current);

    if (maxTimeout > 0) {
      maxTimeoutRef.current = setTimeout(stopPolling, maxTimeout);
    }
  }, [config, getDoneCount, maxTimeout, onFetch, stopPolling]);

  useEffect(() => {
    if (!enabled || !isGenerating) {
      stopPolling();
      return;
    }

    // Initial delay before first poll
    timeoutRef.current = setTimeout(() => {
      startPolling();
    }, 2000);

    return () => {
      stopPolling();
    };
  }, [enabled, isGenerating, projectId, startPolling, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { startPolling, stopPolling };
}
