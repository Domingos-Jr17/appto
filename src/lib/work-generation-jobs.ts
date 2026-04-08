import { getFriendlyAIErrorMessage, runAIChatCompletion, runAIChatStream } from "@/lib/ai";
import { enrichReferencesWithAcademicSources } from "@/lib/academic-search";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { processQueuedGenerationJobs as processQueuedJobs, triggerQueuedGenerationProcessing as triggerQueuedProcessing } from "@/lib/generation/job-queue";
import {
  batchGetWorkGenerationStatusAsync,
  getWorkGenerationStatus,
  getWorkGenerationStatusAsync,
  setPersistedWorkGenerationJob,
  setWorkGenerationJob,
} from "@/lib/generation/job-status-store";
import {
  buildGenerationSectionKey,
} from "@/lib/generation/run-domain";
import {
  createGenerationRun,
  updateGenerationAttemptState,
  updateGenerationRunState,
  updateSectionRunState,
} from "@/lib/generation/run-repository";
import {
  formatProjectType,
  generateCover,
  generateTitlePage,
} from "@/lib/generation/work-generation-artifacts";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";
import { serializeProjectBrief, toWorkBriefInput } from "@/lib/projects/project-brief";
import { subscriptionService } from "@/lib/subscription";
import {
  createProgressTracker,
} from "@/lib/work-generation-state";
import {
  buildBriefContext,
  buildSectionGenerationPrompt,
  getWorkGenerationProfile,
  detectCrossSectionRepetition,
  type SectionValidationIssue,
  type SectionTemplate,
  type WordRange,
  validateGeneratedSection,
} from "@/lib/work-generation-prompts";
import type { WorkBriefInput } from "@/types/editor";

export const serializeBrief = serializeProjectBrief;
export const getSectionTemplatesForType = getSectionTemplates;
export {
  batchGetWorkGenerationStatusAsync,
  formatProjectType,
  generateCover,
  generateTitlePage,
  getWorkGenerationStatus,
  getWorkGenerationStatusAsync,
};

export type SectionAttemptFailureReason =
  | "accepted"
  | "provider_error"
  | "empty_response"
  | "validation_failed";

export type SectionGenerationFailureReason =
  | "provider_error"
  | "empty_response"
  | "validation_failed";

export interface SectionAttemptDiagnostics {
  attemptNumber: number;
  providerMode: "stream";
  content: string | null;
  failureReason: SectionAttemptFailureReason;
  validationIssues: SectionValidationIssue[];
  hadAnyContent: boolean;
  wordCount: number;
  errorMessage: string | null;
}

interface SectionGenerationResult {
  content: string | null;
  accepted: boolean;
  degraded: boolean;
  failureReason: SectionGenerationFailureReason | null;
  validationIssues: SectionValidationIssue[];
  hadAnyContent: boolean;
  wordCount: number;
  attempts: SectionAttemptDiagnostics[];
  error: Error | null;
}

export interface SectionGenerationOutcome {
  title: string;
  accepted: boolean;
  degraded: boolean;
  hadAnyContent: boolean;
  failureReason: SectionGenerationFailureReason | null;
}

interface GenerationCompletionDecision {
  status: "READY" | "FAILED";
  step: string;
  error: string | null;
  shouldRefund: boolean;
}

const SYSTEM_PROMPT = `Voc� � um especialista em escrita acad�mica para estudantes mo�ambicanos.
Gere conte�do acad�mico de alta qualidade em Portugu�s de Mo�ambique.
Siga a norma de cita��o pedida no briefing.
Adapte o n�vel de linguagem ao n�vel educacional indicado:
- SECONDARY: linguagem simples, frases curtas, vocabul�rio acess�vel, sem jarg�o excessivo
- TECHNICAL: terminologia t�cnica pr�tica, foco em aplica��es
- HIGHER_EDUCATION: linguagem formal, terminologia acad�mica, cita��es obrigat�rias
Nunca invente metadados da capa sem base no briefing.`;

function getSystemPromptForEducation(educationLevel?: string | null): string {
  if (educationLevel === "SECONDARY") {
    return `Voc� � um assistente de escrita para estudantes do ensino secund�rio mo�ambicano.
Gere conte�do simples e acess�vel em Portugu�s de Mo�ambique.
Use frases curtas e vocabul�rio acess�vel.
Evite jarg�o t�cnico excessivo.
N�o � obrigat�rio incluir cita��es formais no texto.
Estrutura b�sica: Introdu��o, Desenvolvimento, Conclus�o.`;
  }
  if (educationLevel === "TECHNICAL") {
    return `Voc� � um assistente de escrita para estudantes do ensino t�cnico profissional mo�ambicano.
Gere conte�do t�cnico e pr�tico em Portugu�s de Mo�ambique.
Use terminologia t�cnica apropriada com foco em aplica��es pr�ticas.
Inclua exemplos relevantes para o contexto profissional.
Cite fontes quando relevante.`;
  }
  return SYSTEM_PROMPT;
}

