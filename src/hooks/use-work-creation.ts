"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { fetchWithRetry } from "@/lib/fetch-retry";
import type {
  AcademicEducationLevel,
  CitationStyle,
  CoverTemplate,
} from "@/types/editor";

// ── Types ──────────────────────────────────────────────────────────────

export type WorkFormState = {
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
  className: string;
  turma: string;
  facultyName: string;
  departmentName: string;
  studentNumber: string;
  semester: string;
};

export const INITIAL_WORK_FORM: WorkFormState = {
  title: "",
  type: "HIGHER_EDUCATION_WORK",
  institutionName: "",
  courseName: "",
  subjectName: "",
  academicYear: new Date().getFullYear().toString(),
  advisorName: "",
  studentName: "",
  city: "",
  educationLevel: "HIGHER_EDUCATION",
  objective: "",
  methodology: "",
  citationStyle: "ABNT",
  referencesSeed: "",
  additionalInstructions: "",
  coverTemplate: "SCHOOL_MOZ",
  researchQuestion: "",
  keywords: "",
  subtitle: "",
  className: "",
  turma: "",
  facultyName: "",
  departmentName: "",
  studentNumber: "",
  semester: "",
};

export const EDUCATION_TO_TYPE: Record<AcademicEducationLevel, string> = {
  SECONDARY: "SECONDARY_WORK",
  TECHNICAL: "TECHNICAL_WORK",
  HIGHER_EDUCATION: "HIGHER_EDUCATION_WORK",
};

function getSmartTemplate(
  level: AcademicEducationLevel,
  institution: string,
): CoverTemplate {
  const inst = institution.toLowerCase();

  if (level === "HIGHER_EDUCATION") {
    if (inst.includes("eduardo mondlan") || inst.includes("eduardo mondlane") || inst.includes(" uem")) return "UEM_STANDARD";
    if (inst.includes("pedagógic") || inst.includes("pedagogica") || inst.includes(" universidade pedagógica")) return "UP";
    if (inst.includes("universidade de moçambique") || inst.includes("universidade de mocambique") || inst.includes(" udm")) return "UDM";
    return "ABNT_GENERIC";
  }

  if (level === "TECHNICAL") {
    return "ABNT_GENERIC";
  }

  if (level === "SECONDARY") return "SCHOOL_MOZ";

  return "ABNT_GENERIC";
}

export const GENERATION_STEPS = [
  "A validar o briefing",
  "A estruturar o documento",
  "A gerar o conteúdo",
  "A formatar e finalizar",
  "A guardar as secções",
];

// ── Hook ───────────────────────────────────────────────────────────────

