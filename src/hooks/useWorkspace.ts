"use client";

import { useState, useCallback } from "react";
import type { WorkspaceData, WorkBrief, WorkSection } from "@/types/workspace";
import { toast } from "@/hooks/use-toast";
import { useGenerationStream } from "@/hooks/useGenerationStream";
import {
  extractActiveSectionTitle,
  isFrontMatterSectionTitle,
  isMeaningfulWorkspaceSection,
  resolveGenerationSnapshot,
  resolveWorkspaceSectionState,
} from "@/lib/work-generation-state";

interface UseWorkspaceOptions {
  initialData: WorkspaceData;
}

export function useWorkspace({ initialData }: UseWorkspaceOptions) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingExport, setIsSavingExport] = useState<"DOCX" | "PDF" | null>(null);

  const bodySections = data.sections.filter((section) => !isFrontMatterSectionTitle(section.title));
  const allDone = bodySections.length > 0 && bodySections.every((section) => section.status === "done");
  const progress = bodySections.length === 0
    ? 0
    : Math.round(
        (bodySections.filter((section) => section.status === "done").length /
          bodySections.length) *
          100
      );

  const refreshProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${data.id}`);
      if (!res.ok) return;
      const project = await res.json();

      const generationSnapshot = resolveGenerationSnapshot({
        liveJob: {
          status: project.generationStatus,
          progress: project.generationProgress,
          step: project.generationStep,
        },
        fallbackStatus: project.generationStatus,
      });

      setData((prev) => ({
        ...prev,
        sections: (project.sections ?? [])
          .map((section: { id: string; title: string; content: string | null; wordCount: number; order: number }) => {
            const previous = prev.sections.find((item) => item.id === section.id);
            const hasContent = section.wordCount > 0 || isMeaningfulWorkspaceSection({
              title: section.title,
              content: section.content,
            });

            return {
              id: section.id,
              title: section.title,
              order: section.order,
              content: section.content ?? "",
              streamingContent: previous?.streamingContent,
              status: resolveWorkspaceSectionState({
                generationStatus: generationSnapshot.status,
                activeSectionTitle: generationSnapshot.activeSectionTitle,
                hasPersistedContent: !isFrontMatterSectionTitle(section.title) && hasContent,
                title: section.title,
                hasStreamingContent: Boolean(previous?.streamingContent?.trim()),
              }),
            };
          })
          .sort((a: WorkSection, b: WorkSection) => (a.order ?? 0) - (b.order ?? 0)),
        generationStatus: generationSnapshot.status,
        generationProgress: generationSnapshot.progress,
        generationStep: generationSnapshot.step,
      }));
    } catch (err) {
      console.warn("[useWorkspace] refreshProject failed:", err);
    }
  }, [data.id]);

  const applyLiveSnapshot = useCallback((snapshot: {
    type: "handshake" | "job-created" | "section-started" | "section-complete" | "progress" | "content-chunk" | "complete" | "error";
    progress: number;
    step: string;
    sectionTitle?: string;
    error?: string;
  }) => {
    const activeSectionTitle = snapshot.sectionTitle || extractActiveSectionTitle(snapshot.step) || null;
    const nextGenerationStatus = snapshot.type === "complete"
      ? "READY"
      : snapshot.type === "error"
        ? "FAILED"
        : "GENERATING";

    if (snapshot.type === "error" && snapshot.error) {
      setError(snapshot.error);
    }

    setData((prev) => ({
      ...prev,
      generationStatus: nextGenerationStatus,
      generationProgress: nextGenerationStatus === "GENERATING" ? snapshot.progress : 100,
      generationStep: snapshot.error || snapshot.step,
      sections: prev.sections.map((section) => {
        const hasPersistedContent = Boolean(section.content?.trim());
        const hasStreamingContent = Boolean(section.streamingContent?.trim());

        if (snapshot.type === "section-complete" && snapshot.sectionTitle === section.title) {
          return {
            ...section,
            content: section.content || section.streamingContent || "",
            status: "done" as const,
          };
        }

        if (hasPersistedContent) {
          return {
            ...section,
            status: "done" as const,
          };
        }

        if (hasStreamingContent && activeSectionTitle !== section.title) {
          return {
            ...section,
            content: section.content || section.streamingContent || "",
            status: "done" as const,
          };
        }

        if (activeSectionTitle === section.title && nextGenerationStatus === "GENERATING") {
          return {
            ...section,
            status: hasStreamingContent ? "streaming" as const : "generating" as const,
          };
        }

        return {
          ...section,
          status: resolveWorkspaceSectionState({
            generationStatus: nextGenerationStatus,
            activeSectionTitle,
            hasPersistedContent,
            title: section.title,
            hasStreamingContent,
          }),
        };
      }),
    }));
  }, []);

  const handleContentChunk = useCallback((sectionTitle: string, content: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.title === sectionTitle
          ? { ...s, streamingContent: content, status: "streaming" as const }
          : s
      ),
    }));
  }, []);

  const isGenerating = data.generationStatus === "GENERATING";

  useGenerationStream({
    projectId: data.id,
    generationStatus: data.generationStatus,
    onFetch: refreshProject,
    onProgress: applyLiveSnapshot,
    onContentChunk: handleContentChunk,
    enabled: isGenerating,
  });

  const generateAll = useCallback(async () => {
    setError(null);

    setData((prev) => ({
      ...prev,
        generationStatus: "GENERATING",
        generationProgress: Math.max(prev.generationProgress, 5),
        generationStep: "A preparar geração",
      sections: prev.sections.map((s) =>
        s.status !== "done"
          ? { ...s, status: "pending" as const, streamingContent: undefined }
          : s
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
        generationStatus: "FAILED",
        generationProgress: prev.generationProgress,
        generationStep: "Falha na geração",
        sections: prev.sections.map((s) =>
          s.status === "generating" || s.status === "streaming"
            ? { ...s, status: s.content ? "done" : "pending" }
            : s
        ),
      }));
    }
  }, [data.id]);

  const downloadDocx = useCallback(async () => {
    setError(null);
    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
    }
  }, [data.id, data.brief.title]);

  const downloadPdf = useCallback(async () => {
    setError(null);
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/export/pdf?projectId=${data.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falhou o download do PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const truncate = (text: string, max: number) =>
        text.length <= max ? text : text.slice(0, max).replace(/\s+\S*$/, "");
      a.download = `${truncate(data.brief.title, 50)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível descarregar o PDF"
      );
    } finally {
      setIsDownloading(false);
    }
  }, [data.id, data.brief.title]);

  const saveExport = useCallback(async (format: "DOCX" | "PDF") => {
    setError(null);
    setIsSavingExport(format);
    try {
      const res = await fetch(`/api/projects/${data.id}/export/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Falhou ao guardar exportação ${format}`);
      }

      const downloadUrl = body?.data?.export?.file?.downloadUrl;
      if (downloadUrl) {
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      }

      toast({ title: `${format} guardado`, description: "A exportação foi criada com sucesso." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível guardar a exportação";
      setError(msg);
      toast({ title: "Erro ao guardar exportação", description: msg, variant: "destructive" });
    } finally {
      setIsSavingExport(null);
    }
  }, [data.id]);

  const shareLink = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/projects/${data.id}/share`, {
        method: "POST",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Falhou ao criar link de partilha");
      }

      const shareUrl = body?.data?.shareUrl;
      if (!shareUrl) {
        throw new Error("Link de partilha inválido");
      }

      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copiado",
        description: "O link de partilha foi copiado para a área de transferência.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível criar o link de partilha";
      setError(msg);
      toast({ title: "Erro ao partilhar", description: msg, variant: "destructive" });
    }
  }, [data.id]);

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
    isDownloading,
    isSavingExport,
    error,
    generateAll,
    downloadDocx,
    downloadPdf,
    saveExport,
    shareLink,
    setCoverTemplate,
    saveBrief,
    updateTitle,
  };
}
