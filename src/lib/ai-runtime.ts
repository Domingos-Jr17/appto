import { ApiRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { generateCacheKey, getCachedResponse, setCachedResponse } from "@/lib/ai-cache";
import { buildActionPrompt, buildSystemPrompt, PROMPT_VERSION } from "@/lib/ai-prompts";
import { runAIChatCompletion, runAIChatStream } from "@/lib/ai";
import type { AIChatRequest } from "@/lib/ai-types";
import { evaluateFactualValidation } from "@/lib/factual-validation";
import { buildRagContext, RagService } from "@/lib/rag";
import { subscriptionService, type AIAction } from "@/lib/subscription";

interface ProcessAiRequestInput {
  userId: string;
  action: AIAction;
  text: string;
  context?: string;
  projectId?: string | null;
  useCache?: boolean;
}

interface PreparedAiRequest {
  request: AIChatRequest;
  cacheKey: string;
  cachedResponse: string | null;
  packageKey: string;
  promptVersion: string;
  remainingWorks: number;
  sources: Awaited<ReturnType<RagService["search"]>>;
  warnings: string[];
}

interface ProcessAiRequestResult {
  response: string;
  cached: boolean;
  packageKey: string;
  promptVersion: string;
  remainingWorks: number;
  sources: Awaited<ReturnType<RagService["search"]>>;
  warnings: string[];
}

interface StreamAiRequestResult {
  stream: ReadableStream<Uint8Array>;
  cached: boolean;
  packageKey: string;
  promptVersion: string;
  remainingWorks: number;
  sources: Awaited<ReturnType<RagService["search"]>>;
  warnings: string[];
}

function buildProjectContext(project: {
  title: string;
  type: string;
  brief: {
    institutionName: string | null;
    courseName: string | null;
    subjectName: string | null;
    advisorName: string | null;
    studentName: string | null;
    educationLevel: string | null;
    city: string | null;
    academicYear: number | null;
    objective: string | null;
    researchQuestion: string | null;
    methodology: string | null;
    keywords: string | null;
    referencesSeed: string | null;
    subtitle: string | null;
    language: string;
    citationStyle: string;
    additionalInstructions: string | null;
  } | null;
}) {
  const brief = project.brief;

  return [
    `Título do trabalho: ${project.title}`,
    `Tipo: ${project.type}`,
    brief?.subtitle ? `Subtítulo: ${brief.subtitle}` : null,
    brief?.institutionName ? `Instituição: ${brief.institutionName}` : null,
    brief?.courseName ? `Curso: ${brief.courseName}` : null,
    brief?.subjectName ? `Disciplina: ${brief.subjectName}` : null,
    brief?.educationLevel ? `Nível académico: ${brief.educationLevel}` : null,
    brief?.advisorName ? `Orientador: ${brief.advisorName}` : null,
    brief?.studentName ? `Estudante: ${brief.studentName}` : null,
    brief?.city ? `Cidade: ${brief.city}` : null,
    brief?.academicYear ? `Ano académico: ${brief.academicYear}` : null,
    brief?.objective ? `Objetivo: ${brief.objective}` : null,
    brief?.researchQuestion ? `Pergunta de investigação: ${brief.researchQuestion}` : null,
    brief?.methodology ? `Metodologia: ${brief.methodology}` : null,
    brief?.keywords ? `Palavras-chave: ${brief.keywords}` : null,
    brief?.referencesSeed ? `Referências sugeridas: ${brief.referencesSeed}` : null,
    brief?.citationStyle ? `Norma de citação: ${brief.citationStyle}` : null,
    brief?.language ? `Idioma: ${brief.language}` : null,
    brief?.additionalInstructions ? `Instruções adicionais: ${brief.additionalInstructions}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function prepareAiRequest(input: ProcessAiRequestInput): Promise<PreparedAiRequest> {
  const { userId, action, text, context, projectId, useCache = true } = input;

  const { allowed, reason } = await subscriptionService.canUseAIAction(userId, action);
  if (!allowed) {
    throw new ApiRouteError(reason || "Ação não disponível no seu pacote", 403, "AI_ACTION_NOT_ALLOWED");
  }

  const [subscription, user, projectContext] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { educationLevel: true } }),
    projectId
      ? db.project.findFirst({
          where: { id: projectId, userId },
          select: {
            title: true,
            type: true,
            brief: {
              select: {
                institutionName: true,
                courseName: true,
                subjectName: true,
                advisorName: true,
                studentName: true,
                educationLevel: true,
                city: true,
                academicYear: true,
                objective: true,
                researchQuestion: true,
                methodology: true,
                keywords: true,
                referencesSeed: true,
                subtitle: true,
                language: true,
                citationStyle: true,
                additionalInstructions: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const userPackage = subscription?.package || "FREE";
  const educationLevel = user?.educationLevel || undefined;
  const baseContext = [projectContext ? buildProjectContext(projectContext) : null, context]
    .filter(Boolean)
    .join("\n\n");
  const citationStyle = projectContext?.brief?.citationStyle || "ABNT";
  const ragService = new RagService();
  const sources = await ragService.search([text, baseContext].filter(Boolean).join("\n"), userId);
  const ragContext = buildRagContext(sources);
  const mergedContext = [baseContext, ragContext].filter(Boolean).join("\n\n");
  const factualValidation = evaluateFactualValidation({
    action,
    text,
    hasGroundedSources: sources.length > 0,
    hasReferenceSeed: Boolean(projectContext?.brief?.referencesSeed),
  });

  if (factualValidation.blocked) {
    throw new ApiRouteError(factualValidation.message || "Pedido bloqueado por validação factual.", 400, "FACTUAL_VALIDATION_BLOCKED");
  }

  const cacheKey = generateCacheKey(
    action,
    [PROMPT_VERSION, userPackage, educationLevel, citationStyle, text, mergedContext, projectId]
      .filter(Boolean)
      .join("::"),
  );

  const systemPrompt = buildSystemPrompt(userPackage, educationLevel);
  const prompt = buildActionPrompt({
    action,
    text,
    mergedContext,
    citationStyle,
  });
  const isStructuredAction = action === "generate" || action === "generate-section" || action === "generate-complete";

  return {
    request: {
      model: "",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: isStructuredAction ? 0 : 0.3,
      max_tokens: action === "generate-complete" ? 8000 : action === "generate-section" ? 4000 : 2000,
    },
    cacheKey,
    cachedResponse: useCache ? await getCachedResponse(cacheKey) : null,
    packageKey: userPackage,
    promptVersion: PROMPT_VERSION,
    remainingWorks: await subscriptionService.canGenerateWork(userId).then((result) => result.remaining),
    sources,
    warnings: factualValidation.warnings,
  };
}

export async function processAiRequest(input: ProcessAiRequestInput): Promise<ProcessAiRequestResult> {
  const prepared = await prepareAiRequest(input);

  if (prepared.cachedResponse) {
    return {
      response: prepared.cachedResponse,
      cached: true,
      packageKey: prepared.packageKey,
      promptVersion: prepared.promptVersion,
      remainingWorks: prepared.remainingWorks,
      sources: prepared.sources,
      warnings: prepared.warnings,
    };
  }

  const completion = await runAIChatCompletion(prepared.request);
  const response = completion.choices[0]?.message?.content || "";
  if (!response) {
    throw new ApiRouteError("Erro ao gerar resposta", 502, "EMPTY_AI_RESPONSE");
  }

  await setCachedResponse(prepared.cacheKey, response);

  return {
    response,
    cached: false,
    packageKey: prepared.packageKey,
    promptVersion: prepared.promptVersion,
    remainingWorks: prepared.remainingWorks,
    sources: prepared.sources,
    warnings: prepared.warnings,
  };
}

export async function streamAiRequest(input: ProcessAiRequestInput): Promise<StreamAiRequestResult> {
  const prepared = await prepareAiRequest(input);
  const encoder = new TextEncoder();

  if (prepared.cachedResponse) {
    return {
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(prepared.cachedResponse || ""));
          controller.close();
        },
      }),
      cached: true,
      packageKey: prepared.packageKey,
      promptVersion: prepared.promptVersion,
      remainingWorks: prepared.remainingWorks,
      sources: prepared.sources,
      warnings: prepared.warnings,
    };
  }

  const providerStream = await runAIChatStream({
    ...prepared.request,
    stream: true,
  });

  const reader = providerStream.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          fullResponse += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        }

        if (fullResponse.trim()) {
          await setCachedResponse(prepared.cacheKey, fullResponse);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return {
    stream,
    cached: false,
    packageKey: prepared.packageKey,
    promptVersion: prepared.promptVersion,
    remainingWorks: prepared.remainingWorks,
    sources: prepared.sources,
    warnings: prepared.warnings,
  };
}
