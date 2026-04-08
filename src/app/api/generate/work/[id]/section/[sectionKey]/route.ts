import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  batchGetWorkGenerationStatusAsync,
  getWorkGenerationStatusAsync,
  setPersistedWorkGenerationJob,
  setWorkGenerationJob,
} from "@/lib/generation/job-status-store";
import { buildGenerationSectionKey } from "@/lib/generation/run-domain";
import type { SectionTemplate, WordRange } from "@/lib/work-generation-prompts";
import {
  createGenerationRun,
  updateGenerationAttemptState,
  updateGenerationRunState,
  updateSectionRunState,
} from "@/lib/generation/run-repository";
import { getSectionTemplates } from "@/lib/work-generation-jobs";
import {
  buildBriefContext,
  buildSectionGenerationPrompt,
  getWorkGenerationProfile,
  validateGeneratedSection,
} from "@/lib/work-generation-prompts";
import { toWorkBriefInput } from "@/lib/projects/project-brief";
import { createProgressTracker } from "@/lib/work-generation-state";
import { enrichReferencesWithAcademicSources } from "@/lib/academic-search";
import { getFriendlyAIErrorMessage, runAIChatStream } from "@/lib/ai";
import { env } from "@/lib/env";
import type { WorkBriefInput } from "@/types/editor";

const generateSectionSchema = z.object({
  sectionKey: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { sectionKey } = generateSectionSchema.parse(body);

    const project = await db.project.findUnique({
      where: { id: projectId, userId: session.user.id },
      include: { brief: true },
    });

    if (!project?.brief) {
      return apiError("Trabalho não encontrado", 404);
    }

    const existingJob = await db.generationJob.findUnique({
      where: { projectId },
      select: { status: true, currentRunId: true },
    });

    if (!existingJob?.currentRunId) {
      return apiError("Geração não iniciada para este trabalho", 400);
    }

    const templates = getSectionTemplates(project.type, project.brief.educationLevel);
    const template = templates.find((t) => buildGenerationSectionKey({ title: t.title, order: t.order }) === sectionKey);

    if (!template) {
      return apiError("Secção não encontrada", 404);
    }

    const run = await db.generationRun.findUnique({
      where: { id: existingJob.currentRunId },
      select: { id: true, currentAttemptId: true },
    });

    if (!run?.currentAttemptId) {
      return apiError("Execução de geração não encontrada", 500);
    }

    const brief = toWorkBriefInput(project.brief);
    const profile = getWorkGenerationProfile(project.type, brief, templates);
    const resolvedEducationLevel = brief.educationLevel || "HIGHER_EDUCATION";
    const sectionPlan = profile.sections.find((s) => s.title === template.title);

    if (!sectionPlan) {
      return apiError("Plano de secção não encontrado", 500);
    }

    const systemPrompt = getSystemPromptForEducation(resolvedEducationLevel);
    const typeLabel = project.type.replace(/_/g, " ");

    const enrichedBrief = await enrichBriefWithAcademicSources(project.title, brief);

    await db.projectBrief.update({
      where: { projectId },
      data: { generationStatus: "GENERATING" },
    });

    await Promise.all([
      updateGenerationRunState(run.id, {
        status: "GENERATING",
        progress: 10,
        step: `A gerar ${template.title}`,
        startedAt: new Date(),
      }),
      updateGenerationAttemptState(run.currentAttemptId, {
        status: "GENERATING",
        startedAt: new Date(),
      }),
    ]);

    const previousSections = await loadPreviousSections(projectId, templates);
    const sectionPrompt = buildSectionGenerationPrompt({
      title: project.title,
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

    const stableKey = buildGenerationSectionKey({ title: template.title, order: template.order });
    const maxTokens = Math.ceil((sectionPlan.range.max || 800) * 1.8);

    const sectionResult = await generateSingleSection(
      projectId,
      template.title,
      systemPrompt,
      sectionPrompt,
      maxTokens,
      async (content): Promise<void> => {
        const chunkText = String(content ?? "");
        
        setWorkGenerationJob(projectId, {
          progress: 50,
          step: `A gerar ${template.title}`,
          streamingContent: chunkText,
          streamingSectionTitle: template.title,
        });
        await setPersistedWorkGenerationJob(projectId, {
          progress: 50,
          step: `A gerar ${template.title}`,
          streamingContent: chunkText,
          streamingSectionTitle: template.title,
        });
      },
    );

    await setWorkGenerationJob(projectId, {
      streamingContent: undefined,
      streamingSectionTitle: undefined,
    });
    await setPersistedWorkGenerationJob(projectId, {
      streamingContent: null,
      streamingSectionTitle: null,
    });

    if (sectionResult.content && (sectionResult.accepted || sectionResult.degraded)) {
      await saveSectionToDb(projectId, template.title, sectionResult.content);
      await updateSectionRunState(run.currentAttemptId, {
        stableKey,
        title: template.title,
        order: template.order,
        status: "COMPLETED",
        progress: 100,
        wordCount: sectionResult.wordCount,
        lastContentPreview: sectionResult.content,
        completedAt: new Date(),
      });

      return apiSuccess({
        success: true,
        sectionKey,
        title: template.title,
        status: "COMPLETED",
        wordCount: sectionResult.wordCount,
      });
    }

    await updateSectionRunState(run.currentAttemptId, {
      stableKey,
      title: template.title,
      order: template.order,
      status: "FAILED",
      progress: 100,
      error: sectionResult.error?.message || "Falha ao gerar secção",
      completedAt: new Date(),
    });

    return apiError(sectionResult.error?.message || "Falha ao gerar secção", 500);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Payload inválido", 400, "VALIDATION_ERROR", error.flatten());
    }
    logger.error("[generate-section] error", { error: String(error) });
    return handleApiError(error, "Erro ao gerar secção");
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id: projectId } = await params;
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true, type: true },
    });

    if (!project) {
      return apiError("Trabalho não encontrado", 404);
    }

    const templates = getSectionTemplates(project.type);
    const existingSections = await db.documentSection.findMany({
      where: { projectId, title: { in: templates.map((t) => t.title) } },
      select: { title: true, content: true, wordCount: true },
    });

    const generatedSections = templates.map((template) => {
      const existing = existingSections.find((s) => s.title === template.title);
      return {
        key: buildGenerationSectionKey({ title: template.title, order: template.order }),
        title: template.title,
        order: template.order,
        generated: !!existing?.content,
        wordCount: existing?.wordCount || 0,
      };
    });

    return apiSuccess({ sections: generatedSections });
  } catch (error) {
    return handleApiError(error, "Erro ao obter estado das secções");
  }
}

