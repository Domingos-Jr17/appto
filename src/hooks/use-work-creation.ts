"use client";

import { useCallback, useEffect, useState } from "react";
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
  type: "RESEARCH_WORK",
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
  SECONDARY: "SCHOOL_WORK",
  TECHNICAL: "PRACTICAL_WORK",
  HIGHER_EDUCATION: "RESEARCH_WORK",
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
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
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
        setGenerationProjectId(data.project.id);
        setGenerationStep(0);
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
      return null;
    }
  }, [workForm, toast, resetWorkForm, router]);

  // Polling for generation progress
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
    }, 3000);

    return () => window.clearInterval(intervalId);
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
    generationProjectId,
    subscriptionStatus,
    isGenerating: isCreating && generationProjectId !== null,
  };
}