function countGeneratedWords(content?: string | null) {
  return content?.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function createSectionAttemptDiagnostics(input: {
  attemptNumber: number;
  content: string | null;
  validationIssues?: SectionValidationIssue[];
  error?: Error | null;
}): SectionAttemptDiagnostics {
  const trimmedContent = input.content?.trim() || "";
  const validationIssues = input.validationIssues ?? [];
  const hadAnyContent = trimmedContent.length > 0;
  const wordCount = countGeneratedWords(trimmedContent);

  if (hadAnyContent && validationIssues.length === 0) {
    return {
      attemptNumber: input.attemptNumber,
      providerMode: "stream",
      content: trimmedContent,
      failureReason: "accepted",
      validationIssues,
      hadAnyContent,
      wordCount,
      errorMessage: null,
    };
  }

  if (hadAnyContent) {
    return {
      attemptNumber: input.attemptNumber,
      providerMode: "stream",
      content: trimmedContent,
      failureReason: "validation_failed",
      validationIssues,
      hadAnyContent,
      wordCount,
      errorMessage: input.error?.message ?? null,
    };
  }

  return {
    attemptNumber: input.attemptNumber,
    providerMode: "stream",
    content: null,
    failureReason: input.error ? "provider_error" : "empty_response",
    validationIssues,
    hadAnyContent: false,
    wordCount: 0,
    errorMessage: input.error?.message ?? null,
  };
}

export function summarizeSectionGenerationAttempts(
  attempts: SectionAttemptDiagnostics[],
): SectionGenerationResult {
  const acceptedAttempt = attempts.find((attempt) => attempt.failureReason === "accepted");
  if (acceptedAttempt?.content) {
    return {
      content: acceptedAttempt.content,
      accepted: true,
      degraded: false,
      failureReason: null,
      validationIssues: [],
      hadAnyContent: true,
      wordCount: acceptedAttempt.wordCount,
      attempts,
      error: null,
    };
  }

  const bestRejectedAttempt = attempts
    .filter((attempt) => attempt.failureReason === "validation_failed" && attempt.content)
    .sort((left, right) => right.wordCount - left.wordCount)[0];

  if (bestRejectedAttempt?.content) {
    return {
      content: bestRejectedAttempt.content,
      accepted: false,
      degraded: true,
      failureReason: "validation_failed",
      validationIssues: bestRejectedAttempt.validationIssues,
      hadAnyContent: true,
      wordCount: bestRejectedAttempt.wordCount,
      attempts,
      error: new Error(
        bestRejectedAttempt.validationIssues.map((issue) => issue.message).join(" "),
      ),
    };
  }

  const lastAttempt = attempts[attempts.length - 1];
  return {
    content: null,
    accepted: false,
    degraded: false,
    failureReason:
      lastAttempt?.failureReason === "accepted" ? null : lastAttempt?.failureReason ?? "empty_response",
    validationIssues: lastAttempt?.validationIssues ?? [],
    hadAnyContent: attempts.some((attempt) => attempt.hadAnyContent),
    wordCount: 0,
    attempts,
    error: lastAttempt?.errorMessage ? new Error(lastAttempt.errorMessage) : null,
  };
}

function formatFailureReasonSummary(outcomes: SectionGenerationOutcome[]) {
  const providerErrorCount = outcomes.filter((outcome) => outcome.failureReason === "provider_error").length;
  const emptyResponseCount = outcomes.filter((outcome) => outcome.failureReason === "empty_response").length;
  const validationFailureCount = outcomes.filter((outcome) => outcome.failureReason === "validation_failed").length;

  if (providerErrorCount > 0 && emptyResponseCount === 0 && validationFailureCount === 0) {
    return {
      step: "Falha na gera��o: a IA n�o respondeu de forma est�vel.",
      error: "A gera��o falhou porque todas as sec��es terminaram com erro do provider de IA.",
    };
  }

  if (emptyResponseCount > 0 && providerErrorCount === 0 && validationFailureCount === 0) {
    return {
      step: "Falha na gera��o: a IA devolveu respostas vazias.",
      error: "A IA respondeu sem conte�do utiliz�vel para todas as sec��es solicitadas.",
    };
  }

  if (validationFailureCount > 0 && providerErrorCount === 0 && emptyResponseCount === 0) {
    return {
      step: "Falha na gera��o: o conte�do n�o atingiu o m�nimo exigido.",
      error: "A IA gerou texto, mas nenhuma sec��o cumpriu os requisitos m�nimos de qualidade.",
    };
  }

  return {
    step: "Falha na gera��o: a IA n�o produziu sec��es utiliz�veis.",
    error: `Resultado sem conte�do utiliz�vel: ${providerErrorCount} erro(s) de provider, ${emptyResponseCount} resposta(s) vazias e ${validationFailureCount} rejei��o(�es) por valida��o.`,
  };
}

export function resolveGenerationCompletionDecision(
  outcomes: SectionGenerationOutcome[],
): GenerationCompletionDecision {
  const usableCount = outcomes.filter((outcome) => outcome.accepted || outcome.degraded).length;
  const degradedCount = outcomes.filter((outcome) => outcome.degraded).length;
  const failedCount = outcomes.length - usableCount;

  if (usableCount === 0) {
    const summary = formatFailureReasonSummary(outcomes);
    return {
      status: "FAILED",
      step: summary.step,
      error: summary.error,
      shouldRefund: true,
    };
  }

  if (degradedCount > 0 && failedCount > 0) {
    return {
      status: "READY",
      step: `Trabalho pronto ��� ${degradedCount} sec��o(�es) precisam de revis�o e ${failedCount} n�o foram conclu�das.`,
      error: "Algumas sec��es ficaram abaixo do esperado e outras n�o foram conclu�das automaticamente.",
      shouldRefund: false,
    };
  }

  if (degradedCount > 0) {
    return {
      status: "READY",
      step: `Trabalho pronto ��� ${degradedCount} sec��o(�es) precisam de revis�o antes da submiss�o.`,
      error: "Algumas sec��es foram guardadas como rascunho e precisam de revis�o ou regenera��o.",
      shouldRefund: false,
    };
  }

  if (failedCount > 0) {
    return {
      status: "READY",
      step: `Trabalho pronto ��� ${failedCount} sec��o(�es) n�o foram conclu�das automaticamente. Pode re-gerar individualmente.`,
      error: "Algumas sec��es n�o foram conclu�das automaticamente e podem ser regeneradas depois.",
      shouldRefund: false,
    };
  }

  return {
    status: "READY",
    step: "Trabalho pronto para revis�o",
    error: null,
    shouldRefund: false,
  };
}

async function generateSectionWithStreaming(
  projectId: string,
  sectionTitle: string,
  systemPrompt: string,
  sectionPrompt: string,
  maxTokens: number,
  onChunk: (content: string) => Promise<void>,
) {
  let content = "";
  let lastEmitTime = 0;
  const THROTTLE_MS = 200;

  try {
    logger.info("[stream] Starting AI stream", { projectId, sectionTitle });

    const textStream = await runAIChatStream({
      model: "",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sectionPrompt },
      ],
      temperature: 0,
      max_tokens: maxTokens,
    });

    const reader = textStream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        content += textChunk;

        const now = Date.now();
        if (now - lastEmitTime >= THROTTLE_MS && content.length > 0) {
          await onChunk(content);
          lastEmitTime = now;
        }
      }

      logger.info("[stream] Stream complete", { projectId, sectionTitle, contentLength: content.length });

      if (content) {
        await onChunk(content);
      }

      return { content: content.trim(), error: null };
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    logger.error("[stream] Stream error", { projectId, sectionTitle, error: String(error) });
    return {
      content: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

async function generateSectionWithRetry(
  projectId: string,
  template: SectionTemplate,
  sectionPlan: { guidance: string; range: WordRange },
  systemPrompt: string,
  sectionPrompt: string,
  onChunk: (content: string) => Promise<void>,
) {
  const attemptDiagnostics: SectionAttemptDiagnostics[] = [];
  const MAX_OUTPUT_TOKENS = env.DEFAULT_MAX_OUTPUT_TOKENS || 8000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const calculatedTokens = Math.ceil((sectionPlan.range.max || 800) * 1.8);
    const maxTokens = Math.min(calculatedTokens, MAX_OUTPUT_TOKENS);

    const repairPrompt = attempt === 0
      ? sectionPrompt
      : `${sectionPrompt}\n\nA resposta anterior para a sec��o "${template.title}" n�o cumpriu os requisitos. Regere a sec��o respeitando todos os requisitos.`;

    const { content, error } = await generateSectionWithStreaming(
      projectId,
      template.title,
      systemPrompt,
      repairPrompt,
      maxTokens,
      onChunk,
    );

    const issues = content
      ? validateGeneratedSection(content, template.title, sectionPlan.range, "")
      : [];
    const diagnostics = createSectionAttemptDiagnostics({
      attemptNumber: attempt + 1,
      content,
      validationIssues: issues,
      error,
    });
    attemptDiagnostics.push(diagnostics);

    if (diagnostics.failureReason === "accepted") {
      return summarizeSectionGenerationAttempts(attemptDiagnostics);
    }
  }

  return summarizeSectionGenerationAttempts(attemptDiagnostics);

}

