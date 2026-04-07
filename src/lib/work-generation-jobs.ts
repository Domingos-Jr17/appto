import { getFriendlyAIErrorMessage, runAIChatCompletion, runAIChatStream } from "@/lib/ai";
import { enrichReferencesWithAcademicSources } from "@/lib/academic-search";
import { db } from "@/lib/db";
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
  detectCrossSectionRepetition,
  getWorkGenerationProfile,
  type SectionTemplate,
  type WordRange,
  validateGeneratedSection,
} from "@/lib/work-generation-prompts";
import type { WorkBriefInput } from "@/types/editor";

export const serializeBrief = serializeProjectBrief;
export {
  batchGetWorkGenerationStatusAsync,
  formatProjectType,
  generateCover,
  generateTitlePage,
  getWorkGenerationStatus,
  getWorkGenerationStatusAsync,
};

const SYSTEM_PROMPT = `Você é um especialista em escrita académica para estudantes moçambicanos.
Gere conteúdo académico de alta qualidade em Português de Moçambique.
Siga a norma de citação pedida no briefing.
Adapte o nível de linguagem ao nível educacional indicado:
- SECONDARY: linguagem simples, frases curtas, vocabulário acessível, sem jargão excessivo
- TECHNICAL: terminologia técnica prática, foco em aplicações
- HIGHER_EDUCATION: linguagem formal, terminologia académica, citações obrigatórias
Nunca invente metadados da capa sem base no briefing.`;

