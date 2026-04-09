"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { shouldRefetchProjectOnGenerationEvent } from "@/lib/generation-stream-events";

interface SSEEvent {
  type: "handshake" | "job-created" | "section-started" | "section-complete" | "progress" | "content-chunk" | "complete" | "error";
  data: {
    progress: number;
    step: string;
    sectionTitle?: string;
    content?: string;
    error?: string;
  };
}

interface UseGenerationStreamOptions {
  projectId: string;
  generationStatus: string | undefined;
  onFetch: () => Promise<void>;
  onProgress?: (snapshot: {
    type: SSEEvent["type"];
    progress: number;
    step: string;
    sectionTitle?: string;
    error?: string;
  }) => void;
  onSectionStarted?: (sectionTitle: string) => void;
  onSectionComplete?: (sectionTitle: string) => void;
  onContentChunk?: (sectionTitle: string, content: string) => void;
  enabled?: boolean;
  maxTimeout?: number;
}

function parseSseEvent(event: Event) {
  return JSON.parse((event as MessageEvent).data) as SSEEvent;
}

export function useGenerationStream({
  projectId,
  generationStatus,
  onFetch,
  onProgress,
  onSectionStarted,
  onSectionComplete,
  onContentChunk,
  enabled = true,
  maxTimeout = 900_000,
}: UseGenerationStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      timeoutRef.current = setTimeout(tick, 5000);
    };

    timeoutRef.current = setTimeout(tick, 3000);

    if (maxTimeout > 0) {
      maxTimeoutRef.current = setTimeout(stopPolling, maxTimeout);
    }
  }, [maxTimeout, onFetch, stopPolling]);

  const connectSSE = useCallback(function connectSSEImpl() {
    stopSSE();
    reconnectAttemptsRef.current = 0;

    const url = `/api/generate/work/${projectId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    const handleSnapshot = (e: Event, type: SSEEvent["type"]) => {
      try {
        const parsed = parseSseEvent(e);
        onProgress?.({
          type,
          progress: parsed.data.progress,
          step: parsed.data.step,
          sectionTitle: parsed.data.sectionTitle,
          error: parsed.data.error,
        });
        return parsed;
      } catch {
        return null;
      }
    };

    eventSource.addEventListener("handshake", (e) => {
      handleSnapshot(e, "handshake");
    });

    eventSource.addEventListener("job-created", (e) => {
      handleSnapshot(e, "job-created");
    });

    eventSource.addEventListener("section-started", (e) => {
      const parsed = handleSnapshot(e, "section-started");
      if (parsed?.data.sectionTitle) {
        onSectionStarted?.(parsed.data.sectionTitle);
      }
    });

    eventSource.addEventListener("progress", (e) => {
      handleSnapshot(e, "progress");
    });

    eventSource.addEventListener("content-chunk", (e) => {
      const parsed = handleSnapshot(e, "content-chunk");
      if (parsed?.data.sectionTitle && parsed.data.content) {
        onContentChunk?.(parsed.data.sectionTitle, parsed.data.content);
      }
    });

    eventSource.addEventListener("section-complete", (e) => {
      const parsed = handleSnapshot(e, "section-complete");
      if (parsed?.data.sectionTitle) {
        onSectionComplete?.(parsed.data.sectionTitle);
      }
      if (shouldRefetchProjectOnGenerationEvent("section-complete")) {
        void onFetch();
      }
    });

    eventSource.addEventListener("complete", (e) => {
      handleSnapshot(e, "complete");
      if (shouldRefetchProjectOnGenerationEvent("complete")) {
        void onFetch();
      }
      stopSSE();
    });

    eventSource.addEventListener("error", (e) => {
      const parsed = handleSnapshot(e, "error");
      if (parsed) {
        void onFetch();
      }
      stopSSE();
    });

    eventSource.onerror = () => {
      reconnectAttemptsRef.current += 1;

      // Quick fallback to polling on Vercel Hobby (SSE often fails due to 10s timeout)
      if (reconnectAttemptsRef.current >= 2) {
        setUseSSE(false);
        stopSSE();
        startPolling();
        return;
      }

      stopSSE();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isGeneratingRef.current) {
          connectSSEImpl();
        }
      }, 1000);
    };
  }, [projectId, onFetch, onProgress, onContentChunk, onSectionStarted, onSectionComplete, stopSSE, startPolling]);

  const stopAll = useCallback(() => {
    isGeneratingRef.current = false;
    stopSSE();
    stopPolling();
  }, [stopSSE, stopPolling]);

  const startAll = useCallback(() => {
    isGeneratingRef.current = true;
    void onFetch();

    if (useSSE) {
      connectSSE();
    } else {
      startPolling();
    }
  }, [useSSE, connectSSE, onFetch, startPolling]);

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
