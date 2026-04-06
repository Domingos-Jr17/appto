"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { WorksLibrarySkeleton } from "@/components/skeletons/WorksLibrarySkeleton";
import { useToast } from "@/hooks/use-toast";
import {
    ProjectGrid,
    type ProjectCardData,
} from "@/components/projects/ProjectGrid";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";
import {
    ProjectFilters,
    type ProjectStatus,
    type ViewMode,
    type SortOption,
} from "@/components/projects/ProjectFilters";
import { calculateProjectProgress } from "@/lib/progress";
import { formatRelativeTime } from "@/lib/utils";
import { fetchWithRetry } from "@/lib/fetch-retry";

const PROJECT_TYPE_LABELS: Record<string, ProjectCardData["type"]> = {
    SECONDARY_WORK: "trabalho escolar",
    TECHNICAL_WORK: "trabalho técnico",
    HIGHER_EDUCATION_WORK: "trabalho académico",
};

export function WorksLibraryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const {
        projects: rawProjects,
        isLoading,
        refresh,
    } = useAppShellData();

    // UI-specific state
    const [status, setStatus] = useState<ProjectStatus>("all");
    const [search, setSearch] = useState("");
    const [viewMode] = useState<ViewMode>("grid");
    const [sortBy] = useState<SortOption>("updated");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const works = useMemo<ProjectCardData[]>(
        () =>
            rawProjects.map((project) => ({
                id: project.id,
                title: project.title,
                type: PROJECT_TYPE_LABELS[project.type] || "monografia",
                course: project.brief?.courseName || null,
                institution: project.brief?.institutionName || null,
                progress: calculateProjectProgress(project),
                generationStatus: project.generationStatus,
                generationProgress: project.generationProgress,
                generationStep: project.generationStep,
                status: mapStatus(project.status),
                lastUpdated: formatRelativeTime(new Date(project.updatedAt)),
                createdAt: project.createdAt,
            })),
        [rawProjects],
    );

    const filteredWorks = useMemo(() => {
        let filtered = [...works];

        if (status !== "all") {
            filtered = filtered.filter((work) => work.status === status);
        }

        if (search.trim()) {
            const lowered = search.toLowerCase();
            filtered = filtered.filter((work) =>
                work.title.toLowerCase().includes(lowered),
            );
        }

        filtered.sort((left, right) => {
            switch (sortBy) {
                case "title":
                    return left.title.localeCompare(right.title);
                case "progress":
                    return right.progress - left.progress;
                case "created":
                    return (
                        new Date(right.createdAt).getTime() -
                        new Date(left.createdAt).getTime()
                    );
                case "updated":
                    return (
                        new Date(right.lastUpdated).getTime() -
                        new Date(left.lastUpdated).getTime()
                    );
                default:
                    return (
                        new Date(right.lastUpdated).getTime() -
                        new Date(left.lastUpdated).getTime()
                    );
            }
        });

        return filtered;
    }, [search, sortBy, status, works]);

    const workCounts = useMemo(
        () => ({
            all: works.length,
            draft: works.filter((work) => work.status === "draft").length,
            inProgress: works.filter((work) => work.status === "in_progress")
                .length,
            completed: works.filter((work) => work.status === "completed")
                .length,
        }),
        [works],
    );

    const hasFilteredResults = Boolean(search.trim()) || status !== "all";

    const handleArchiveWork = async (workId: string) => {
        try {
            const currentWork = works.find((item) => item.id === workId);
            const newStatus =
                currentWork?.status === "archived" ? "IN_PROGRESS" : "ARCHIVED";

            const response = await fetchWithRetry(`/api/projects/${workId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                retries: 1,
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error("Erro ao actualizar o trabalho");
            }

            toast({
                title:
                    newStatus === "ARCHIVED"
                        ? "Trabalho arquivado"
                        : "Trabalho restaurado",
            });
            await refresh();
        } catch {
            toast({
                title: "Erro",
                description: "Não foi possível actualizar o trabalho.",
                variant: "destructive",
            });
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        try {
            const response = await fetchWithRetry(
                `/api/projects/${deleteTarget}`,
                {
                    method: "DELETE",
                    retries: 1,
                },
            );
            if (!response.ok) {
                throw new Error("Erro ao eliminar o trabalho");
            }

            toast({
                title: "Trabalho eliminado",
                description: "O trabalho foi eliminado com sucesso.",
            });
            await refresh();
        } catch {
            toast({
                title: "Erro",
                description: "Não foi possível eliminar o trabalho.",
                variant: "destructive",
            });
        } finally {
            setDeleteTarget(null);
        }
    };

    if (isLoading) {
        return <WorksLibrarySkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-[28px] bg-card border border-border/40 p-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Biblioteca
                    </p>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                            Os meus trabalhos
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {workCounts.all} trabalho{workCounts.all !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => router.push("/app")}
                    className="h-11 rounded-2xl px-5"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo trabalho
                </Button>
            </div>

            <div className="rounded-[28px] bg-card border border-border/40 p-4 lg:p-5">
                <ProjectFilters
                    status={status}
                    onStatusChange={setStatus}
                    search={search}
                    onSearchChange={setSearch}
                />
            </div>

            {filteredWorks.length > 0 ? (
                <ProjectGrid
                    projects={filteredWorks}
                    viewMode={viewMode}
                    onDelete={(projectId) => setDeleteTarget(projectId)}
                    onArchive={handleArchiveWork}
                />
            ) : (
                <EmptyState
                    icon={FileText}
                    title="Nenhum trabalho encontrado"
                    description={
                        hasFilteredResults
                            ? "Não encontrámos nenhum trabalho com estes filtros. Ajusta a pesquisa ou volta a ver todos."
                            : "Ainda não criaste nenhum trabalho. Começa agora!"
                    }
                    className="py-16"
                    action={
                        hasFilteredResults ? (
                            <Button
                                onClick={() => {
                                    setSearch("");
                                    setStatus("all");
                                }}
                                variant="outline"
                                className="rounded-full"
                            >
                                Limpar filtros
                            </Button>
                        ) : (
                            <Button
                                onClick={() => router.push("/app")}
                                className="rounded-full"
                            >
                                Criar trabalho
                            </Button>
                        )
                    }
                />
            )}

            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            Eliminar trabalho?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget ? (
                                <>
                                    Vais eliminar &ldquo;
                                    {works.find((w) => w.id === deleteTarget)
                                        ?.title || "este trabalho"}
                                    &rdquo;. Esta acção não pode ser desfeita.
                                </>
                            ) : (
                                "Esta acção não pode ser desfeita. Todos os dados do trabalho serão removidos permanentemente."
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function mapStatus(status: string): ProjectCardData["status"] {
    const map: Record<string, ProjectCardData["status"]> = {
        DRAFT: "draft",
        IN_PROGRESS: "in_progress",
        REVIEW: "review",
        COMPLETED: "completed",
        ARCHIVED: "archived",
    };

    return map[status] || "draft";
}