const SECTION_TEMPLATES: Record<string, SectionTemplate[]> = {
  SECONDARY_WORK: [
    { title: "1. Introdu��o", order: 3 },
    { title: "2. Desenvolvimento", order: 4 },
    { title: "3. Conclus�o", order: 5 },
  ],
  TECHNICAL_WORK: [
    { title: "1. Introdu��o", order: 3 },
    { title: "2. Fundamenta��o Te�rica", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. An�lise Pr�tica", order: 6 },
    { title: "5. Conclus�o", order: 7 },
    { title: "6. Recomenda��es", order: 8 },
  ],
  HIGHER_EDUCATION_WORK: [
    { title: "1. Introdu��o", order: 6 },
    { title: "2. Revis�o da Literatura", order: 7 },
    { title: "3. Metodologia", order: 8 },
    { title: "4. An�lise e Discuss�o", order: 9 },
    { title: "5. Conclus�o", order: 10 },
    { title: "6. Recomenda��es", order: 11 },
  ],
};

export function getSectionTemplates(type: string, _educationLevel?: string | null) {
  return SECTION_TEMPLATES[type] || SECTION_TEMPLATES.HIGHER_EDUCATION_WORK;
}

async function saveSectionToDb(
  projectId: string,
  title: string,
  content: string,
) {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const result = await db.documentSection.updateMany({
    where: { projectId, title },
    data: { content, wordCount },
  });

  if (result.count === 0) {
    logger.warn("[work-generation] section not found, creating fallback", { projectId, title });

    const maxOrder = await db.documentSection.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    await db.documentSection.create({
      data: {
        projectId,
        title,
        content,
        wordCount,
        order: (maxOrder?.order ?? 0) + 1,
      },
    });
  }
}

async function loadGeneratedSections(
  projectId: string,
  templates: SectionTemplate[],
) {
  const sections = await db.documentSection.findMany({
    where: { projectId, title: { in: templates.map((t) => t.title) } },
    select: { title: true, content: true },
  });
  return sections
    .filter((s) => s.content && s.content.trim().length > 0)
    .map((s) => ({ title: s.title, content: s.content! }));
}

function buildDocumentPlan(templates: SectionTemplate[]) {
  return templates.map((template, index) => `${index + 1}. ${template.title}`);
}

function buildSectionOutline(template: SectionTemplate, profile: ReturnType<typeof getWorkGenerationProfile>) {
  return profile.sections.find((section) => section.title === template.title)?.suggestedSubheadings ?? [];
}

async function generateWorkSectionBySection(
  projectId: string,
  title: string,
  type: string,
  brief: WorkBriefInput,
  templates: SectionTemplate[],
  userId: string,
  generationContext: { runId: string; attemptId: string },
  onProgress: (progress: number, step: string) => Promise<void>,
) {
  // Enrich references with real academic sources from Semantic Scholar
  // Run with timeout to avoid blocking generation for 5-10s
  let enrichedBrief = brief;
  if (!brief.referencesSeed || brief.referencesSeed.trim().length < 20) {
    try {
      const enriched = await Promise.race([
        enrichReferencesWithAcademicSources(title, brief.referencesSeed || "", 6),
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 2000)),
      ]);
      if (enriched && enriched !== brief.referencesSeed) {
        enrichedBrief = { ...brief, referencesSeed: enriched };
      }
    } catch {
      // Skip enrichment if it fails ��� generation can proceed without it
    }
  }

  const profile = getWorkGenerationProfile(type, enrichedBrief, templates);
  const resolvedEducationLevel = enrichedBrief.educationLevel || "HIGHER_EDUCATION";
  const systemPrompt = getSystemPromptForEducation(resolvedEducationLevel);
  const typeLabel = formatProjectType(type);
  const isHigherEd = enrichedBrief.educationLevel === "HIGHER_EDUCATION";

  const totalSteps = templates.length + (profile.abstract.required ? 1 : 0) + 1 + (isHigherEd ? 1 : 0); // +1 for cover, +1 for title page if higher ed
  const progressTracker = createProgressTracker(totalSteps);

  // Step 1: Generate cover
  await onProgress(progressTracker.advance(), "A gerar capa");
  await saveSectionToDb(projectId, "Capa", generateCover(title, type, brief));

  // Step 1.5: Generate title page for higher education
  if (isHigherEd) {
    await onProgress(progressTracker.advance(), "A gerar folha de rosto");
    await saveSectionToDb(projectId, "Folha de Rosto", generateTitlePage(title, type, brief));
  }

  // Step 2: Generate abstract if required
  if (profile.abstract.required && profile.abstract.range) {
    await onProgress(progressTracker.advance(), "A gerar resumo");
    const abstractPrompt = buildSectionGenerationPrompt({
      title,
      typeLabel,
      brief: enrichedBrief,
      sectionTitle: "Resumo",
      sectionGuidance: profile.abstract.guidance,
      sectionRange: profile.abstract.range,
      previousSections: [],
      styleRules: profile.styleRules,
      citationGuidance: profile.citationGuidance,
      factualGuidance: profile.factualGuidance,
    });

    let abstractContent = "";
    let abstractError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const calculatedTokens = Math.ceil((profile.abstract.range.max || 260) * 1.5);
        const maxTokens = Math.min(calculatedTokens, env.DEFAULT_MAX_OUTPUT_TOKENS || 8000);
        
        const completion = await runAIChatCompletion({
          model: "",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: abstractPrompt },
          ],
          temperature: 0,
          max_tokens: maxTokens,
        });

        abstractContent = completion.choices[0]?.message?.content?.trim() || "";
        if (!abstractContent) {
          abstractError = new Error("A IA n�o devolveu conte�do para o resumo.");
          continue;
        }

        const issues = validateGeneratedSection(abstractContent, "Resumo", profile.abstract.range, title);
        if (issues.length > 0) {
          abstractError = new Error(issues.map((i) => i.message).join(" "));
          continue;
        }

        abstractError = null;
        break;
      } catch (error) {
        abstractError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (abstractContent && !abstractError) {
      await saveSectionToDb(projectId, "Resumo", abstractContent);
    } else if (abstractError) {
      logger.warn("[work-generation] abstract generation failed", { projectId, error: abstractError.message });
    }
  }

  const sectionOutcomes: SectionGenerationOutcome[] = [];

  for (const template of templates) {
    const sectionPlan = profile.sections.find((s) => s.title === template.title);
    if (!sectionPlan) continue;

    const sectionProgress = progressTracker.advance();
    const stableKey = buildGenerationSectionKey({ title: template.title, order: template.order });
    await onProgress(sectionProgress, `A gerar ${template.title}`);
    await Promise.all([
      updateGenerationRunState(generationContext.runId, {
        activeSectionKey: stableKey,
        progress: sectionProgress,
        step: `A gerar ${template.title}`,
      }),
      updateSectionRunState(generationContext.attemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "STREAMING",
        progress: sectionProgress,
        startedAt: new Date(),
        error: null,
      }),
    ]);

    const previousSections = await loadGeneratedSections(projectId, templates);

    const sectionPrompt = buildSectionGenerationPrompt({
      title,
      typeLabel,
      brief: enrichedBrief,
      sectionTitle: template.title,
      sectionGuidance: sectionPlan.guidance,
      sectionRange: sectionPlan.range,
      previousSections,
      styleRules: profile.styleRules,
      citationGuidance: profile.citationGuidance,
      factualGuidance: profile.factualGuidance,
      sectionOutline: buildSectionOutline(template, profile),
      documentPlan: buildDocumentPlan(templates),
    });

    const handleChunk = async (content: string) => {
      setWorkGenerationJob(projectId, {
        progress: sectionProgress,
        step: `A gerar ${template.title}`,
        streamingContent: content,
        streamingSectionTitle: template.title,
      });
      await setPersistedWorkGenerationJob(projectId, {
        progress: sectionProgress,
        step: `A gerar ${template.title}`,
        streamingContent: content,
        streamingSectionTitle: template.title,
      });
      await updateSectionRunState(generationContext.attemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "STREAMING",
        progress: sectionProgress,
        lastContentPreview: content,
        lastPersistedAt: new Date(),
      });
    };

    const sectionResult = await generateSectionWithRetry(
      projectId,
      template,
      sectionPlan,
      systemPrompt,
      sectionPrompt,
      handleChunk,
    );

    setWorkGenerationJob(projectId, {
      streamingContent: undefined,
      streamingSectionTitle: undefined,
    });
    await setPersistedWorkGenerationJob(projectId, {
      streamingContent: null,
      streamingSectionTitle: null,
    });

    if (sectionResult.content && (sectionResult.accepted || sectionResult.degraded)) {
      await saveSectionToDb(projectId, template.title, sectionResult.content);
      await updateSectionRunState(generationContext.attemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "COMPLETED",
        progress: 100,
        wordCount: sectionResult.wordCount,
        lastContentPreview: sectionResult.content,
        lastPersistedAt: new Date(),
        completedAt: new Date(),
        error: sectionResult.degraded
          ? sectionResult.validationIssues.map((issue) => issue.message).join(" ")
          : null,
      });

      sectionOutcomes.push({
        title: template.title,
        accepted: sectionResult.accepted,
        degraded: sectionResult.degraded,
        hadAnyContent: sectionResult.hadAnyContent,
        failureReason: sectionResult.failureReason,
      });
    } else {
      sectionOutcomes.push({
        title: template.title,
        accepted: false,
        degraded: false,
        hadAnyContent: sectionResult.hadAnyContent,
        failureReason: sectionResult.failureReason,
      });
      await updateSectionRunState(generationContext.attemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "FAILED",
        progress: sectionProgress,
        retryCount: 2,
        completedAt: new Date(),
        error: sectionResult.error?.message ?? "Falha ao gerar secção",
      });
    }
  }

  const referenceOrder = Math.max(...templates.map((section) => section.order)) + 1;
  await saveSectionToDb(
    projectId,
    "Referências",
    enrichedBrief.referencesSeed || "Adicione referências verificadas manualmente antes da submissão.",
  );
  await db.documentSection.updateMany({
    where: { projectId, title: "Referências" },
    data: { order: referenceOrder },
  });

  return { sectionOutcomes };
}

