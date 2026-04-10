import { runAIChatCompletion, runAIChatStream } from "@/lib/ai";
import {
  enrichReferencesWithAcademicSources,
  resolveAcademicReferences,
} from "@/lib/academic-search";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { resolveDocumentProfile } from "@/lib/document-profile";
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
import {
  extractInlineCitationKeys,
  resolveReferenceSectionData,
} from "@/lib/reference-section";
import { serializeProjectBrief, toWorkBriefInput } from "@/lib/projects/project-brief";
import { subscriptionService } from "@/lib/subscription";
import {
  createProgressTracker,
} from "@/lib/work-generation-state";
import {
  buildWorkGenerationSystemPrompt,
  buildBriefContext,
  buildSectionGenerationPrompt,
  getWorkGenerationProfile,
  detectCrossSectionRepetition,
  normalizeMozambicanPortuguese,
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

const WORKER_PASS_RUNTIME_BUDGET_MS = 240_000;
const STREAMING_PREVIEW_PERSIST_INTERVAL_MS = 3_000;

export function buildSectionRepairPrompt(sectionPrompt: string, sectionTitle: string) {
  return `${sectionPrompt}\n\nA resposta anterior para a secção "${sectionTitle}" não cumpriu os requisitos. Regere a secção respeitando todos os requisitos.`;
}

export function shouldPersistStreamingPreview(input: {
  now: number;
  lastPersistedAt: number | null;
  minIntervalMs?: number;
}) {
  if (input.lastPersistedAt === null) {
    return true;
  }

  return input.now - input.lastPersistedAt >= (input.minIntervalMs ?? STREAMING_PREVIEW_PERSIST_INTERVAL_MS);
}

function getAcademicReferenceSourceLimit(educationLevel?: string | null) {
  if (educationLevel === "SECONDARY") {
    return 4;
  }

  if (educationLevel === "TECHNICAL") {
    return 5;
  }

  return 6;
}

export async function enrichBriefReferencesIfNeeded(title: string, brief: WorkBriefInput) {
  const existingRefs = brief.referencesSeed?.trim() || "";

  try {
    const assistedReferences = await Promise.race([
      enrichReferencesWithAcademicSources(
        title,
        existingRefs,
        getAcademicReferenceSourceLimit(brief.educationLevel),
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve(existingRefs), 4000)),
    ]);

    if (!assistedReferences.trim() || assistedReferences === existingRefs) {
      return {
        enrichedBrief: brief,
        assistedReferences: "",
      };
    }

    return {
      enrichedBrief: { ...brief, referencesSeed: assistedReferences },
      assistedReferences,
    };
  } catch {
    return {
      enrichedBrief: brief,
      assistedReferences: "",
    };
  }
}

function countGeneratedWords(content?: string | null) {
  return content?.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
}

