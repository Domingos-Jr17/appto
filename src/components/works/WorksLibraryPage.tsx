"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { WorksLibrarySkeleton } from "@/components/skeletons/WorksLibrarySkeleton";
import { GenerateWorkProgress } from "@/components/work-creation/GenerateWorkProgress";
import { CoverTemplateSelector } from "@/components/work-creation/CoverTemplateSelector";
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
import type {
    AcademicEducationLevel,
    CitationStyle,
    CoverTemplate,
} from "@/types/editor";

const WORK_TYPES = [
    { value: "MONOGRAPHY", label: "Monografia" },
    { value: "DISSERTATION", label: "Dissertação" },
    { value: "THESIS", label: "Tese" },
    { value: "REPORT", label: "Relatório" },
    { value: "ARTICLE", label: "Artigo científico" },
    { value: "SCHOOL_WORK", label: "Trabalho escolar" },
    { value: "RESEARCH_PROJECT", label: "Proposta de investigação" },
    { value: "TCC", label: "TCC" },
    { value: "INTERNSHIP_REPORT", label: "Relatório de estágio" },
    { value: "ESSAY", label: "Ensaio académico" },
    { value: "PRACTICAL_WORK", label: "Trabalho prático" },
] as const;

const EDUCATION_TO_TYPE: Record<AcademicEducationLevel, string> = {
    SECONDARY: "SCHOOL_WORK",
    TECHNICAL: "PRACTICAL_WORK",
    HIGHER_EDUCATION: "MONOGRAPHY",
};

const PROJECT_TYPE_LABELS: Record<string, ProjectCardData["type"]> = {
    MONOGRAPHY: "monografia",
    DISSERTATION: "dissertação",
    THESIS: "tese",
    ARTICLE: "artigo",
    ESSAY: "ensaio",
    REPORT: "relatório",
    SCHOOL_WORK: "trabalho escolar",
    RESEARCH_PROJECT: "trabalho de pesquisa",
    INTERNSHIP_REPORT: "relatório",
    PRACTICAL_WORK: "trabalho prático",
    TCC: "tcc",
};

const GENERATION_STEPS = [
    "A validar o briefing",
    "A gerar capa e estrutura",
    "A escrever as secções iniciais",
    "A preparar o trabalho para revisão",
] as const;

const GENERATED_SECTION_COUNTS: Record<string, number> = {
    MONOGRAPHY: 5,
    DISSERTATION: 5,
    THESIS: 6,
    ARTICLE: 4,
    ESSAY: 3,
    REPORT: 5,
    SCHOOL_WORK: 3,
    RESEARCH_PROJECT: 5,
    INTERNSHIP_REPORT: 5,
    PRACTICAL_WORK: 4,
    TCC: 5,
};

type WorkFormState = {
    title: string;
    type: string;
    institutionName: string;
    courseName: string;
    subjectName: string;
    academicYear: string;
    advisorName: string;
    studentName: string;
    city: string;
    educationLevel: AcademicEducationLevel;
    objective: string;
    methodology: string;
    citationStyle: CitationStyle;
    referencesSeed: string;
    additionalInstructions: string;
    coverTemplate: CoverTemplate;
    researchQuestion: string;
    keywords: string;
    subtitle: string;
    // Education-level specific fields
    className: string;
    turma: string;
    facultyName: string;
    departmentName: string;
    studentNumber: string;
    semester: string;
};

const INITIAL_WORK_FORM: WorkFormState = {
    title: "",
    type: "SCHOOL_WORK",
    institutionName: "",
    courseName: "",
    subjectName: "",
    academicYear: new Date().getFullYear().toString(),
    advisorName: "",
    studentName: "",
    city: "",
    educationLevel: "SECONDARY",
    objective: "",
    methodology: "",
    citationStyle: "ABNT",
    referencesSeed: "",
    additionalInstructions: "",
    coverTemplate: "SCHOOL_MOZ",
    researchQuestion: "",
    keywords: "",
    subtitle: "",
    // Education-level specific fields
    className: "",
    turma: "",
    facultyName: "",
    departmentName: "",
    studentNumber: "",
    semester: "",
};