async function generateSingleSectionForWorker(
  projectId: string,
  sectionTitle: string,
  systemPrompt: string,
  sectionPrompt: string,
  maxTokens: number,
) {
  const MAX_OUTPUT_TOKENS = env.DEFAULT_MAX_OUTPUT_TOKENS || 8000;
  const effectiveMaxTokens = Math.min(maxTokens, MAX_OUTPUT_TOKENS);
  const MAX_ATTEMPTS = 2;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const prompt = attempt === 0
      ? sectionPrompt
      : `${sectionPrompt}\n\nA resposta anterior para a secção "${sectionTitle}" não cumpriu os requisitos. Regere a secção respeitando todos os requisitos.`;

    const result = await generateSectionWithStreaming(
      projectId,
      sectionTitle,
      systemPrompt,
      prompt,
      effectiveMaxTokens,
      async () => {},
    );

    if (result.content && result.content.trim().length > 0) {
      const wordCount = result.content.trim().split(/\s+/).filter(Boolean).length;
      const validationIssues = validateGeneratedSection(
        result.content,
        sectionTitle,
        { min: 100, max: 2000, hardMin: 50, hardMax: 3000 },
        "",
      );
      const accepted = validationIssues.length === 0;
      const degraded = validationIssues.length > 0 && wordCount >= 50;

      if (accepted || degraded) {
        return {
          content: result.content.trim(),
          accepted,
          degraded,
          wordCount,
          error: null,
        };
      }
    }

    if (attempt === MAX_ATTEMPTS - 1) {
      return {
        content: result.content?.trim() || null,
        accepted: false,
        degraded: false,
        wordCount: result.content?.trim().split(/\s+/).filter(Boolean).length || 0,
        error: result.error || new Error("Falha ao gerar secção após múltiplas tentativas"),
      };
    }
  }

  return {
    content: null,
    accepted: false,
    degraded: false,
    wordCount: 0,
    error: new Error("Falha ao gerar secção"),
  };
}

