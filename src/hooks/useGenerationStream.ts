"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SSEEvent {
  type: "handshake" | "progress" | "section-complete" | "complete" | "error";
  data: {
    progress: number;
    step: string;
    sectionTitle?: string;
    error?: string;
  };
}

interface UseGenerationStreamOptions {
  projectId: string;
  generationStatus: string | undefined;
  onFetch: () => Promise<void>;
  getDoneCount: () => number;
  enabled?: boolean;
  maxTimeout?: number;
}

export function useGenerationStream({
  projectId,
  generationStatus,
  onFetch,
  getDoneCount,
  enabled = true,
  maxTimeout = 300_000,
}: UseGenerationStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isGeneratingRef = useRef(false);
  const [useSSE, setUseSSE] = useState(true);

  const isGenerating = generationStatus === "GENERATING";

  const stopSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
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

    const tick = async () => {
      await onFetch();
      timeoutRef.current = setTimeout(tick, 3000);
    };

    timeoutRef.current = setTimeout(tick, 2000);

    if (maxTimeout > 0) {
      maxTimeoutRef.current = setTimeout(stopPolling, maxTimeout);
    }
  }, [maxTimeout, onFetch, stopPolling]);

  const connectSSE = useCallback(() => {
    stopSSE();
    reconnectAttemptsRef.current = 0;

    const url = `/api/generate/work/${projectId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("handshake", () => {
      // Connection established
    });

    eventSource.addEventListener("section-complete", () => {
      void onFetch();
    });

    eventSource.addEventListener("complete", () => {
      void onFetch();
      stopSSE();
    });

    eventSource.addEventListener("error", () => {
      void onFetch();
      stopSSE();
    });

    eventSource.onerror = () => {
      reconnectAttemptsRef.current += 1;

      if (reconnectAttemptsRef.current >= 5) {
        setUseSSE(false);
        stopSSE();
        startPolling();
        return;
      }

      stopSSE();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isGeneratingRef.current) {
          connectSSE();
        }
      }, 3000);
    };
  }, [projectId, onFetch, stopSSE, startPolling]);

  const stopAll = useCallback(() => {
    isGeneratingRef.current = false;
    stopSSE();
    stopPolling();
  }, [stopSSE, stopPolling]);

  const startAll = useCallback(() => {
    isGeneratingRef.current = true;

    if (useSSE) {
      connectSSE();
    } else {
      startPolling();
    }
  }, [useSSE, connectSSE, startPolling]);

  useEffect(() => {
    if (!enabled || !isGenerating) {
      stopAll();
      return;
    }

    startAll();

    return () => {
      stopAll();
    };
  }, [enabled, isGenerating, projectId, startAll, stopAll]);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  return { stopAll, useSSE };
}