function hasAbruptEndingIssue(issues: SectionValidationIssue[]) {
  return issues.some((issue) => issue.message.includes("termina de forma abrupta"));
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
    .filter((attempt) => !hasAbruptEndingIssue(attempt.validationIssues))
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
      step: "Falha na geração: a IA não respondeu de forma estável.",
      error: "A geração falhou porque todas as secções terminaram com erro do provider de IA.",
    };
  }

  if (emptyResponseCount > 0 && providerErrorCount === 0 && validationFailureCount === 0) {
    return {
      step: "Falha na geração: a IA devolveu respostas vazias.",
      error: "A IA respondeu sem conteúdo utilizável para todas as secções solicitadas.",
    };
  }

  if (validationFailureCount > 0 && providerErrorCount === 0 && emptyResponseCount === 0) {
    return {
      step: "Falha na geração: o conteúdo não atingiu o mínimo exigido.",
      error: "A IA gerou texto, mas nenhuma secção cumpriu os requisitos mínimos de qualidade.",
    };
  }

  return {
    step: "Falha na geração: a IA não produziu secções utilizáveis.",
    error: `Resultado sem conteúdo utilizável: ${providerErrorCount} erro(s) de provider, ${emptyResponseCount} resposta(s) vazias e ${validationFailureCount} rejeição(ões) por validação.`,
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
      step: `Trabalho pronto - ${degradedCount} secção(ões) precisam de revisão e ${failedCount} não foram concluídas.`,
      error: "Algumas secções ficaram abaixo do esperado e outras não foram concluídas automaticamente.",
      shouldRefund: false,
    };
  }

  if (degradedCount > 0) {
    return {
      status: "READY",
      step: `Trabalho pronto - ${degradedCount} secção(ões) precisam de revisão antes da submissão.`,
      error: "Algumas secções foram guardadas como rascunho e precisam de revisão ou regeneração.",
      shouldRefund: false,
    };
  }

  if (failedCount > 0) {
    return {
      status: "READY",
      step: `Trabalho pronto - ${failedCount} secção(ões) não foram concluídas automaticamente. Pode re-gerar individualmente.`,
      error: "Algumas secções não foram concluídas automaticamente e podem ser regeneradas depois.",
      shouldRefund: false,
    };
  }

  return {
    status: "READY",
    step: "Trabalho pronto para revisão",
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
  theme: string,
  template: SectionTemplate,
  sectionPlan: { guidance: string; range: WordRange },
  systemPrompt: string,
  sectionPrompt: string,
  onChunk: (content: string) => Promise<void>,
) {
  const attemptDiagnostics: SectionAttemptDiagnostics[] = [];
  const MAX_OUTPUT_TOKENS = env.DEFAULT_MAX_OUTPUT_TOKENS || 8000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const calculatedTokens = Math.ceil((sectionPlan.range.max || 800) * (attempt === 0 ? 1.8 : 2.3));
    const maxTokens = Math.min(calculatedTokens, MAX_OUTPUT_TOKENS);

    const repairPrompt = attempt === 0
      ? sectionPrompt
      : buildSectionRepairPrompt(sectionPrompt, template.title);

    const { content, error } = await generateSectionWithStreaming(
      projectId,
      template.title,
      systemPrompt,
      repairPrompt,
      maxTokens,
      onChunk,
    );

    const normalizedContent = content ? normalizeMozambicanPortuguese(content) : content;
    const issues = normalizedContent
      ? validateGeneratedSection(normalizedContent, template.title, sectionPlan.range, theme)
      : [];
    const diagnostics = createSectionAttemptDiagnostics({
      attemptNumber: attempt + 1,
      content: normalizedContent,
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
    { title: "1. Introdução", order: 3 },
    { title: "2. Desenvolvimento", order: 4 },
    { title: "3. Conclusão", order: 5 },
  ],
  TECHNICAL_WORK: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Fundamentação Teórica", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. Análise Prática", order: 6 },
    { title: "5. Conclusão", order: 7 },
    { title: "6. Recomendações", order: 8 },
  ],
  HIGHER_EDUCATION_WORK: [
    { title: "1. Introdução", order: 6 },
    { title: "2. Revisão da Literatura", order: 7 },
    { title: "3. Metodologia", order: 8 },
    { title: "4. Análise e Discussão", order: 9 },
    { title: "5. Conclusão", order: 10 },
    { title: "6. Recomendações", order: 11 },
  ],
};

export function getSectionTemplates(type: string, _educationLevel?: string | null) {
  const profile = resolveDocumentProfile({
    type,
    educationLevel: _educationLevel,
  });
  const fallbackTemplates = SECTION_TEMPLATES[type] || SECTION_TEMPLATES.HIGHER_EDUCATION_WORK;

  if (profile.bodySections.length === 0) {
    return fallbackTemplates;
  }

  return profile.bodySections.map((section) => ({
    title: section.title,
    order: section.order,
  }));
}

export function getPendingGenerationTemplates(
  templates: SectionTemplate[],
  existingSections: Array<{ title: string; content: string | null }>,
) {
  const generatedTitles = new Set(
    existingSections
      .filter((section) => section.content && section.content.trim().length > 0)
      .map((section) => section.title),
  );

  return templates.filter((template) => !generatedTitles.has(template.title));
}

export function resolveReferencesSectionContent(input: {
  educationLevel?: string | null;
  referencesSeed?: string | null;
  assistedReferences?: string | null;
  generatedSections?: Array<{ title: string; content: string }>;
}) {
  return resolveReferenceSectionData({
    educationLevel: input.educationLevel as WorkBriefInput["educationLevel"],
    userReferences: input.referencesSeed,
    assistedReferences: input.assistedReferences,
    generatedSections: input.generatedSections,
  }).content;
}

