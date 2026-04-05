"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface StreamEvent {
  progress: number;
  step: string;
  error?: string;
}

interface UseGenerationStreamOptions {
  projectId: string;
  generationStatus: string | undefined;
  onProgress: (event: StreamEvent) => void;
  onComplete: (event: StreamEvent) => void;
  onError: (event: StreamEvent) => void;
  enabled?: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAYS = [1000, 2000, 4000];

export function useGenerationStream({
  projectId,
  generationStatus,
  onProgress,
  onComplete,
  onError,
  enabled = true,
}: UseGenerationStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);

  useEffect(() => {
    if (!enabled || generationStatus !== "GENERATING") {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsStreaming(false);
      return;
    }

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `/api/generate/work/${projectId}/stream`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setIsStreaming(true);
      };

      es.addEventListener("progress", (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          setLastEvent(data);
          onProgress(data);
        } catch {
          // malformed data
        }
      });

      es.addEventListener("complete", (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          setLastEvent(data);
          onComplete(data);
        } catch {
          // malformed data
        }
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setIsStreaming(false);
      });

      es.addEventListener("error", () => {
        const wasConnected = es.readyState === EventSource.OPEN;
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setIsStreaming(false);

        if (wasConnected && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS[reconnectAttemptsRef.current] || 4000;
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (!wasConnected) {
          onError({ progress: 0, step: "Conexão falhou" });
        }
      });
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsStreaming(false);
    };
  }, [enabled, generationStatus, projectId, onProgress, onComplete, onError]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsStreaming(false);
    };
  }, []);

  const connect = () => {
    if (enabled && generationStatus === "GENERATING") {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      reconnectAttemptsRef.current = 0;
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  return { isStreaming, lastEvent, connect, disconnect };
}