async function finalizeGeneration(
  projectId: string,
  runId: string,
  attemptId: string,
  userId: string,
) {
  const sectionsWithContent = await db.documentSection.findMany({
    where: { projectId, content: { not: null } },
    select: { title: true, content: true },
    orderBy: { order: "asc" },
  });

  const repetitionIssues = detectCrossSectionRepetition(
    sectionsWithContent
      .filter((section) => section.content && section.content.trim().length > 0)
      .map((section) => ({ title: section.title, content: section.content! })),
  );

  if (repetitionIssues.length > 0) {
    logger.warn("[work-generation] repeated content detected after incremental generation", {
      projectId,
      issues: repetitionIssues,
    });
  }

  const updatedSections = await db.documentSection.findMany({
    where: { projectId },
    select: { wordCount: true, content: true, title: true },
  });

  const totalWords = updatedSections.reduce((sum, section) => {
    if (typeof section.wordCount === "number" && section.wordCount > 0) return sum + section.wordCount;
    if (section.content) return sum + section.content.split(/\s+/).filter(Boolean).length;
    return sum;
  }, 0);

  await db.project.update({
    where: { id: projectId },
    data: { wordCount: totalWords },
  });

  await db.projectBrief.update({
    where: { projectId },
    data: { generationStatus: "READY" },
  });

  const generatedSections = updatedSections.filter((s) => s.content && s.content.trim().length > 0);
  const failedSections = updatedSections.filter((s) => !s.content || s.content.trim().length === 0);
  const step = failedSections.length > 0
    ? `${generatedSections.length}/${updatedSections.length} secções geradas`
    : "Trabalho completo";

  await setPersistedWorkGenerationJob(projectId, {
    status: "READY",
    progress: 100,
    step,
    completedAt: new Date(),
  });

  await Promise.all([
    updateGenerationRunState(runId, {
      status: "READY",
      progress: 100,
      step,
      activeSectionKey: null,
      completedAt: new Date(),
    }),
    updateGenerationAttemptState(attemptId, {
      status: "COMPLETED",
      completedAt: new Date(),
    }),
  ]);

  setWorkGenerationJob(projectId, {
    status: "READY",
    progress: 100,
    step,
  });

  await trackProductEvent({
    name: "work_generation_completed",
    category: "workspace",
    userId,
    projectId,
    metadata: { sectionsGenerated: generatedSections.length, totalWords },
  }).catch(() => null);
}