function getSystemPromptForEducation(educationLevel?: string | null): string {
  if (educationLevel === "SECONDARY") {
    return `Você é um assistente de escrita para estudantes do ensino secundário moçambicano.
Gere conteúdo simples e acessível em Português de Moçambique.
Use frases curtas e vocabulário acessível.
Evite jargão técnico excessivo.
Não é obrigatório incluir citações formais no texto.
Estrutura básica: Introdução, Desenvolvimento, Conclusão.`;
  }
  if (educationLevel === "TECHNICAL") {
    return `Você é um assistente de escrita para estudantes do ensino técnico profissional moçambicano.
Gere conteúdo técnico e prático em Português de Moçambique.
Use terminologia técnica apropriada com foco em aplicações práticas.
Inclua exemplos relevantes para o contexto profissional.
Cite fontes quando relevante.`;
  }
  return SYSTEM_PROMPT;
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
  let lastStreamError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const maxTokens = Math.ceil((sectionPlan.range.max || 800) * 1.8);

    const repairPrompt = attempt === 0
      ? sectionPrompt
      : `${sectionPrompt}\n\nA resposta anterior para a secção "${template.title}" não cumpriu os requisitos. Regere a secção respeitando todos os requisitos.`;

    const { content, error } = await generateSectionWithStreaming(
      projectId,
      template.title,
      systemPrompt,
      repairPrompt,
      maxTokens,
      onChunk,
    );

    if (!content) {
      lastStreamError = error;
      continue;
    }

    const issues = validateGeneratedSection(content, template.title, sectionPlan.range, "");
    if (issues.length > 0) {
      continue;
    }

    return { content, error: null };
  }

  return {
    content: null,
    error: lastStreamError || new Error(`A IA não conseguiu gerar conteúdo válido para "${template.title}" após 2 tentativas.`),
  };
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
      // Skip enrichment if it fails — generation can proceed without it
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
        const completion = await runAIChatCompletion({
          model: "",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: abstractPrompt },
          ],
          temperature: 0,
          max_tokens: Math.ceil((profile.abstract.range.max || 260) * 1.5),
        });

        abstractContent = completion.choices[0]?.message?.content?.trim() || "";
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

  // Step 3: Generate each content section sequentially
  const sectionsFailed: string[] = [];

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

    const { content: sectionContent, error: sectionError } = await generateSectionWithRetry(
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

    if (sectionContent && !sectionError) {
      await saveSectionToDb(projectId, template.title, sectionContent);
      await updateSectionRunState(generationContext.attemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "COMPLETED",
        progress: 100,
        wordCount: sectionContent.split(/\s+/).filter(Boolean).length,
        lastContentPreview: sectionContent,
        lastPersistedAt: new Date(),
        completedAt: new Date(),
        error: null,
      });
    } else {
      sectionsFailed.push(template.title);
      await updateSectionRunState(generationContext.attemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "FAILED",
        progress: sectionProgress,
        retryCount: 2,
        completedAt: new Date(),
        error: sectionError?.message ?? "Falha ao gerar secção",
      });
      logger.warn("[work-generation] section generation failed", {
        projectId,
        section: template.title,
        error: sectionError?.message,
      });
    }
  }

  // Step 4: Cross-section repetition check and repair
  await onProgress(95, "A validar conteúdo");
  const allSections = await loadGeneratedSections(projectId, templates);
  const repetitionIssues = detectCrossSectionRepetition(allSections);

  for (const issue of repetitionIssues) {
    const failedSection = templates.find((t) => t.title === issue.sectionB);
    if (!failedSection) continue;

    const sectionPlan = profile.sections.find((s) => s.title === failedSection.title);
    if (!sectionPlan) continue;

    logger.info("[work-generation] repairing cross-section repetition", {
      projectId,
      sectionA: issue.sectionA,
      sectionB: issue.sectionB,
    });

    const repeatedSectionContent = allSections.find((s) => s.title === issue.sectionB)?.content || "";
    const originalSectionContent = allSections.find((s) => s.title === issue.sectionA)?.content || "";

    const repairPrompt = `A secção "${issue.sectionB}" tem repetição significativa de conteúdo da secção "${issue.sectionA}".
Regere APENAS a secção "${issue.sectionB}" com conteúdo NOVO e DIFERENTE.

Conteúdo da secção "${issue.sectionA}" (NÃO repita isto):
${originalSectionContent}

Conteúdo actual da secção "${issue.sectionB}" (que precisa ser refeito):
${repeatedSectionContent}

Instrução: Gere a secção "${issue.sectionB}" com conteúdo completamente diferente, sem repetir ideias ou frases da secção "${issue.sectionA}".
Respeite o range de ${sectionPlan.range.min}-${sectionPlan.range.max} palavras.
Devolva apenas o texto da secção.`;

    try {
      const completion = await runAIChatCompletion({
        model: "",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: repairPrompt },
        ],
        temperature: 0.3,
        max_tokens: Math.ceil(sectionPlan.range.max * 1.8),
      });

      const repairedContent = completion.choices[0]?.message?.content?.trim() || "";
      if (repairedContent) {
        const issues = validateGeneratedSection(repairedContent, failedSection.title, sectionPlan.range, title);
        if (issues.length === 0) {
          await saveSectionToDb(projectId, failedSection.title, repairedContent);
        }
      }
    } catch (error) {
      logger.warn("[work-generation] cross-section repair failed", {
        projectId,
        section: issue.sectionB,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Step 5: Save references section with enriched academic sources
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

  return { sectionsFailed };
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

  try {
    await db.projectBrief.update({
      where: { projectId },
      data: { generationStatus: "GENERATING" },
    });

    await Promise.all([
      setPersistedWorkGenerationJob(projectId, { progress: 5, step: "A iniciar geração", startedAt: new Date() }),
      updateGenerationRunState(runId, {
        status: "GENERATING",
        progress: 5,
        step: "A iniciar geração",
        startedAt: new Date(),
        completedAt: null,
        error: null,
      }),
      updateGenerationAttemptState(attemptId, {
        status: "GENERATING",
        startedAt: new Date(),
        completedAt: null,
        error: null,
      }),
    ]);

    const { sectionsFailed } = await generateWorkSectionBySection(
      projectId,
      project.title,
      project.type,
      brief,
      templates,
      project.userId,
      { runId, attemptId },
      async (progress, step) => {
        setWorkGenerationJob(projectId, { progress, step });
        await Promise.all([
          setPersistedWorkGenerationJob(projectId, { progress, step }),
          updateGenerationRunState(runId, { progress, step }),
        ]);
      },
    );

    // Calculate total word count
    const updatedSections = await db.documentSection.findMany({
      where: { projectId },
      select: { wordCount: true, content: true },
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

    // Check if ALL content sections failed (cover/title-page/references don't count)
    const allContentSectionsFailed = sectionsFailed.length === templates.length;

    if (allContentSectionsFailed) {
      // ALL sections failed — this is a real failure, not a partial success
      await db.projectBrief.update({
        where: { projectId },
        data: { generationStatus: "FAILED" },
      });

      await subscriptionService.refundWork(project.userId).catch((err) => {
        logger.error("[work-generation] failed to refund work after full failure", {
          projectId,
          userId: project.userId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      await setPersistedWorkGenerationJob(projectId, {
        status: "FAILED",
        progress: 100,
        step: "Falha na geração: nenhum conteúdo foi produzido.",
        error: "A IA não conseguiu gerar nenhuma secção do trabalho após múltiplas tentativas.",
        completedAt: new Date(),
      });
      await Promise.all([
        updateGenerationRunState(runId, {
          status: "FAILED",
          progress: 100,
          step: "Falha na geração: nenhum conteúdo foi produzido.",
          error: "A IA não conseguiu gerar nenhuma secção do trabalho após múltiplas tentativas.",
          completedAt: new Date(),
          activeSectionKey: null,
        }),
        updateGenerationAttemptState(attemptId, {
          status: "FAILED",
          error: "A IA não conseguiu gerar nenhuma secção do trabalho após múltiplas tentativas.",
          completedAt: new Date(),
        }),
      ]);
      setWorkGenerationJob(projectId, {
        status: "FAILED",
        progress: 100,
        step: "Falha na geração: nenhum conteúdo foi produzido.",
        error: "A IA não conseguiu gerar nenhuma secção do trabalho após múltiplas tentativas.",
      });

      await trackProductEvent({
        name: "work_generation_failed",
        category: "workspace",
        userId: project.userId,
        projectId,
        metadata: { error: "All sections failed", sectionsFailed: sectionsFailed.length },
      }).catch(() => null);
    } else if (sectionsFailed.length > 0) {
      await db.projectBrief.update({
        where: { projectId },
        data: { generationStatus: "READY" },
      });

      await setPersistedWorkGenerationJob(projectId, {
        status: "READY",
        progress: 100,
        step: `Trabalho pronto — ${sectionsFailed.length} secção(ões) com qualidade abaixo do esperado. Pode re-gerar individualmente.`,
        completedAt: new Date(),
      });
      await Promise.all([
        updateGenerationRunState(runId, {
          status: "READY",
          progress: 100,
          step: `Trabalho pronto — ${sectionsFailed.length} secção(ões) com qualidade abaixo do esperado. Pode re-gerar individualmente.`,
          completedAt: new Date(),
          activeSectionKey: null,
        }),
        updateGenerationAttemptState(attemptId, {
          status: "COMPLETED",
          completedAt: new Date(),
        }),
      ]);
      setWorkGenerationJob(projectId, {
        status: "READY",
        progress: 100,
        step: `Trabalho pronto — ${sectionsFailed.length} secção(ões) com qualidade abaixo do esperado. Pode re-gerar individualmente.`,
      });
    } else {
      await db.projectBrief.update({
        where: { projectId },
        data: { generationStatus: "READY" },
      });

      await setPersistedWorkGenerationJob(projectId, {
        status: "READY",
        progress: 100,
        step: "Trabalho pronto para revisão",
        completedAt: new Date(),
      });
      await Promise.all([
        updateGenerationRunState(runId, {
          status: "READY",
          progress: 100,
          step: "Trabalho pronto para revisão",
          completedAt: new Date(),
          activeSectionKey: null,
        }),
        updateGenerationAttemptState(attemptId, {
          status: "COMPLETED",
          completedAt: new Date(),
        }),
      ]);
      setWorkGenerationJob(projectId, {
        status: "READY",
        progress: 100,
        step: "Trabalho pronto para revisão",
      });
    }

    if (!allContentSectionsFailed) {
      await trackProductEvent({
        name: "work_generation_completed",
        category: "workspace",
        userId: project.userId,
        projectId,
        metadata: { type: project.type, sectionsFailed: sectionsFailed.length },
      }).catch(() => null);
    }
  } catch (error) {
    const friendlyMessage = getFriendlyAIErrorMessage(error);

    await db.projectBrief.update({
      where: { projectId },
      data: { generationStatus: "FAILED" },
    });

    await subscriptionService.refundWork(project.userId).catch((err) => {
      logger.error("[work-generation] failed to refund work after generation error", {
        projectId,
        userId: project.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    await setPersistedWorkGenerationJob(projectId, {
      status: "FAILED",
      progress: 100,
      step: "Falha na geração",
      error: friendlyMessage,
      completedAt: new Date(),
    });
    await Promise.all([
      updateGenerationRunState(runId, {
        status: "FAILED",
        progress: 100,
        step: "Falha na geração",
        error: friendlyMessage,
        completedAt: new Date(),
        activeSectionKey: null,
      }),
      updateGenerationAttemptState(attemptId, {
        status: "FAILED",
        error: friendlyMessage,
        completedAt: new Date(),
      }),
    ]);
    setWorkGenerationJob(projectId, {
      status: "FAILED",
      progress: 100,
      step: "Falha na geração",
      error: friendlyMessage,
    });

    await trackProductEvent({
      name: "work_generation_failed",
      category: "workspace",
      userId: project.userId,
      projectId,
      metadata: { error: friendlyMessage },
    }).catch(() => null);
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