async function enrichBriefWithAcademicSources(title: string, brief: WorkBriefInput): Promise<WorkBriefInput> {
  if (!brief.referencesSeed || brief.referencesSeed.trim().length < 20) {
    try {
      const enriched = await Promise.race([
        enrichReferencesWithAcademicSources(title, brief.referencesSeed || "", 6),
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 2000)),
      ]);
      if (enriched && enriched !== brief.referencesSeed) {
        return { ...brief, referencesSeed: enriched };
      }
    } catch {
      // Skip enrichment if it fails - generation can proceed without it
    }
  }
  return brief;
}

async function loadPreviousSections(projectId: string, templates: SectionTemplate[]) {
  const sections = await db.documentSection.findMany({
    where: { projectId, title: { in: templates.map((t) => t.title) } },
    select: { title: true, content: true },
    orderBy: { order: "asc" },
  });
  return sections
    .filter((s) => s.content && s.content.trim().length > 0)
    .map((s) => ({ title: s.title, content: s.content! }));
}

async function saveSectionToDb(projectId: string, title: string, content: string) {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const result = await db.documentSection.updateMany({
    where: { projectId, title },
    data: { content, wordCount },
  });

  if (result.count === 0) {
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
  return `Você é um especialista em escrita académica para estudantes moçambicanos.
Gere conteúdo académico de alta qualidade em Português de Moçambique.
Siga a norma de citação pedida no briefing.
Adapte o nível de linguagem ao nível educacional indicado:
- SECONDARY: linguagem simples, frases curtas, vocabulário acessível, sem jargão excessivo
- TECHNICAL: terminologia técnica prática, foco em aplicações
- HIGHER_EDUCATION: linguagem formal, terminologia académica, citações obrigatórias
Nunca invente metadados da capa sem base no briefing.`;
}

interface SectionResult {
  content: string | null;
  accepted: boolean;
  degraded: boolean;
  wordCount: number;
  error: Error | null;
}

async function generateSingleSection(
  projectId: string,
  sectionTitle: string,
  systemPrompt: string,
  sectionPrompt: string,
  maxTokens: number,
  onChunk: (content: string | null) => Promise<void>,
): Promise<SectionResult> {
  const MAX_OUTPUT_TOKENS = env.DEFAULT_MAX_OUTPUT_TOKENS || 8000;
  const effectiveMaxTokens = Math.min(maxTokens, MAX_OUTPUT_TOKENS);

  let content = "";
  let lastEmitTime = 0;
  const THROTTLE_MS = 200;
  let hadAnyContent = false;

  const handleChunk = async (text: string) => {
    content += text;
    hadAnyContent = true;

    const now = Date.now();
    if (now - lastEmitTime >= THROTTLE_MS && content.length > 0) {
      await onChunk(content);
      lastEmitTime = now;
    }
  };

  try {
    const textStream = await runAIChatStream({
      model: "",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sectionPrompt },
      ],
      temperature: 0,
      max_tokens: effectiveMaxTokens,
    });

    const reader = textStream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        await handleChunk(textChunk);
      }

      if (content) {
        await onChunk(content);
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return {
          content: null,
          accepted: false,
          degraded: false,
          wordCount: 0,
          error: new Error("A IA não devolveu conteúdo para a secção."),
        };
      }

      const wordCount = trimmedContent.split(/\s+/).filter(Boolean).length;
      const validationIssues = validateGeneratedSection(
        trimmedContent,
        sectionTitle,
        { min: 100, max: 2000, hardMin: 50, hardMax: 3000 } as WordRange,
        "",
      );

      const accepted = validationIssues.length === 0;
      const degraded = validationIssues.length > 0 && wordCount >= 50;

      return {
        content: accepted || degraded ? trimmedContent : null,
        accepted,
        degraded,
        wordCount,
        error: null,
      };
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    return {
      content: hadAnyContent ? content.trim() : null,
      accepted: false,
      degraded: false,
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}