async function loadProjectSectionsForRun(projectId: string) {
  return db.documentSection.findMany({
    where: { projectId },
    select: { id: true, title: true, order: true },
    orderBy: { order: "asc" },
  });
}

export async function startWorkGenerationJob(input: {
  projectId: string;
  userId: string;
  title: string;
  type: string;
  brief: WorkBriefInput;
  contentCost: number;
  baseCost: number;
}) {
  const { projectId, userId } = input;

  // Check for existing active generation job - this is the single source of truth
  const existingJob = await db.generationJob.findUnique({
    where: { projectId },
    select: { id: true, status: true },
  });

  if (existingJob && existingJob.status === "GENERATING") {
    throw new Error("Gera��o j� est� em curso para este trabalho.");
  }

  // Create/update the job record first - this is the single source of truth for generation status
  const now = new Date();
  const queuedRun = await createGenerationRun({
    projectId,
    userId,
    sections: await loadProjectSectionsForRun(projectId),
  });

  await db.generationJob.upsert({
    where: { projectId },
    create: {
      projectId,
      userId,
      currentRunId: queuedRun.runId,
      status: "GENERATING",
      progress: 5,
      step: "Na fila do worker",
      startedAt: now,
    },
    update: {
      currentRunId: queuedRun.runId,
      status: "GENERATING",
      progress: 5,
      step: "Na fila do worker",
      error: null,
      startedAt: now,
      completedAt: null,
    },
  });

  setWorkGenerationJob(projectId, {
    status: "GENERATING",
    progress: 5,
    step: "Na fila do worker",
  });

  await trackProductEvent({
    name: "work_generation_queued",
    category: "workspace",
    userId,
    projectId,
  }).catch(() => null);

  triggerQueuedGenerationProcessing();
}