export async function resolveFinalReferenceSectionData(input: {
  projectTitle: string;
  educationLevel?: WorkBriefInput["educationLevel"] | null;
  referencesSeed?: string | null;
  assistedReferences?: string | null;
  generatedSections?: Array<{ title: string; content: string }>;
  resolveAcademicReferences?: typeof resolveAcademicReferences;
}) {
  const initialResolution = resolveReferenceSectionData({
    educationLevel: input.educationLevel,
    userReferences: input.referencesSeed,
    assistedReferences: input.assistedReferences,
    generatedSections: input.generatedSections,
  });

  const citationKeys = extractInlineCitationKeys(input.generatedSections);
  const resolver = input.resolveAcademicReferences ?? resolveAcademicReferences;
  const shouldResolveAcademicSources = initialResolution.status === "NEEDS_REVIEW"
    || citationKeys.length > 0;

  if (!shouldResolveAcademicSources) {
    return initialResolution;
  }

  try {
    const resolvedAcademicReferences = await resolver({
      theme: input.projectTitle,
      citationKeys,
      maxSources: getAcademicReferenceSourceLimit(input.educationLevel),
      generatedSections: input.generatedSections,
    });

    if (resolvedAcademicReferences.length === 0) {
      return initialResolution;
    }

    return resolveReferenceSectionData({
      educationLevel: input.educationLevel,
      userReferences: input.referencesSeed,
      assistedReferences: JSON.stringify(resolvedAcademicReferences),
      generatedSections: input.generatedSections,
    });
  } catch {
    return initialResolution;
  }
}

export function shouldRequireReferenceReview(input: {
  educationLevel?: string | null;
  referencesContent: string;
  generatedSections?: Array<{ title: string; content: string }>;
}) {
  return resolveReferenceSectionData({
    educationLevel: input.educationLevel as WorkBriefInput["educationLevel"],
    userReferences: input.referencesContent,
    generatedSections: input.generatedSections,
  }).status === "NEEDS_REVIEW";
}

