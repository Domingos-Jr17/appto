"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
    const t = useTranslations("worksLibrary");
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
                type: PROJECT_TYPE_LABELS[project.type] || t("type.monograph"),
                typeLabel:
                    project.type === "SECONDARY_WORK"
                        ? t("type.schoolWork")
                        : project.type === "TECHNICAL_WORK"
                          ? t("type.technicalWork")
                          : project.type === "HIGHER_EDUCATION_WORK"
                            ? t("type.academicWork")
                            : t("type.monograph"),
                course: project.brief?.courseName || null,
                institution: project.brief?.institutionName || null,
                progress: calculateProjectProgress(project),
                generationStatus: project.generationStatus,
                generationProgress: project.generationProgress,
                generationStep: project.generationStep,
                status: mapStatus(project.status),
                lastUpdated: formatRelativeTime(new Date(project.updatedAt)),
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
            })),
        [rawProjects, t],
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
                        new Date(right.updatedAt || right.createdAt).getTime() -
                        new Date(left.updatedAt || left.createdAt).getTime()
                    );
                default:
                    return (
                        new Date(right.updatedAt || right.createdAt).getTime() -
                        new Date(left.updatedAt || left.createdAt).getTime()
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
                throw new Error(t("toast.updateFailed"));
            }

            toast({
                title:
                    newStatus === "ARCHIVED"
                        ? t("toast.archived")
                        : t("toast.restored"),
            });
            await refresh();
        } catch {
            toast({
                title: t("toast.updateFailed"),
                description: t("toast.updateFailedDesc"),
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
                throw new Error(t("toast.deleteFailed"));
            }

            toast({
                title: t("toast.deleted"),
                description: t("toast.deletedDesc"),
            });
            await refresh();
        } catch {
            toast({
                title: t("toast.deleteFailed"),
                description: t("toast.deleteFailedDesc"),
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
                        {t("header.library")}
                    </p>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                            {t("header.myWorks")}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {workCounts.all}{" "}
                            {workCounts.all === 1
                                ? t("header.workCount")
                                : t("header.workCountPlural")}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => router.push("/app")}
                    className="h-11 rounded-2xl px-5"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("header.newWork")}
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
                    title={t("empty.title")}
                    description={
                        hasFilteredResults
                            ? t("empty.description")
                            : t("empty.descriptionFirst")
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
                                {t("empty.clearFilters")}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => router.push("/app")}
                                className="rounded-full"
                            >
                                {t("empty.createWork")}
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
                            {t("delete.title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget ? (
                                t("delete.description", {
                                    title:
                                        works.find((w) => w.id === deleteTarget)
                                            ?.title || t("delete.fallbackTitle"),
                                })
                            ) : (
                                t("delete.description", {
                                    title: t("delete.fallbackTitle"),
                                })
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setDeleteTarget(null)}
                        >
                            {t("delete.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {t("delete.delete")}
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