async function processGenerationJob(projectId: string) {
  const [project, job] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: { brief: true },
    }),
    db.generationJob.findUnique({
      where: { projectId },
      select: { currentRunId: true },
    }),
  ]);

  if (!project?.brief) {
    throw new Error("Projecto ou briefing não encontrado para processamento.");
  }

  if (!job?.currentRunId) {
    throw new Error("Generation run não encontrado para o trabalho enfileirado.");
  }

  const currentRun = await db.generationRun.findUnique({
    where: { id: job.currentRunId },
    select: {
      id: true,
      currentAttemptId: true,
    },
  });

  if (!currentRun?.currentAttemptId) {
    throw new Error("Generation attempt não encontrado para o trabalho enfileirado.");
  }

  const runId = currentRun.id;
  const attemptId = currentRun.currentAttemptId;

  const brief = toWorkBriefInput(project.brief);
  const templates = getSectionTemplates(project.type, project.brief.educationLevel);

  const existingSections = await db.documentSection.findMany({
    where: { projectId },
    select: { title: true, content: true },
  });
  const generatedTitles = new Set(
    existingSections.filter((s) => s.content && s.content.trim().length > 0).map((s) => s.title)
  );

  const pendingTemplate = templates.find((t) => !generatedTitles.has(t.title));

  if (!pendingTemplate) {
    logger.info("[work-generation] all sections already generated, completing job", { projectId });
    await finalizeGeneration(projectId, runId, attemptId, project.userId);
    return;
  }

  const profile = getWorkGenerationProfile(project.type, brief, templates);
  const sectionPlan = profile.sections.find((s) => s.title === pendingTemplate.title);

  if (!sectionPlan) {
    throw new Error(`Plano de secção não encontrado para: ${pendingTemplate.title}`);
  }

  const systemPrompt = getSystemPromptForEducation(brief.educationLevel || "HIGHER_EDUCATION");
  const typeLabel = formatProjectType(project.type);

  try {
    await db.projectBrief.update({
      where: { projectId },
      data: { generationStatus: "GENERATING" },
    });

    const stableKey = buildGenerationSectionKey({ title: pendingTemplate.title, order: pendingTemplate.order });
    const sectionProgress = 50;

    await Promise.all([
      setPersistedWorkGenerationJob(projectId, { progress: sectionProgress, step: `A gerar ${pendingTemplate.title}`, startedAt: new Date() }),
      updateGenerationRunState(runId, {
        status: "GENERATING",
        progress: sectionProgress,
        step: `A gerar ${pendingTemplate.title}`,
        activeSectionKey: stableKey,
        startedAt: new Date(),
      }),
      updateGenerationAttemptState(attemptId, {
        status: "GENERATING",
        startedAt: new Date(),
      }),
      updateSectionRunState(attemptId, {
        stableKey,
        title: pendingTemplate.title,
        order: pendingTemplate.order,
        status: "STREAMING",
        progress: sectionProgress,
        startedAt: new Date(),
        error: null,
      }),
    ]);

    const previousSections = existingSections
      .filter((s) => s.content && s.content.trim().length > 0)
      .map((s) => ({ title: s.title, content: s.content! }));

    const sectionPrompt = buildSectionGenerationPrompt({
      title: project.title,
      typeLabel,
      brief,
      sectionTitle: pendingTemplate.title,
      sectionGuidance: sectionPlan.guidance,
      sectionRange: sectionPlan.range,
      previousSections,
      styleRules: profile.styleRules,
      citationGuidance: profile.citationGuidance,
      factualGuidance: profile.factualGuidance,
      sectionOutline: buildSectionOutline(pendingTemplate, profile),
      documentPlan: buildDocumentPlan(templates),
    });

    const maxTokens = Math.ceil((sectionPlan.range.max || 800) * 1.8);

    let generatedContent: string | null = null;

    const result = await generateSingleSectionForWorker(
      projectId,
      pendingTemplate.title,
      systemPrompt,
      sectionPrompt,
      maxTokens,
    );

    generatedContent = result.content;

    if (generatedContent && (result.accepted || result.degraded)) {
      await saveSectionToDb(projectId, pendingTemplate.title, generatedContent);
      await updateSectionRunState(attemptId, {
        stableKey,
        title: pendingTemplate.title,
        order: pendingTemplate.order,
        status: "COMPLETED",
        progress: 100,
        wordCount: result.wordCount,
        lastContentPreview: generatedContent,
        completedAt: new Date(),
      });

      logger.info("[work-generation] section completed, triggering next", { projectId, section: pendingTemplate.title });
      triggerQueuedGenerationProcessing();
    } else {
      await updateSectionRunState(attemptId, {
        stableKey,
        title: pendingTemplate.title,
        order: pendingTemplate.order,
        status: "FAILED",
        progress: 100,
        error: result.error?.message || "Falha ao gerar secção",
        completedAt: new Date(),
      });
      logger.warn("[work-generation] section failed, continuing to next", { projectId, section: pendingTemplate.title, error: result.error?.message });
      triggerQueuedGenerationProcessing();
    }
  } catch (error) {
    logger.error("[work-generation] section generation error", { projectId, section: pendingTemplate.title, error: String(error) });
    triggerQueuedGenerationProcessing();
    throw error;
  }
}