export function useWorkCreation() {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [workForm, setWorkForm] = useState<WorkFormState>({ ...INITIAL_WORK_FORM });
  const [isCreating, setIsCreating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProjectId, setGenerationProjectId] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState("Na fila do worker");
  const pollingFailureCountRef = useRef(0);
  const generationEventSourceRef = useRef<EventSource | null>(null);

  // Subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    remaining: number;
    worksPerMonth: number;
    worksUsed: number;
    canGenerate: boolean;
  } | null>(null);

  // Fetch subscription on mount
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
      } catch {
        // Silently fail — subscription status is non-critical
      }
    };
    fetchSubscription();
  }, []);

  // Actions
  const updateWorkForm = useCallback(
    <K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) => {
      setWorkForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleEducationLevelChange = useCallback(
    (value: AcademicEducationLevel) => {
      setWorkForm((current) => {
        const coverTemplate = getSmartTemplate(value, current.institutionName);
        return {
          ...current,
          educationLevel: value,
          type: EDUCATION_TO_TYPE[value],
          coverTemplate,
        };
      });
    },
    [],
  );

  const handleInstitutionChange = useCallback(
    (value: string) => {
      setWorkForm((current) => ({
        ...current,
        institutionName: value,
        coverTemplate: getSmartTemplate(current.educationLevel, value),
      }));
    },
    [],
  );

  const resetWorkForm = useCallback(() => {
    generationEventSourceRef.current?.close();
    generationEventSourceRef.current = null;
    setIsCreating(false);
    setGenerationStep(0);
    setGenerationProjectId(null);
    setWorkForm({ ...INITIAL_WORK_FORM });
  }, []);

  const createWork = useCallback(async (): Promise<string | null> => {
    if (!workForm.title.trim()) {
      toast({
        title: "Tema obrigatório",
        description: "Indique o tema ou título do trabalho para continuar.",
        variant: "destructive",
      });
      return null;
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
              Number.parseInt(workForm.academicYear, 10) || undefined,
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
            researchQuestion: workForm.researchQuestion || undefined,
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
        if (response.status === 401) {
          throw new Error("Sessão expirada. Entra novamente para continuar.");
        }
        if (response.status === 403) {
          throw new Error(data.error || "Limite de geração atingido. Faz upgrade do pacote.");
        }
        throw new Error(data.error || "Erro ao criar o trabalho");
      }

      toast({
        title: "Trabalho criado",
        description: data.message || "O trabalho foi criado com sucesso.",
      });

      // Refresh subscription
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
        pollingFailureCountRef.current = 0;
        setGenerationProjectId(data.project.id);
        setGenerationStep(0);
        setGenerationMessage(data.generation?.step || "Na fila do worker");
        return data.project.id;
      }

      resetWorkForm();
      router.push(`/app/trabalhos/${data.project.id}`);
      return data.project.id;
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
      setGenerationMessage("Na fila do worker");
      return null;
    }
  }, [workForm, toast, resetWorkForm, router]);

  // Polling for generation progress
  useEffect(() => {
    if (!isCreating || !generationProjectId) {
      generationEventSourceRef.current?.close();
      generationEventSourceRef.current = null;
      setGenerationStep(0);
      setGenerationMessage("Na fila do worker");
      return;
    }

    const updateStepFromSnapshot = (snapshot: { progress?: number; step?: string }) => {
      const nextStep = Math.min(
        Math.max(
          Math.round(((snapshot.progress || 0) / 100) * (GENERATION_STEPS.length - 1)),
          0,
        ),
        GENERATION_STEPS.length - 1,
      );
      setGenerationStep(nextStep);
      setGenerationMessage(snapshot.step || "A gerar o trabalho");
    };

    const finishWithNavigation = (options: {
      title: string;
      description: string;
      variant?: "destructive";
      finalMessage: string;
    }) => {
      generationEventSourceRef.current?.close();
      generationEventSourceRef.current = null;
      toast({
        title: options.title,
        description: options.description,
        variant: options.variant,
      });
      resetWorkForm();
      setGenerationMessage(options.finalMessage);
      router.push(`/app/trabalhos/${generationProjectId}`);
    };

    const pollStatus = async () => {
      const response = await fetchWithRetry(`/api/generate/work/${generationProjectId}`, {
        retries: 1,
        retryDelay: 800,
        timeout: 8000,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível acompanhar a geração do trabalho.");
      }

      updateStepFromSnapshot(data);
      pollingFailureCountRef.current = 0;

      if (data.status === "READY") {
        finishWithNavigation({
          title: "O teu trabalho está pronto!",
          description: "Explora as secções geradas e usa a IA para fazer ajustes. Boa escrita!",
          finalMessage: "Trabalho pronto para revisão",
        });
      }

      if (data.status === "FAILED") {
        finishWithNavigation({
          title: "Geração interrompida",
          description: data.error || "A estrutura do trabalho foi criada, mas a geração automática falhou.",
          variant: "destructive",
          finalMessage: data.error || "Falha na geração",
        });
      }
    };

    let intervalId: number | null = null;
    const startPolling = () => {
      if (intervalId !== null) {
        return;
      }

      intervalId = window.setInterval(async () => {
        try {
          await pollStatus();
        } catch (error) {
          pollingFailureCountRef.current += 1;

          if (pollingFailureCountRef.current >= 3) {
            if (intervalId !== null) {
              window.clearInterval(intervalId);
            }
            finishWithNavigation({
              title: "A acompanhar geração com atraso",
              description: "Não foi possível acompanhar a geração em tempo real. Vamos abrir o trabalho para continuares a acompanhar lá.",
              variant: "destructive",
              finalMessage: "A acompanhar geração com atraso",
            });
            return;
          }

          console.warn("[useWorkCreation] generation polling failed", error);
        }
      }, 3000);
    };

    if (typeof window !== "undefined" && typeof window.EventSource !== "undefined") {
      const eventSource = new EventSource(`/api/generate/work/${generationProjectId}/stream`);
      generationEventSourceRef.current = eventSource;

      const handleEvent = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as { progress?: number; step?: string; error?: string };
          updateStepFromSnapshot(parsed);
        } catch {
          // keep polling fallback available for malformed events
        }
      };

      eventSource.addEventListener("job-created", handleEvent as EventListener);
      eventSource.addEventListener("progress", handleEvent as EventListener);
      eventSource.addEventListener("section-started", handleEvent as EventListener);
      eventSource.addEventListener("section-complete", handleEvent as EventListener);
      eventSource.addEventListener("complete", () => {
        void pollStatus();
      });
      eventSource.addEventListener("error", () => {
        generationEventSourceRef.current?.close();
        generationEventSourceRef.current = null;
        startPolling();
      });
    } else {
      startPolling();
    }

    return () => {
      generationEventSourceRef.current?.close();
      generationEventSourceRef.current = null;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [generationProjectId, isCreating, router, toast, resetWorkForm]);

  return {
    workForm,
    updateWorkForm,
    handleEducationLevelChange,
    handleInstitutionChange,
    resetWorkForm,
    createWork,
    isCreating,
    generationStep,
    generationMessage,
    generationProjectId,
    subscriptionStatus,
    isGenerating: isCreating && generationProjectId !== null,
  };
}
