"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { WorkspaceData, WorkBrief } from "@/types/workspace";
import { toast } from "@/hooks/use-toast";

interface UseWorkspaceOptions {
  initialData: WorkspaceData;
}

const POLLING_CONFIG = {
  initial: 3000,
  max: 10000,
  multiplier: 1.5,
  minChangesForReset: 1,
};

export function useWorkspace({ initialData }: UseWorkspaceOptions) {
  const [data, setData] = useState(initialData);
  const [isGenerating, setIsGenerating] = useState(
    initialData.generationStatus === "GENERATING"
  );
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingIntervalRef = useRef(POLLING_CONFIG.initial);
  const lastDoneCountRef = useRef(0);

  const allDone = data.sections.every((s) => s.status === "done");
  const progress = Math.round(
    (data.sections.filter((s) => s.status === "done").length /
      data.sections.length) *
      100
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const refreshProject = useCallback(async () => {
    try {
      const currentDoneCount = data.sections.filter(
        (s) => s.status === "done"
      ).length;
      const changesBefore = lastDoneCountRef.current;
      lastDoneCountRef.current = currentDoneCount;

      const res = await fetch(`/api/projects/${data.id}`);
      if (!res.ok) return;
      const project = await res.json();

      const newDoneCount = project.sections?.filter(
        (s: { wordCount: number }) => s.wordCount > 0
      ).length || 0;
      const hasProgress = newDoneCount > changesBefore;

      pollingIntervalRef.current = hasProgress
        ? POLLING_CONFIG.initial
        : Math.min(
            pollingIntervalRef.current * POLLING_CONFIG.multiplier,
            POLLING_CONFIG.max
          );

      setData((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          const updated = project.sections?.find(
            (s: { id: string; content: string | null; wordCount: number }) =>
              s.id === section.id
          );
          if (!updated) return section;
          return {
            ...section,
            content: updated.content ?? "",
            status: updated.wordCount > 0 ? "done" as const : section.status,
          };
        }),
        generationStatus: project.generationStatus,
        generationProgress: project.generationProgress,
        generationStep: project.generationStep,
      }));

      if (project.generationStatus !== "GENERATING") {
        setIsGenerating(false);
        stopPolling();
        pollingIntervalRef.current = POLLING_CONFIG.initial;
        setData((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            status: s.content ? "done" : "done",
          })),
        }));
      } else if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = setInterval(
          refreshProject,
          pollingIntervalRef.current
        );
      }
    } catch {
      // silent — will retry on next poll
    }
  }, [data.id, data.sections, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingIntervalRef.current = POLLING_CONFIG.initial;
    lastDoneCountRef.current = data.sections.filter(
      (s) => s.status === "done"
    ).length;
    pollingRef.current = setInterval(refreshProject, pollingIntervalRef.current);
  }, [refreshProject, stopPolling, data.sections]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const generateAll = useCallback(async () => {
    setError(null);
    setIsGenerating(true);

    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.status !== "done" ? { ...s, status: "generating" as const } : s
      ),
    }));

    try {
      const res = await fetch(`/api/projects/${data.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "work" }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Falhou a regeneração");
      }

      startPolling();
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.status === "generating"
            ? { ...s, status: s.content ? "done" : "pending" }
            : s
        ),
      }));
    }
  }, [data.id, startPolling]);

  const downloadDocx = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/export?projectId=${data.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falhou o download");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.brief.title.slice(0, 50)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível descarregar"
      );
    }
  }, [data.id, data.brief.title]);

  const setCoverTemplate = useCallback(
    async (template: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/works/${data.id}/cover-template`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template }),
        });
        if (!res.ok) throw new Error("Falhou ao alterar template");
        setData((prev) => ({
          ...prev,
          brief: { ...prev.brief, coverTemplate: template },
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Não foi possível alterar o template"
        );
      }
    },
    [data.id]
  );

  const saveBrief = useCallback(
    async (updates: Partial<WorkBrief>) => {
      setError(null);
      try {
        const res = await fetch(`/api/projects/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: {
              institutionName: updates.institutionName,
              courseName: updates.courseName,
              studentName: updates.studentName,
              advisorName: updates.advisorName,
              city: updates.city,
              academicYear: updates.year ? parseInt(updates.year, 10) : undefined,
            },
          }),
        });
        if (!res.ok) throw new Error("Falhou ao guardar dados da capa");
        setData((prev) => ({
          ...prev,
          brief: { ...prev.brief, ...updates },
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Não foi possível guardar"
        );
      }
    },
    [data.id]
  );

  const updateTitle = useCallback(
    async (newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      setError(null);

      const previousTitle = data.brief.title;

      setData((prev) => ({
        ...prev,
        brief: { ...prev.brief, title: trimmed },
      }));

      try {
        const res = await fetch(`/api/projects/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Falhou ao actualizar título");
        }
        toast({ title: "Título actualizado" });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          brief: { ...prev.brief, title: previousTitle },
        }));
        const msg = err instanceof Error ? err.message : "Erro ao actualizar";
        setError(msg);
        toast({ title: "Erro ao actualizar título", variant: "destructive" });
      }
    },
    [data.id, data.brief.title]
  );

  return {
    data,
    progress,
    allDone,
    isGenerating,
    error,
    generateAll,
    downloadDocx,
    setCoverTemplate,
    saveBrief,
    updateTitle,
  };
}