export async function processQueuedGenerationJobs(limit = 2) {
  return processQueuedJobs(processGenerationJob, limit);
}

export function triggerQueuedGenerationProcessing() {
  triggerQueuedProcessing(processQueuedGenerationJobs);
}

export async function regenerateWorkSection(input: {
  sectionId: string;
  title: string;
  type: string;
  brief: WorkBriefInput;
  sectionTitle: string;
}) {
  const { sectionId, title, type, brief, sectionTitle } = input;

  const wordCount = "entre 260 e 420";
  const systemPrompt = getSystemPromptForEducation(brief.educationLevel || "HIGHER_EDUCATION");

  const prompt = `Regere apenas a sec��o "${sectionTitle}" de um trabalho acad�mico.

T�tulo do trabalho: ${title}
Tipo de trabalho: ${formatProjectType(type)}
Contexto do briefing:
${buildBriefContext(brief)}

Requisitos obrigat�rios:
- Escreva em Portugu�s acad�mico de Mo�ambique
- Use a norma ${brief.citationStyle || "ABNT"}
- Produza ${wordCount} palavras
- Mantenha tom formal, coerente e plaus�vel
- N�o invente dados factuais, leis, autores ou refer�ncias bibliogr�ficas sem base no briefing
- Devolva apenas o conte�do final da sec��o, sem markdown extra nem explica��es`;

  const completion = await runAIChatCompletion({
    model: "", // Provider uses its default model
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 2500,
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("A IA n�o devolveu conte�do para a sec��o.");
  }

  await db.documentSection.update({
    where: { id: sectionId },
    data: {
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    },
  });

  return content;
}

