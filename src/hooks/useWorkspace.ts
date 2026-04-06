"use client";

import { useState, useCallback } from "react";
import type { WorkspaceData, WorkBrief } from "@/types/workspace";
import { toast } from "@/hooks/use-toast";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";

interface UseWorkspaceOptions {
  initialData: WorkspaceData;
}

export function useWorkspace({ initialData }: UseWorkspaceOptions) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);

  const allDone = data.sections.length > 0 && data.sections.every((s) => s.status === "done");
  const progress = data.sections.length === 0
    ? 0
    : Math.round(
        (data.sections.filter((s) => s.status === "done").length /
          data.sections.length) *
          100
      );

  const getDoneCount = useCallback(
    () => data.sections.filter((s) => s.status === "done").length,
    [data.sections]
  );

  const refreshProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${data.id}`);
      if (!res.ok) return;
      const project = await res.json();

      setData((prev) => ({
        ...prev,
        sections: prev.sections
          .map((section) => {
            const updated = project.sections?.find(
              (s: { id: string; content: string | null; wordCount: number }) =>
                s.id === section.id
            );
            if (!updated) return section;
            return {
              ...section,
              content: updated.content ?? "",
              status: updated.wordCount > 0 ? ("done" as const) : section.status,
            };
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        generationStatus: project.generationStatus,
        generationProgress: project.generationProgress,
        generationStep: project.generationStep,
      }));

      if (project.generationStatus !== "GENERATING") {
        setData((prev) => ({
          ...prev,
          generationProgress: 100,
          sections: prev.sections.map((s) => ({
            ...s,
            status: s.content ? "done" : "pending",
          })),
        }));
      }
    } catch (err) {
      console.warn("[useWorkspace] refreshProject failed:", err);
    }
  }, [data.id]);

  const isGenerating = data.generationStatus === "GENERATING";

  useGenerationPolling({
    projectId: data.id,
    generationStatus: data.generationStatus,
    onFetch: refreshProject,
    getDoneCount,
    enabled: isGenerating,
  });

  const generateAll = useCallback(async () => {
    setError(null);

    setData((prev) => ({
      ...prev,
      generationStatus: "GENERATING",
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setData((prev) => ({
        ...prev,
        generationStatus: "READY",
        sections: prev.sections.map((s) =>
          s.status === "generating"
            ? { ...s, status: s.content ? "done" : "pending" }
            : s
        ),
      }));
    }
  }, [data.id]);

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
      const truncate = (text: string, max: number) =>
        text.length <= max ? text : text.slice(0, max).replace(/\s+\S*$/, "");
      a.download = `${truncate(data.brief.title, 50)}.docx`;
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
              className: updates.className,
              turma: updates.turma,
              facultyName: updates.facultyName,
              departmentName: updates.departmentName,
              studentNumber: updates.studentNumber,
              semester: updates.semester,
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