export function WorksLibraryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const {
        projects: rawProjects,
        credits: _credits,
        isLoading,
        refresh,
    } = useAppShellData();
    const [subscriptionStatus, setSubscriptionStatus] = useState<{
        remaining: number;
        worksPerMonth: number;
        worksUsed: number;
        canGenerate: boolean;
    } | null>(null);
    const [status, setStatus] = useState<ProjectStatus>("all");
    const [search, setSearch] = useState("");
    const [viewMode, _setViewMode] = useState<ViewMode>("grid");
    const [sortBy, _setSortBy] = useState<SortOption>("updated");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [briefStep, setBriefStep] = useState(0);
    const [workForm, setWorkForm] = useState({ ...INITIAL_WORK_FORM });
    const [isCreating, setIsCreating] = useState(false);
    const [generationStep, setGenerationStep] = useState(0);
    const [generationProjectId, setGenerationProjectId] = useState<
        string | null
    >(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [openedFromUrl, setOpenedFromUrl] = useState(false);

    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                const res = await fetch("/api/subscription");
                const data = await res.json();
                if (data.success && data.data.subscription) {
                    const sub = data.data.subscription;
                    setSubscriptionStatus({
                        remaining: sub.remaining,
                        worksPerMonth: sub.worksPerMonth,
                        worksUsed: sub.worksUsed,
                        canGenerate: sub.remaining > 0,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch subscription:", error);
            }
        };
        fetchSubscription();
    }, []);

    useEffect(() => {
        const shouldOpenFromUrl = searchParams.get("new") === "1";
        const requestedType = searchParams.get("type");

        if (
            requestedType &&
            WORK_TYPES.some((type) => type.value === requestedType)
        ) {
            setWorkForm((current) => ({ ...current, type: requestedType }));
        }

        if (shouldOpenFromUrl) {
            setOpenedFromUrl(true);
            setDialogOpen(true);
            return;
        }

        if (openedFromUrl) {
            setDialogOpen(false);
            setOpenedFromUrl(false);
        }
    }, [openedFromUrl, searchParams]);

    useEffect(() => {
        if (!isCreating || !generationProjectId) {
            setGenerationStep(0);
            return;
        }

        const intervalId = window.setInterval(async () => {
            try {
                const response = await fetchWithRetry(
                    `/api/generate/work/${generationProjectId}`,
                    {
                        retries: 1,
                        retryDelay: 800,
                        timeout: 8000,
                    },
                );
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                            "Não foi possível acompanhar a geração do trabalho.",
                    );
                }

                const nextStep = Math.min(
                    Math.max(
                        Math.round(
                            ((data.progress || 0) / 100) *
                                (GENERATION_STEPS.length - 1),
                        ),
                        0,
                    ),
                    GENERATION_STEPS.length - 1,
                );
                setGenerationStep(nextStep);

                if (data.status === "READY") {
                    window.clearInterval(intervalId);
                    toast({
                        title: "O teu trabalho está pronto!",
                        description:
                            "Explora as secções geradas e usa a IA para fazer ajustes. Boa escrita!",
                    });
                    setDialogOpen(false);
                    resetWorkForm();
                    router.push(`/app/trabalhos/${generationProjectId}`);
                }

                if (data.status === "FAILED") {
                    window.clearInterval(intervalId);
                    toast({
                        title: "Geração interrompida",
                        description:
                            data.error ||
                            "A estrutura do trabalho foi criada, mas a geração automática falhou.",
                        variant: "destructive",
                    });
                    setDialogOpen(false);
                    resetWorkForm();
                    router.push(`/app/trabalhos/${generationProjectId}`);
                }
            } catch (error) {
                window.clearInterval(intervalId);
                toast({
                    title: "Erro",
                    description:
                        error instanceof Error
                            ? error.message
                            : "Não foi possível acompanhar a geração do trabalho.",
                    variant: "destructive",
                });
                setIsCreating(false);
                setGenerationProjectId(null);
            }
        }, 1200);

        return () => window.clearInterval(intervalId);
    }, [generationProjectId, isCreating, router, toast]);

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

    const _calculateCost = () =>
        20 + (GENERATED_SECTION_COUNTS[workForm.type] || 5) * 15;

    const updateWorkForm = <K extends keyof WorkFormState>(
        key: K,
        value: WorkFormState[K],
    ) => {
        setWorkForm((current) => ({ ...current, [key]: value }));
    };

    const handleEducationLevelChange = (value: AcademicEducationLevel) => {
        setWorkForm((current) => {
            // Auto-default cover template based on education level
            let coverTemplate = current.coverTemplate;
            if (value === "SECONDARY" && current.coverTemplate !== "SCHOOL_MOZ") {
                coverTemplate = "SCHOOL_MOZ";
            } else if (value !== "SECONDARY" && current.coverTemplate === "SCHOOL_MOZ") {
                coverTemplate = "DISCIPLINARY_MOZ";
            }
            return {
                ...current,
                educationLevel: value,
                type: EDUCATION_TO_TYPE[value],
                coverTemplate,
            };
        });
    };

    const resetWorkForm = () => {
        setBriefStep(0);
        setIsCreating(false);
        setGenerationStep(0);
        setGenerationProjectId(null);
        setWorkForm({ ...INITIAL_WORK_FORM });
    };

    const handleDialogOpenChange = (open: boolean) => {
        setDialogOpen(open);

        if (!open && searchParams.get("new") === "1") {
            router.replace("/app/trabalhos");
        }

        if (!open) {
            setOpenedFromUrl(false);
            resetWorkForm();
        }
    };

    const createWork = async () => {
        if (!workForm.title.trim()) {
            toast({
                title: "Tema obrigatório",
                description:
                    "Indique o tema ou título do trabalho para continuar.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);

        try {
            const response = await fetchWithRetry("/api/generate/work", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                retries: 1,
                retryDelay: 1000,
                timeout: 20000,
                body: JSON.stringify({
                    title: workForm.title,
                    type: workForm.type,
                    generateContent: true,
                    brief: {
                        institutionName: workForm.institutionName || undefined,
                        courseName: workForm.courseName || undefined,
                        subjectName: workForm.subjectName || undefined,
                        academicYear:
                            Number.parseInt(workForm.academicYear, 10) ||
                            undefined,
                        advisorName: workForm.advisorName || undefined,
                        studentName: workForm.studentName || undefined,
                        city: workForm.city || undefined,
                        educationLevel: workForm.educationLevel,
                        objective: workForm.objective || undefined,
                        methodology: workForm.methodology || undefined,
                        citationStyle: workForm.citationStyle,
                        referencesSeed: workForm.referencesSeed || undefined,
                        additionalInstructions:
                            workForm.additionalInstructions || undefined,
                        coverTemplate: workForm.coverTemplate,
                        researchQuestion:
                            workForm.researchQuestion || undefined,
                        keywords: workForm.keywords || undefined,
                        subtitle: workForm.subtitle || undefined,
                        className: workForm.className || undefined,
                        turma: workForm.turma || undefined,
                        facultyName: workForm.facultyName || undefined,
                        departmentName: workForm.departmentName || undefined,
                        studentNumber: workForm.studentNumber || undefined,
                        semester: workForm.semester || undefined,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao criar o trabalho");
            }

            toast({
                title: "Trabalho criado",
                description:
                    data.message || "O trabalho foi criado com sucesso.",
            });

            const subRes = await fetch("/api/subscription");
            const subData = await subRes.json();
            if (subData.success && subData.data.subscription) {
                const sub = subData.data.subscription;
                setSubscriptionStatus({
                    remaining: sub.remaining,
                    worksPerMonth: sub.worksPerMonth,
                    worksUsed: sub.worksUsed,
                    canGenerate: sub.remaining > 0,
                });
            }

            if (data.generation?.asynchronous) {
                setGenerationProjectId(data.project.id);
                setGenerationStep(0);
                return;
            }

            setDialogOpen(false);
            resetWorkForm();
            router.push(`/app/trabalhos/${data.project.id}`);
        } catch (error) {
            toast({
                title: "Erro",
                description:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível criar o trabalho.",
                variant: "destructive",
            });
            setIsCreating(false);
        }
    };

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
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Criar trabalho académico
                        </DialogTitle>
                        <DialogDescription>
                            Diz que trabalho precisas e a aptto gera a capa, a
                            estrutura e o conteúdo inicial automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    {isCreating ? (
                        <GenerateWorkProgress
                            steps={[...GENERATION_STEPS]}
                            activeIndex={generationStep}
                        />
                    ) : (
                        <>
                            <div className="space-y-4 py-4">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span
                                        className={
                                            briefStep === 0
                                                ? "font-semibold text-foreground"
                                                : undefined
                                        }
                                    >
                                        1. Tipo e tema
                                    </span>
                                    <span>·</span>
                                    <span
                                        className={
                                            briefStep === 1
                                                ? "font-semibold text-foreground"
                                                : undefined
                                        }
                                    >
                                        2. Contexto opcional
                                    </span>
                                </div>

                                {briefStep === 0 ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nível académico</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {([
                                                    { value: "SECONDARY", label: "Secundário", icon: "📚" },
                                                    { value: "TECHNICAL", label: "Técnico", icon: "🔧" },
                                                    { value: "HIGHER_EDUCATION", label: "Superior", icon: "🎓" },
                                                ] as const).map((level) => (
                                                    <button
                                                        key={level.value}
                                                        type="button"
                                                        onClick={() =>
                                                            handleEducationLevelChange(
                                                                level.value,
                                                            )
                                                        }
                                                        className={cn(
                                                            "rounded-xl border p-3 text-center transition-colors",
                                                            workForm.educationLevel === level.value
                                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                                : "border-border/60 hover:border-border",
                                                        )}
                                                    >
                                                        <div className="text-lg">{level.icon}</div>
                                                        <div className="mt-1 text-xs font-medium leading-tight">
                                                            {level.label}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="work-title">
                                                Tema do trabalho
                                            </Label>
                                            <Textarea
                                                id="work-title"
                                                placeholder="Ex.: Impacto do microcrédito no desenvolvimento das mulheres empreendedoras em Maputo"
                                                value={workForm.title}
                                                onChange={(event) =>
                                                    updateWorkForm(
                                                        "title",
                                                        event.target.value,
                                                    )
                                                }
                                                rows={4}
                                            />
                                        </div>

                                        <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                            {subscriptionStatus ? (
                                                <>
                                                    Tem{" "}
                                                    <span className="font-medium text-foreground">
                                                        {subscriptionStatus.remaining} trabalho
                                                        {subscriptionStatus.remaining !== 1 ? "s" : ""}
                                                    </span>{" "}
                                                    disponível{subscriptionStatus.remaining !== 1 ? "is" : ""} este mês.
                                                    {!subscriptionStatus.canGenerate && (
                                                        <span className="block mt-1 text-warning font-medium">
                                                            Limite atingido. Faça upgrade do plano ou compre trabalhos extras.
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    A geração completa deste trabalho usa 1 dos seus trabalhos mensais disponíveis.
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                        {/* Nível selecionado: workForm.educationLevel — campos condicionais */}

                                        {/* === SECONDARY fields === */}
                                        {workForm.educationLevel === "SECONDARY" && (
                                            <>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="institution">
                                                            Escola
                                                        </Label>
                                                        <Input
                                                            id="institution"
                                                            value={workForm.institutionName}
                                                            onChange={(e) => updateWorkForm("institutionName", e.target.value)}
                                                            placeholder="Ex.: Escola Secundária Josina Machel"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="subject">
                                                            Disciplina
                                                        </Label>
                                                        <Input
                                                            id="subject"
                                                            value={workForm.subjectName}
                                                            onChange={(e) => updateWorkForm("subjectName", e.target.value)}
                                                            placeholder="Ex.: História"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="className">
                                                            Classe
                                                        </Label>
                                                        <Select
                                                            value={workForm.className}
                                                            onValueChange={(v) => updateWorkForm("className", v)}
                                                        >
                                                            <SelectTrigger id="className">
                                                                <SelectValue placeholder="Selecionar" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="10ª">10ª Classe</SelectItem>
                                                                <SelectItem value="11ª">11ª Classe</SelectItem>
                                                                <SelectItem value="12ª">12ª Classe</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="turma">
                                                            Turma
                                                        </Label>
                                                        <Input
                                                            id="turma"
                                                            value={workForm.turma}
                                                            onChange={(e) => updateWorkForm("turma", e.target.value)}
                                                            placeholder="Ex.: A"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="studentNumber">
                                                            Nº
                                                        </Label>
                                                        <Input
                                                            id="studentNumber"
                                                            value={workForm.studentNumber}
                                                            onChange={(e) => updateWorkForm("studentNumber", e.target.value)}
                                                            placeholder="Ex.: 15"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="student">
                                                            Nome do aluno(a)
                                                        </Label>
                                                        <Input
                                                            id="student"
                                                            value={workForm.studentName}
                                                            onChange={(e) => updateWorkForm("studentName", e.target.value)}
                                                            placeholder="Ex.: Maria João António"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="advisor">
                                                            Professor(a)
                                                        </Label>
                                                        <Input
                                                            id="advisor"
                                                            value={workForm.advisorName}
                                                            onChange={(e) => updateWorkForm("advisorName", e.target.value)}
                                                            placeholder="Ex.: Prof. Carlos Bento"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="city">Cidade</Label>
                                                    <Input
                                                        id="city"
                                                        value={workForm.city}
                                                        onChange={(e) => updateWorkForm("city", e.target.value)}
                                                        placeholder="Ex.: Maputo"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* === TECHNICAL fields === */}
                                        {workForm.educationLevel === "TECHNICAL" && (
                                            <>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="institution">
                                                            Instituição
                                                        </Label>
                                                        <Input
                                                            id="institution"
                                                            value={workForm.institutionName}
                                                            onChange={(e) => updateWorkForm("institutionName", e.target.value)}
                                                            placeholder="Ex.: ISTEG"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="course">
                                                            Curso
                                                        </Label>
                                                        <Input
                                                            id="course"
                                                            value={workForm.courseName}
                                                            onChange={(e) => updateWorkForm("courseName", e.target.value)}
                                                            placeholder="Ex.: Informática"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="student">
                                                            Nome do estudante
                                                        </Label>
                                                        <Input
                                                            id="student"
                                                            value={workForm.studentName}
                                                            onChange={(e) => updateWorkForm("studentName", e.target.value)}
                                                            placeholder="Ex.: Maria João António"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="advisor">
                                                            Professor ou orientador
                                                        </Label>
                                                        <Input
                                                            id="advisor"
                                                            value={workForm.advisorName}
                                                            onChange={(e) => updateWorkForm("advisorName", e.target.value)}
                                                            placeholder="Ex.: Prof. Doutor João Luís"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="studentNumber">
                                                            Nº de Estudante
                                                        </Label>
                                                        <Input
                                                            id="studentNumber"
                                                            value={workForm.studentNumber}
                                                            onChange={(e) => updateWorkForm("studentNumber", e.target.value)}
                                                            placeholder="Ex.: 2024/001"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="subject">
                                                            Disciplina
                                                        </Label>
                                                        <Input
                                                            id="subject"
                                                            value={workForm.subjectName}
                                                            onChange={(e) => updateWorkForm("subjectName", e.target.value)}
                                                            placeholder="Ex.: Gestão de Redes"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="city">Cidade</Label>
                                                    <Input
                                                        id="city"
                                                        value={workForm.city}
                                                        onChange={(e) => updateWorkForm("city", e.target.value)}
                                                        placeholder="Ex.: Maputo"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* === HIGHER_EDUCATION fields === */}
                                        {workForm.educationLevel === "HIGHER_EDUCATION" && (
                                            <>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="institution">
                                                            Universidade
                                                        </Label>
                                                        <Input
                                                            id="institution"
                                                            value={workForm.institutionName}
                                                            onChange={(e) => updateWorkForm("institutionName", e.target.value)}
                                                            placeholder="Ex.: Universidade Eduardo Mondlane"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="facultyName">
                                                            Faculdade
                                                        </Label>
                                                        <Input
                                                            id="facultyName"
                                                            value={workForm.facultyName}
                                                            onChange={(e) => updateWorkForm("facultyName", e.target.value)}
                                                            placeholder="Ex.: Faculdade de Economia"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="departmentName">
                                                            Departamento
                                                        </Label>
                                                        <Input
                                                            id="departmentName"
                                                            value={workForm.departmentName}
                                                            onChange={(e) => updateWorkForm("departmentName", e.target.value)}
                                                            placeholder="Ex.: Departamento de Gestão"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="course">
                                                            Curso
                                                        </Label>
                                                        <Input
                                                            id="course"
                                                            value={workForm.courseName}
                                                            onChange={(e) => updateWorkForm("courseName", e.target.value)}
                                                            placeholder="Ex.: Gestão"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="student">
                                                            Nome do estudante
                                                        </Label>
                                                        <Input
                                                            id="student"
                                                            value={workForm.studentName}
                                                            onChange={(e) => updateWorkForm("studentName", e.target.value)}
                                                            placeholder="Ex.: Maria João António"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="advisor">
                                                            Orientador
                                                        </Label>
                                                        <Input
                                                            id="advisor"
                                                            value={workForm.advisorName}
                                                            onChange={(e) => updateWorkForm("advisorName", e.target.value)}
                                                            placeholder="Ex.: Prof. Doutor João Luís"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="studentNumber">
                                                            Nº de Estudante
                                                        </Label>
                                                        <Input
                                                            id="studentNumber"
                                                            value={workForm.studentNumber}
                                                            onChange={(e) => updateWorkForm("studentNumber", e.target.value)}
                                                            placeholder="Ex.: 2024/001"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="subject">
                                                            Disciplina
                                                        </Label>
                                                        <Input
                                                            id="subject"
                                                            value={workForm.subjectName}
                                                            onChange={(e) => updateWorkForm("subjectName", e.target.value)}
                                                            placeholder="Ex.: Metodologia de Investigação"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="semester">
                                                            Semestre
                                                        </Label>
                                                        <Select
                                                            value={workForm.semester}
                                                            onValueChange={(v) => updateWorkForm("semester", v)}
                                                        >
                                                            <SelectTrigger id="semester">
                                                                <SelectValue placeholder="Selecionar" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="I">I Semestre</SelectItem>
                                                                <SelectItem value="II">II Semestre</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="city">Cidade</Label>
                                                    <Input
                                                        id="city"
                                                        value={workForm.city}
                                                        onChange={(e) => updateWorkForm("city", e.target.value)}
                                                        placeholder="Ex.: Maputo"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <CoverTemplateSelector
                                            value={workForm.coverTemplate}
                                            onChange={(value) =>
                                                updateWorkForm(
                                                    "coverTemplate",
                                                    value,
                                                )
                                            }
                                        />

                                        <Accordion type="single" collapsible>
                                            <AccordionItem
                                                value="advanced-fields"
                                                className="border-border/60"
                                            >
                                                <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:text-foreground">
                                                    Mais opções
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="space-y-4 pt-2">
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="year">
                                                                    Ano lectivo
                                                                </Label>
                                                                <Input
                                                                    id="year"
                                                                    value={
                                                                        workForm.academicYear
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateWorkForm(
                                                                            "academicYear",
                                                                            event.target.value
                                                                                .replace(
                                                                                    /\D/g,
                                                                                    "",
                                                                                )
                                                                                .slice(
                                                                                    0,
                                                                                    4,
                                                                                ),
                                                                        )
                                                                    }
                                                                    placeholder="2026"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="objective">
                                                                Objetivo
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground">
                                                                Ajuda a IA a
                                                                manter o foco ao
                                                                gerar o
                                                                conteúdo.
                                                            </p>
                                                            <Textarea
                                                                id="objective"
                                                                value={
                                                                    workForm.objective
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateWorkForm(
                                                                        "objective",
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                rows={3}
                                                                placeholder="Ex.: analisar o impacto da digitalização no sector bancário moçambicano."
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="methodology">
                                                                Metodologia ou
                                                                orientação
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground">
                                                                {workForm.educationLevel === "SECONDARY"
                                                                    ? "Preencha apenas se o professor pediu."
                                                                    : "Descreva a abordagem a seguir."}
                                                            </p>
                                                            <Textarea
                                                                id="methodology"
                                                                value={
                                                                    workForm.methodology
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateWorkForm(
                                                                        "methodology",
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                rows={3}
                                                                placeholder="Ex.: revisão bibliográfica e estudo comparativo."
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="references-seed">
                                                                Referências
                                                                iniciais
                                                            </Label>
                                                            <Textarea
                                                                id="references-seed"
                                                                value={
                                                                    workForm.referencesSeed
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateWorkForm(
                                                                        "referencesSeed",
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                rows={3}
                                                                placeholder="Autores, livros, artigos ou links que devem orientar o trabalho."
                                                            />
                                                        </div>

                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="citation-style">
                                                                    Norma de
                                                                    citação
                                                                </Label>
                                                                <Select
                                                                    value={
                                                                        workForm.citationStyle
                                                                    }
                                                                    onValueChange={(
                                                                        value,
                                                                    ) =>
                                                                        updateWorkForm(
                                                                            "citationStyle",
                                                                            value as CitationStyle,
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger id="citation-style">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="ABNT">
                                                                            ABNT
                                                                        </SelectItem>
                                                                        <SelectItem value="APA">
                                                                            APA
                                                                        </SelectItem>
                                                                        <SelectItem value="Vancouver">
                                                                            Vancouver
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="additional-instructions">
                                                                Notas adicionais
                                                            </Label>
                                                            <Textarea
                                                                id="additional-instructions"
                                                                value={
                                                                    workForm.additionalInstructions
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateWorkForm(
                                                                        "additionalInstructions",
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                rows={3}
                                                                placeholder="Ex.: incluir exemplos de Moçambique e manter linguagem formal."
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="research-question">
                                                                Pergunta de
                                                                investigação
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground">
                                                                {workForm.educationLevel === "SECONDARY"
                                                                    ? "Preencha apenas se o professor pediu."
                                                                    : "A pergunta central que o trabalho vai responder."}
                                                            </p>
                                                            <Textarea
                                                                id="research-question"
                                                                value={
                                                                    workForm.researchQuestion
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateWorkForm(
                                                                        "researchQuestion",
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                rows={2}
                                                                placeholder="Ex.: Quais os factores que influenciam a digitalização no sector bancário em Moçambique?"
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="keywords">
                                                                Palavras-chave
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground">
                                                                Termos que
                                                                definem o foco
                                                                da pesquisa
                                                                (separados por
                                                                vírgula).
                                                            </p>
                                                            <Input
                                                                id="keywords"
                                                                value={
                                                                    workForm.keywords
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateWorkForm(
                                                                        "keywords",
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Ex.: digitalização, sector bancário, Moçambique, inovação"
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="subtitle">
                                                                Subtítulo
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground">
                                                                Subtítulo
                                                                descritivo do
                                                                trabalho.
                                                            </p>
                                                            <Input
                                                                id="subtitle"
                                                                value={
                                                                    workForm.subtitle
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateWorkForm(
                                                                        "subtitle",
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Ex.: Um estudo de caso no sector bancário moçambicano"
                                                            />
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        handleDialogOpenChange(false)
                                    }
                                >
                                    Cancelar
                                </Button>
                                {briefStep === 1 ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setBriefStep(0)}
                                    >
                                        Voltar
                                    </Button>
                                ) : null}
                                {briefStep === 0 ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => setBriefStep(1)}
                                            disabled={!workForm.title.trim()}
                                        >
                                            Adicionar contexto
                                        </Button>
                                        <Button
                                            onClick={createWork}
                                            disabled={
                                                !workForm.title.trim() ||
                                                (subscriptionStatus ? !subscriptionStatus.canGenerate : false)
                                            }
                                            className="gap-2"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Gerar agora
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        onClick={createWork}
                                        disabled={
                                            !workForm.title.trim() ||
                                            (subscriptionStatus ? !subscriptionStatus.canGenerate : false)
                                        }
                                        className="gap-2"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Gerar trabalho
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <div className="flex flex-col gap-4 rounded-[28px] glass glass-border p-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Biblioteca
                    </p>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                            Os meus trabalhos
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {workCounts.all} no total · {workCounts.inProgress}{" "}
                            em curso · {workCounts.completed} concluídos ·{" "}
                            {workCounts.draft} rascunhos
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setDialogOpen(true)}
                    className="h-11 rounded-2xl px-5"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar trabalho
                </Button>
            </div>

            <div className="glass glass-border rounded-[28px] p-4 lg:p-5">
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
                                onClick={() => setDialogOpen(true)}
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
