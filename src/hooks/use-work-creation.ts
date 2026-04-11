"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { resolveDocumentProfile } from "@/lib/document-profile";
import { getGenerationPollingIntervalMs } from "@/lib/generation-client-progress";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { classifyGenerationStreamFailure } from "@/lib/generation-stream-events";
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

const INITIAL_DOCUMENT_PROFILE = resolveDocumentProfile({
  type: "SECONDARY_WORK",
  educationLevel: "SECONDARY",
});

function applyCanonicalDocumentSelection(
  form: Pick<WorkFormState, "type" | "educationLevel" | "institutionName" | "coverTemplate">,
) {
  const profile = resolveDocumentProfile({
    type: form.type,
    educationLevel: form.educationLevel,
    institutionName: form.institutionName,
    coverTemplate: form.coverTemplate,
  });
  const fallbackTemplate = getSmartTemplate(
    profile.educationLevel,
    form.institutionName,
  );

  return {
    type: profile.projectType,
    educationLevel: profile.educationLevel,
    coverTemplate: resolveDocumentProfile({
      type: profile.projectType,
      educationLevel: profile.educationLevel,
      institutionName: form.institutionName,
      coverTemplate: form.coverTemplate || fallbackTemplate,
    }).coverTemplate,
  };
}

export const INITIAL_WORK_FORM: WorkFormState = {
  title: "",
  type: INITIAL_DOCUMENT_PROFILE.projectType,
  institutionName: "",
  courseName: "",
  subjectName: "",
  academicYear: new Date().getFullYear().toString(),
  advisorName: "",
  studentName: "",
  city: "",
  educationLevel: INITIAL_DOCUMENT_PROFILE.educationLevel,
  objective: "",
  methodology: "",
  citationStyle: "ABNT",
  referencesSeed: "",
  additionalInstructions: "",
  coverTemplate: INITIAL_DOCUMENT_PROFILE.coverTemplate,
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

export function getGenerationSteps(t: (key: string) => string) {
  return [
    t("steps.validating"),
    t("steps.structuring"),
    t("steps.generating"),
    t("steps.formatting"),
    t("steps.saving"),
  ];
}

export const GENERATION_STEPS = getGenerationSteps((key) => {
  const fallback: Record<string, string> = {
    "steps.validating": "Validating briefing",
    "steps.structuring": "Structuring document",
    "steps.generating": "Generating content",
    "steps.formatting": "Formatting and finalizing",
    "steps.saving": "Saving sections",
  };
  return fallback[key] ?? key;
});

type GenerationSectionItem = {
  key: string;
  title: string;
  order: number;
  generated: boolean;
  wordCount: number;
};

// ── Hook ───────────────────────────────────────────────────────────────

export function useWorkCreation() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("hooks.workCreation");
  const generationSteps = getGenerationSteps(t);

  // Form state
  const [workForm, setWorkForm] = useState<WorkFormState>({ ...INITIAL_WORK_FORM });
  const [isCreating, setIsCreating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProjectId, setGenerationProjectId] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState(t("inQueue"));
  const generationMessageRef = useRef(t("inQueue"));
  const pollingFailureCountRef = useRef(0);
  const streamFailureCountRef = useRef(0);
  const streamConnectionStartedAtRef = useRef<number | null>(null);
  const streamLastEventAtRef = useRef<number>(Date.now());
  const generationEventSourceRef = useRef<EventSource | null>(null);
  const sectionRunnerAbortRef = useRef(false);

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

  // Cleanup: abort section generation on unmount
  useEffect(() => {
    return () => {
      sectionRunnerAbortRef.current = true;
    };
  }, []);

  // Actions
  const updateWorkForm = useCallback(
    <K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) => {
      setWorkForm((current) => {
        const next = { ...current, [key]: value };
        if (
          key === "type" ||
          key === "educationLevel" ||
          key === "institutionName" ||
          key === "coverTemplate"
        ) {
          return {
            ...next,
            ...applyCanonicalDocumentSelection(next),
          };
        }
        return next;
      });
    },
    [],
  );

  const handleEducationLevelChange = useCallback(
    (value: AcademicEducationLevel) => {
      setWorkForm((current) => {
        const next = {
          ...current,
          educationLevel: value,
          type: EDUCATION_TO_TYPE[value],
        };
        return {
          ...next,
          ...applyCanonicalDocumentSelection(next),
        };
      });
    },
    [],
  );

  const handleInstitutionChange = useCallback(
    (value: string) => {
      setWorkForm((current) => {
        const next = {
          ...current,
          institutionName: value,
        };
        return {
          ...next,
          ...applyCanonicalDocumentSelection(next),
        };
      });
    },
    [],
  );

  const resetWorkForm = useCallback(() => {
    generationEventSourceRef.current?.close();
    generationEventSourceRef.current = null;
    sectionRunnerAbortRef.current = true;
    setIsCreating(false);
    setGenerationStep(0);
    setGenerationProjectId(null);
    generationMessageRef.current = t("inQueue");
    setGenerationMessage(t("inQueue"));
    setWorkForm({ ...INITIAL_WORK_FORM });
  }, [t]);

  const _runSectionGeneration = useCallback(async (projectId: string) => {
    sectionRunnerAbortRef.current = false;

    const loadSections = async (): Promise<GenerationSectionItem[]> => {
      const response = await fetchWithRetry(`/api/generate/work/${projectId}/section/placeholder`.replace("/placeholder", ""), {
        retries: 1,
        retryDelay: 500,
        timeout: 8000,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t("couldNotLoadSections"));
      }
      return payload.data?.sections ?? payload.sections ?? [];
    };

    while (!sectionRunnerAbortRef.current) {
      const sections = await loadSections();
      const nextSection = sections.find((section) => !section.generated);

      if (!nextSection) {
        break;
      }

      generationMessageRef.current = t("generatingSection", { section: nextSection.title });
      setGenerationMessage(t("generatingSection", { section: nextSection.title }));

      const response = await fetchWithRetry(`/api/generate/work/${projectId}/section/${nextSection.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey: nextSection.key }),
        retries: 0,
        timeout: 240000,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || t("sectionGenerateFailed", { section: nextSection.title }));
      }
    }
  }, [t]);

  const createWork = useCallback(async (): Promise<string | null> => {
    if (!workForm.title.trim()) {
      toast({
        title: t("topicRequired"),
        description: t("topicRequiredDescription"),
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
          throw new Error(t("sessionExpired"));
        }
        if (response.status === 403) {
          throw new Error(data.error || t("generationLimitReached"));
        }
        throw new Error(data.error || t("createError"));
      }

      toast({
        title: t("workCreated"),
        description: data.message || t("workCreatedDescription"),
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
        streamFailureCountRef.current = 0;
        streamConnectionStartedAtRef.current = null;
        streamLastEventAtRef.current = Date.now();
        sectionRunnerAbortRef.current = false;
        setGenerationProjectId(data.project.id);
        setGenerationStep(0);
        generationMessageRef.current = data.generation?.step || t("inQueue");
        setGenerationMessage(data.generation?.step || t("inQueue"));
        
        // Worker processes sections in background - go directly to workspace
        // Workspace already has banner and progress indicators for generation
        resetWorkForm();
        router.push(`/app/trabalhos/${data.project.id}`);
        return data.project.id;
      }

      resetWorkForm();
      router.push(`/app/trabalhos/${data.project.id}`);
      return data.project.id;
    } catch (error) {
      toast({
        title: t("error"),
        description:
          error instanceof Error
            ? error.message
            : t("createFailed"),
        variant: "destructive",
      });
      setIsCreating(false);
      generationMessageRef.current = t("inQueue");
      setGenerationMessage(t("inQueue"));
      return null;
    }
  }, [workForm, toast, resetWorkForm, router, t]);

  // Polling for generation progress
  useEffect(() => {
    if (!isCreating || !generationProjectId) {
      generationEventSourceRef.current?.close();
      generationEventSourceRef.current = null;
      setGenerationStep(0);
      generationMessageRef.current = t("inQueue");
      setGenerationMessage(t("inQueue"));
      return;
    }

    const updateStepFromSnapshot = (snapshot: { progress?: number; step?: string }) => {
      const nextStep = Math.min(
        Math.max(
          Math.round(((snapshot.progress || 0) / 100) * (generationSteps.length - 1)),
          0,
        ),
        generationSteps.length - 1,
      );
      setGenerationStep(nextStep);
      generationMessageRef.current = snapshot.step || t("generatingWork");
      setGenerationMessage(snapshot.step || t("generatingWork"));
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
      generationMessageRef.current = options.finalMessage;
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
        throw new Error(data.error || t("couldNotTrackGeneration"));
      }

      updateStepFromSnapshot(data);
      pollingFailureCountRef.current = 0;

      if (data.status === "READY") {
        finishWithNavigation({
          title: t("workReady"),
          description: t("workReadyDesc"),
          finalMessage: t("workReadyForReview"),
        });
      }

      if (data.status === "FAILED") {
        finishWithNavigation({
          title: t("generationInterrupted"),
          description: data.error || t("generationInterruptedDesc"),
          variant: "destructive",
          finalMessage: data.error || t("generationFailed"),
        });
      }

      return data as { status?: string; step?: string };
    };

    let pollingTimeoutId: number | null = null;
    let reconnectTimeoutId: number | null = null;
    const clearPolling = () => {
      if (pollingTimeoutId !== null) {
        window.clearTimeout(pollingTimeoutId);
        pollingTimeoutId = null;
      }
    };

    const scheduleNextPoll = (step?: string, immediate = false) => {
      if (pollingTimeoutId !== null) {
        return;
      }

      const delay = immediate ? 0 : getGenerationPollingIntervalMs(step ?? generationMessageRef.current);
      pollingTimeoutId = window.setTimeout(async () => {
        pollingTimeoutId = null;

        try {
          const data = await pollStatus();
          if (data?.status === "GENERATING") {
            scheduleNextPoll(data.step);
          }
        } catch (error) {
          pollingFailureCountRef.current += 1;

          if (pollingFailureCountRef.current >= 3) {
            clearPolling();
            finishWithNavigation({
              title: t("trackingWithDelay"),
              description: t("trackingWithDelayDesc"),
              variant: "destructive",
              finalMessage: t("trackingWithDelay"),
            });
            return;
          }

          console.warn("[useWorkCreation] generation polling failed", error);
          scheduleNextPoll(step);
        }
      }, delay);
    };

    const startPolling = () => {
      if (pollingTimeoutId !== null) {
        return;
      }

      scheduleNextPoll(generationMessageRef.current, true);
    };

    if (typeof window !== "undefined" && typeof window.EventSource !== "undefined") {
      const handleEvent = (event: MessageEvent<string>) => {
        streamFailureCountRef.current = 0;
        streamLastEventAtRef.current = Date.now();
        try {
          const parsed = JSON.parse(event.data) as { progress?: number; step?: string; error?: string };
          updateStepFromSnapshot(parsed);
        } catch {
          // keep polling fallback available for malformed events
        }
      };

      const connectEventSource = () => {
        if (pollingTimeoutId !== null || generationEventSourceRef.current) {
          return;
        }

        const eventSource = new EventSource(`/api/generate/work/${generationProjectId}/stream`);
        generationEventSourceRef.current = eventSource;
        streamConnectionStartedAtRef.current = Date.now();
        streamLastEventAtRef.current = Date.now();

        eventSource.addEventListener("open", () => {
          streamConnectionStartedAtRef.current = Date.now();
          streamLastEventAtRef.current = Date.now();
        });
        eventSource.addEventListener("job-created", handleEvent as EventListener);
        eventSource.addEventListener("progress", handleEvent as EventListener);
        eventSource.addEventListener("section-started", handleEvent as EventListener);
        eventSource.addEventListener("section-complete", handleEvent as EventListener);
        eventSource.addEventListener("complete", () => {
          streamLastEventAtRef.current = Date.now();
          void pollStatus();
        });
        eventSource.addEventListener("error", () => {
          generationEventSourceRef.current?.close();
          generationEventSourceRef.current = null;

          const classification = classifyGenerationStreamFailure({
            connectionStartedAt: streamConnectionStartedAtRef.current ?? Date.now(),
            lastEventAt: streamLastEventAtRef.current,
            consecutiveFailures: streamFailureCountRef.current,
          });

          streamFailureCountRef.current = classification.nextFailureCount;

          if (classification.shouldReconnect) {
            reconnectTimeoutId = window.setTimeout(() => {
              reconnectTimeoutId = null;
              connectEventSource();
            }, 1000);
            return;
          }

          if (classification.shouldFallbackToPolling) {
            startPolling();
          }
        });
      };

      connectEventSource();
    } else {
      startPolling();
    }

    return () => {
      generationEventSourceRef.current?.close();
      generationEventSourceRef.current = null;
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
      }
      clearPolling();
    };
  }, [generationProjectId, isCreating, router, toast, resetWorkForm, t, generationSteps.length]);

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
