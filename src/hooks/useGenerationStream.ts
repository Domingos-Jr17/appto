"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  onSectionStarted?: (sectionTitle: string) => void;
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
  onSectionStarted,
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

    eventSource.addEventListener("handshake", () => {
      // Connection established
    });

    eventSource.addEventListener("job-created", () => {
      // Job exists — connection confirmed
    });

    eventSource.addEventListener("section-started", (e) => {
      try {
        const parsed = parseSseEvent(e);
        onSectionStarted?.(parsed.data.sectionTitle || "");
      } catch {
        // ignore
      }
      void onFetch();
    });

    eventSource.addEventListener("progress", () => {
      void onFetch();
    });

    eventSource.addEventListener("content-chunk", (e) => {
      try {
        const parsed = parseSseEvent(e);
        if (parsed.data.sectionTitle && parsed.data.content) {
          onContentChunk?.(parsed.data.sectionTitle, parsed.data.content);
        }
      } catch {
        // ignore malformed chunk events and keep polling fallback active
      }
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
  }, [projectId, onFetch, onContentChunk, onSectionStarted, stopSSE, startPolling]);

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