export function shouldYieldGenerationPass(input: {
  passStartedAt: number;
  now?: number;
  runtimeBudgetMs?: number;
}) {
  const now = input.now ?? Date.now();
  const runtimeBudgetMs = input.runtimeBudgetMs ?? WORKER_PASS_RUNTIME_BUDGET_MS;
  return now - input.passStartedAt >= runtimeBudgetMs;
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

async function _generateWorkSectionBySection(
  projectId: string,
  title: string,
  type: string,
  brief: WorkBriefInput,
  templates: SectionTemplate[],
  userId: string,
  generationContext: { runId: string; attemptId: string },
  onProgress: (progress: number, step: string) => Promise<void>,
) {
  const { enrichedBrief, assistedReferences } = await enrichBriefReferencesIfNeeded(title, brief);

  const profile = getWorkGenerationProfile(type, enrichedBrief, templates);
  const resolvedEducationLevel = enrichedBrief.educationLevel || "HIGHER_EDUCATION";
  const systemPrompt = buildWorkGenerationSystemPrompt(
    resolveDocumentProfile({
      type,
      educationLevel: resolvedEducationLevel,
      institutionName: enrichedBrief.institutionName,
      coverTemplate: enrichedBrief.coverTemplate,
    }),
  );
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
        const calculatedTokens = Math.ceil((profile.abstract.range.max || 260) * (attempt === 0 ? 1.5 : 2));
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

        abstractContent = normalizeMozambicanPortuguese(
          completion.choices[0]?.message?.content?.trim() || "",
        );
        if (!abstractContent) {
          abstractError = new Error("A IA não devolveu conteúdo para o resumo.");
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
  const previousSections = await loadGeneratedSections(projectId, templates);

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

    let lastPersistedPreviewAt: number | null = null;

    const handleChunk = async (content: string) => {
      setWorkGenerationJob(projectId, {
        progress: sectionProgress,
        step: `A gerar ${template.title}`,
        streamingContent: content,
        streamingSectionTitle: template.title,
      });

      const now = Date.now();
      if (!shouldPersistStreamingPreview({ now, lastPersistedAt: lastPersistedPreviewAt })) {
        return;
      }

      lastPersistedPreviewAt = now;
      const persistedAt = new Date(now);
      await setPersistedWorkGenerationJob(projectId, {
        progress: sectionProgress,
        step: `A gerar ${template.title}`,
      });
      await updateSectionRunState(generationContext.attemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "STREAMING",
        progress: sectionProgress,
        lastContentPreview: content,
        lastPersistedAt: persistedAt,
      });
    };

    const sectionResult = await generateSectionWithRetry(
      projectId,
      title,
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
      previousSections.push({ title: template.title, content: sectionResult.content });
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

  const referenceSection = resolveDocumentProfile({
    type,
    educationLevel: enrichedBrief.educationLevel,
    institutionName: enrichedBrief.institutionName,
    coverTemplate: enrichedBrief.coverTemplate,
  }).referenceSection;
  const resolvedReferenceSection = await resolveFinalReferenceSectionData({
    projectTitle: title,
    educationLevel: enrichedBrief.educationLevel,
    referencesSeed: enrichedBrief.referencesSeed,
    assistedReferences,
    generatedSections: previousSections,
  });
  const referencesContent = resolvedReferenceSection.content;
  const referencesNeedReview = shouldRequireReferenceReview({
    educationLevel: enrichedBrief.educationLevel,
    referencesContent,
    generatedSections: previousSections,
  });

  if (referencesContent) {
    await saveSectionToDb(projectId, referenceSection.title, referencesContent);
  }

  await db.documentSection.updateMany({
    where: { projectId, title: referenceSection.title },
    data: { order: referenceSection.order },
  });

  if (referencesNeedReview) {
    sectionOutcomes.push({
      title: referenceSection.title,
      accepted: false,
      degraded: true,
      hadAnyContent: false,
      failureReason: "validation_failed",
    });
  } else if (referencesContent) {
    sectionOutcomes.push({
      title: referenceSection.title,
      accepted: true,
      degraded: false,
      hadAnyContent: true,
      failureReason: null,
    });
  }

  return { sectionOutcomes };
}

  /* legacy reference fallback retained for migration history
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

*/
async function _generateSingleSectionForWorker(
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
      : buildSectionRepairPrompt(sectionPrompt, sectionTitle);

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
  options?: {
    outcomes?: SectionGenerationOutcome[];
    metrics?: {
      queuedAt?: Date | null;
      claimedAt?: Date | null;
      firstChunkAt?: Date | null;
      firstSectionDoneAt?: Date | null;
      pendingTemplatesCount?: number;
    };
  },
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

  const fallbackOutcomes = updatedSections.map((section) => ({
    title: section.title,
    accepted: Boolean(section.content && section.content.trim().length > 0),
    degraded: false,
    hadAnyContent: Boolean(section.content && section.content.trim().length > 0),
    failureReason: (section.content && section.content.trim().length > 0)
      ? null
      : "empty_response" as const,
  }));
  const decision = resolveGenerationCompletionDecision(options?.outcomes ?? fallbackOutcomes);
  const completedAt = new Date();

  await db.projectBrief.update({
    where: { projectId },
    data: { generationStatus: decision.status },
  });

  const generatedSections = updatedSections.filter((section) => section.content && section.content.trim().length > 0);
  const failedSections = updatedSections.filter((section) => !section.content || section.content.trim().length === 0);

  await setPersistedWorkGenerationJob(projectId, {
    status: decision.status,
    progress: 100,
    step: decision.step,
    error: decision.error,
    completedAt,
    streamingContent: null,
    streamingSectionTitle: null,
  });

  await Promise.all([
    updateGenerationRunState(runId, {
      status: decision.status,
      progress: 100,
      step: decision.step,
      error: decision.error,
      activeSectionKey: null,
      completedAt,
    }),
    updateGenerationAttemptState(attemptId, {
      status: decision.status === "FAILED" ? "FAILED" : "COMPLETED",
      error: decision.error,
      completedAt,
    }),
  ]);

  setWorkGenerationJob(projectId, {
    status: decision.status,
    progress: 100,
    step: decision.step,
    error: decision.error ?? undefined,
    streamingContent: undefined,
    streamingSectionTitle: undefined,
  });

  if (decision.shouldRefund) {
    await subscriptionService.refundWork(userId).catch(() => null);
  }

  const queueToClaimMs = options?.metrics?.queuedAt && options.metrics.claimedAt
    ? options.metrics.claimedAt.getTime() - options.metrics.queuedAt.getTime()
    : null;
  const queueToFirstChunkMs = options?.metrics?.queuedAt && options.metrics.firstChunkAt
    ? options.metrics.firstChunkAt.getTime() - options.metrics.queuedAt.getTime()
    : null;
  const queueToFirstSectionDoneMs = options?.metrics?.queuedAt && options.metrics.firstSectionDoneAt
    ? options.metrics.firstSectionDoneAt.getTime() - options.metrics.queuedAt.getTime()
    : null;
  const queueToReadyMs = options?.metrics?.queuedAt
    ? completedAt.getTime() - options.metrics.queuedAt.getTime()
    : null;

  await trackProductEvent({
    name: "work_generation_completed",
    category: "workspace",
    userId,
    projectId,
    metadata: {
      status: decision.status,
      sectionsGenerated: generatedSections.length,
      sectionsFailed: failedSections.length,
      pendingTemplatesCount: options?.metrics?.pendingTemplatesCount ?? null,
      totalWords,
      queuedAt: options?.metrics?.queuedAt?.toISOString() ?? null,
      claimedAt: options?.metrics?.claimedAt?.toISOString() ?? null,
      firstChunkAt: options?.metrics?.firstChunkAt?.toISOString() ?? null,
      firstSectionDoneAt: options?.metrics?.firstSectionDoneAt?.toISOString() ?? null,
      readyAt: completedAt.toISOString(),
      queueToClaimMs,
      queueToFirstChunkMs,
      queueToFirstSectionDoneMs,
      queueToReadyMs,
    },
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
    throw new Error("Geração já está em curso para este trabalho.");
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

  triggerQueuedGenerationProcessing({ fastStartLocal: true });
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
      queuedAt: true,
    },
  });

  if (!currentRun?.currentAttemptId) {
    throw new Error("Generation attempt não encontrado para o trabalho enfileirado.");
  }

  const runId = currentRun.id;
  const attemptId = currentRun.currentAttemptId;
  const brief = toWorkBriefInput(project.brief);
  const { enrichedBrief, assistedReferences } = await enrichBriefReferencesIfNeeded(
    project.title,
    brief,
  );
  const templates = getSectionTemplates(project.type, project.brief.educationLevel);
  const existingSections = await db.documentSection.findMany({
    where: { projectId },
    select: { title: true, content: true },
  });
  const pendingTemplates = getPendingGenerationTemplates(templates, existingSections);
  const executionMetrics: {
    queuedAt?: Date | null;
    claimedAt?: Date | null;
    firstChunkAt?: Date | null;
    firstSectionDoneAt?: Date | null;
    pendingTemplatesCount?: number;
  } = {
    queuedAt: currentRun.queuedAt,
    claimedAt: new Date(),
    pendingTemplatesCount: pendingTemplates.length,
  };

  if (pendingTemplates.length === 0) {
    logger.info("[work-generation] all sections already generated, completing job", { projectId });
    await finalizeGeneration(projectId, runId, attemptId, project.userId, {
      metrics: executionMetrics,
    });
    return;
  }

  const profile = getWorkGenerationProfile(project.type, enrichedBrief, templates);
  const systemPrompt = buildWorkGenerationSystemPrompt(
    resolveDocumentProfile({
      type: project.type,
      educationLevel: enrichedBrief.educationLevel || "HIGHER_EDUCATION",
      institutionName: enrichedBrief.institutionName,
      coverTemplate: enrichedBrief.coverTemplate,
    }),
  );
  const typeLabel = formatProjectType(project.type);
  const progressTracker = createProgressTracker(pendingTemplates.length, 10);
  const previousSections = existingSections
    .filter((section) => section.content && section.content.trim().length > 0)
    .map((section) => ({ title: section.title, content: section.content! }));
  const sectionOutcomes: SectionGenerationOutcome[] = previousSections.map((section) => ({
    title: section.title,
    accepted: true,
    degraded: false,
    hadAnyContent: true,
    failureReason: null,
  }));
  const passStartedAt = Date.now();

  try {
    await Promise.all([
      db.projectBrief.update({
        where: { projectId },
        data: { generationStatus: "GENERATING" },
      }),
      setPersistedWorkGenerationJob(projectId, {
        progress: 10,
        step: "Worker assumiu a geração",
        startedAt: executionMetrics.claimedAt ?? undefined,
        error: null,
      }),
      updateGenerationRunState(runId, {
        status: "GENERATING",
        progress: 10,
        step: "Worker assumiu a geração",
        activeSectionKey: null,
        error: null,
        startedAt: executionMetrics.claimedAt ?? undefined,
      }),
      updateGenerationAttemptState(attemptId, {
        status: "GENERATING",
        error: null,
        startedAt: executionMetrics.claimedAt ?? undefined,
      }),
    ]);

    await trackProductEvent({
      name: "work_generation_claimed",
      category: "workspace",
      userId: project.userId,
      projectId,
      metadata: {
        queuedAt: executionMetrics.queuedAt?.toISOString() ?? null,
        claimedAt: executionMetrics.claimedAt?.toISOString() ?? null,
        queueToClaimMs: executionMetrics.queuedAt && executionMetrics.claimedAt
          ? executionMetrics.claimedAt.getTime() - executionMetrics.queuedAt.getTime()
          : null,
        pendingTemplatesCount: pendingTemplates.length,
      },
    }).catch(() => null);

    for (const [pendingIndex, pendingTemplate] of pendingTemplates.entries()) {
      const sectionPlan = profile.sections.find((section) => section.title === pendingTemplate.title);
      if (!sectionPlan) {
        throw new Error(`Plano de secção não encontrado para: ${pendingTemplate.title}`);
      }

      const stableKey = buildGenerationSectionKey({ title: pendingTemplate.title, order: pendingTemplate.order });
      const sectionProgress = progressTracker.advance();
      const sectionStartedAt = new Date();

      await Promise.all([
        setPersistedWorkGenerationJob(projectId, {
          progress: sectionProgress,
          step: `A gerar ${pendingTemplate.title}`,
          error: null,
        }),
        updateGenerationRunState(runId, {
          status: "GENERATING",
          progress: sectionProgress,
          step: `A gerar ${pendingTemplate.title}`,
          activeSectionKey: stableKey,
        }),
        updateSectionRunState(attemptId, {
          stableKey,
          title: pendingTemplate.title,
          order: pendingTemplate.order,
          status: "STREAMING",
          progress: sectionProgress,
          startedAt: sectionStartedAt,
          error: null,
          lastContentPreview: null,
        }),
      ]);

      const sectionPrompt = buildSectionGenerationPrompt({
        title: project.title,
        typeLabel,
        brief: enrichedBrief,
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

      let lastPersistedPreviewAt: number | null = null;

      const handleChunk = async (content: string) => {
        const now = Date.now();
        const persistedAt = new Date(now);
        if (!executionMetrics.firstChunkAt) {
          executionMetrics.firstChunkAt = persistedAt;
          await trackProductEvent({
            name: "work_generation_first_chunk",
            category: "workspace",
            userId: project.userId,
            projectId,
            metadata: {
              queuedAt: executionMetrics.queuedAt?.toISOString() ?? null,
              claimedAt: executionMetrics.claimedAt?.toISOString() ?? null,
              firstChunkAt: executionMetrics.firstChunkAt.toISOString(),
              queueToFirstChunkMs: executionMetrics.queuedAt
                ? executionMetrics.firstChunkAt.getTime() - executionMetrics.queuedAt.getTime()
                : null,
            },
          }).catch(() => null);
        }

        setWorkGenerationJob(projectId, {
          progress: sectionProgress,
          step: `A gerar ${pendingTemplate.title}`,
          streamingContent: content,
          streamingSectionTitle: pendingTemplate.title,
        });

        if (!shouldPersistStreamingPreview({ now, lastPersistedAt: lastPersistedPreviewAt })) {
          return;
        }

        lastPersistedPreviewAt = now;
        await Promise.all([
          setPersistedWorkGenerationJob(projectId, {
            progress: sectionProgress,
            step: `A gerar ${pendingTemplate.title}`,
          }),
          updateSectionRunState(attemptId, {
            stableKey,
            title: pendingTemplate.title,
            order: pendingTemplate.order,
            status: "STREAMING",
            progress: sectionProgress,
            lastContentPreview: content,
            lastPersistedAt: persistedAt,
          }),
        ]);
      };

      const result = await generateSectionWithRetry(
        projectId,
        project.title,
        pendingTemplate,
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

      if (result.content && (result.accepted || result.degraded)) {
        const persistedAt = new Date();
        await setPersistedWorkGenerationJob(projectId, {
          progress: sectionProgress,
          step: `A guardar ${pendingTemplate.title}`,
        });
        await saveSectionToDb(projectId, pendingTemplate.title, result.content);
        await updateSectionRunState(attemptId, {
          stableKey,
          title: pendingTemplate.title,
          order: pendingTemplate.order,
          status: "COMPLETED",
          progress: 100,
          wordCount: result.wordCount,
          lastContentPreview: result.content,
          lastPersistedAt: persistedAt,
          completedAt: persistedAt,
          error: result.degraded
            ? result.validationIssues.map((issue) => issue.message).join(" ")
            : null,
        });

        previousSections.push({ title: pendingTemplate.title, content: result.content });
        sectionOutcomes.push({
          title: pendingTemplate.title,
          accepted: result.accepted,
          degraded: result.degraded,
          hadAnyContent: result.hadAnyContent,
          failureReason: result.failureReason,
        });

        if (!executionMetrics.firstSectionDoneAt) {
          executionMetrics.firstSectionDoneAt = persistedAt;
          await trackProductEvent({
            name: "work_generation_first_section_completed",
            category: "workspace",
            userId: project.userId,
            projectId,
            metadata: {
              title: pendingTemplate.title,
              queuedAt: executionMetrics.queuedAt?.toISOString() ?? null,
              firstSectionDoneAt: executionMetrics.firstSectionDoneAt.toISOString(),
              queueToFirstSectionDoneMs: executionMetrics.queuedAt
                ? executionMetrics.firstSectionDoneAt.getTime() - executionMetrics.queuedAt.getTime()
                : null,
            },
          }).catch(() => null);
        }

        logger.info("[work-generation] section completed within single-pass worker", {
          projectId,
          section: pendingTemplate.title,
        });
      } else {
        sectionOutcomes.push({
          title: pendingTemplate.title,
          accepted: false,
          degraded: false,
          hadAnyContent: result.hadAnyContent,
          failureReason: result.failureReason,
        });
        await updateSectionRunState(attemptId, {
          stableKey,
          title: pendingTemplate.title,
          order: pendingTemplate.order,
          status: "FAILED",
          progress: sectionProgress,
          retryCount: 2,
          error: result.error?.message || "Falha ao gerar secção",
          completedAt: new Date(),
        });
        logger.warn("[work-generation] section failed within single-pass worker", {
          projectId,
          section: pendingTemplate.title,
          error: result.error?.message,
        });
      }

      const hasMorePendingTemplates = pendingIndex < pendingTemplates.length - 1;
      if (hasMorePendingTemplates && shouldYieldGenerationPass({ passStartedAt })) {
        const yieldedAt = new Date();
        const nextSectionTitle = pendingTemplates[pendingIndex + 1]?.title ?? null;

        setWorkGenerationJob(projectId, {
          progress: sectionProgress,
          step: "A continuar no próximo worker",
          streamingContent: undefined,
          streamingSectionTitle: undefined,
        });
        await Promise.all([
          setPersistedWorkGenerationJob(projectId, {
            progress: sectionProgress,
            step: "A continuar no próximo worker",
            streamingContent: null,
            streamingSectionTitle: null,
            error: null,
          }),
          updateGenerationRunState(runId, {
            status: "GENERATING",
            progress: sectionProgress,
            step: "A continuar no próximo worker",
            activeSectionKey: null,
          }),
          updateGenerationAttemptState(attemptId, {
            status: "GENERATING",
            error: null,
          }),
        ]);

        await trackProductEvent({
          name: "work_generation_yielded",
          category: "workspace",
          userId: project.userId,
          projectId,
          metadata: {
            yieldedAt: yieldedAt.toISOString(),
            nextSectionTitle,
            queuedAt: executionMetrics.queuedAt?.toISOString() ?? null,
            claimedAt: executionMetrics.claimedAt?.toISOString() ?? null,
            progress: sectionProgress,
          },
        }).catch(() => null);

        logger.info("[work-generation] yielding before runtime limit", {
          projectId,
          nextSectionTitle,
          progress: sectionProgress,
        });

        triggerQueuedGenerationProcessing();
        return;
      }
    }

    const documentProfile = resolveDocumentProfile({
      type: project.type,
      educationLevel: enrichedBrief.educationLevel,
      institutionName: enrichedBrief.institutionName,
      coverTemplate: enrichedBrief.coverTemplate,
    });
    const referenceSection = documentProfile.referenceSection;
    const persistedReferenceSection = previousSections.find(
      (section) => section.title === referenceSection.title && section.content.trim().length > 0,
    );
    const generatedBodySections = previousSections.filter((section) =>
      templates.some((template) => template.title === section.title),
    );
    const resolvedReferenceSection = await resolveFinalReferenceSectionData({
      projectTitle: project.title,
      educationLevel: enrichedBrief.educationLevel,
      referencesSeed: brief.referencesSeed,
      assistedReferences,
      generatedSections: generatedBodySections,
    });
    const referencesContent =
      persistedReferenceSection?.content ||
      resolvedReferenceSection.content;
    const referencesNeedReview = shouldRequireReferenceReview({
      educationLevel: enrichedBrief.educationLevel,
      referencesContent,
      generatedSections: generatedBodySections,
    });

    if (!persistedReferenceSection && referencesContent) {
      await saveSectionToDb(projectId, referenceSection.title, referencesContent);
      previousSections.push({ title: referenceSection.title, content: referencesContent });
    }

    await db.documentSection.updateMany({
      where: { projectId, title: referenceSection.title },
      data: { order: referenceSection.order },
    });

    if (!sectionOutcomes.some((outcome) => outcome.title === referenceSection.title)) {
      if (referencesNeedReview) {
        sectionOutcomes.push({
          title: referenceSection.title,
          accepted: false,
          degraded: true,
          hadAnyContent: referencesContent.trim().length > 0,
          failureReason: "validation_failed",
        });
      } else if (referencesContent.trim().length > 0) {
        sectionOutcomes.push({
          title: referenceSection.title,
          accepted: true,
          degraded: false,
          hadAnyContent: true,
          failureReason: null,
        });
      }
    }

    await finalizeGeneration(projectId, runId, attemptId, project.userId, {
      outcomes: sectionOutcomes,
      metrics: executionMetrics,
    });
  } catch (error) {
    logger.error("[work-generation] section generation error", { projectId, error: String(error) });
    throw error;
  }
}

export async function processQueuedGenerationJobs(limit = 2) {
  return processQueuedJobs(processGenerationJob, limit);
}

export function triggerQueuedGenerationProcessing(options?: { fastStartLocal?: boolean }) {
  triggerQueuedProcessing(processQueuedGenerationJobs, options);
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
  const systemPrompt = buildWorkGenerationSystemPrompt(
    resolveDocumentProfile({
      type,
      educationLevel: brief.educationLevel || "HIGHER_EDUCATION",
      institutionName: brief.institutionName,
      coverTemplate: brief.coverTemplate,
    }),
  );

  const prompt = `Regere apenas a secção "${sectionTitle}" de um trabalho académico.

Título do trabalho: ${title}
Tipo de trabalho: ${formatProjectType(type)}
Contexto do briefing:
${buildBriefContext(brief)}

Requisitos obrigatórios:
- Escreva em Português académico de Moçambique
- Use a norma ${brief.citationStyle || "ABNT"}
- Produza ${wordCount} palavras
- Mantenha tom formal, coerente e plausível
- Não invente dados factuais, leis, autores ou referências bibliográficas sem base no briefing
- Devolva apenas o conteúdo final da secção, sem markdown extra nem explicações`;

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
    throw new Error("A IA não devolveu conteúdo para a secção.");
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

