import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getFriendlyAIErrorMessage,
  getFriendlyAIErrorStatus,
  runAIChatCompletion,
} from "@/lib/ai";
import { PROMPT_VERSION, buildActionPrompt, buildSystemPrompt } from "@/lib/ai-prompts";
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "@/lib/ai-cache";
import { aiRequestSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";
import { subscriptionService, type AIAction } from "@/lib/subscription";

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, text, context, projectId, useCache = true } = parsed.data;

    const actionKey = action as AIAction;
    
    // Check subscription for AI access
    const { allowed: aiAllowed, reason: aiReason } = await subscriptionService.canUseAIAction(session.user.id, actionKey);
    
    if (!aiAllowed) {
      return NextResponse.json(
        { error: aiReason || "Ação não disponível no seu pacote" },
        { status: 403 }
      );
    }

    // Get user's package features for logging/audit purposes
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });
    const packageFeatures = subscriptionService.getPackageFeatures(subscription?.package || "FREE");

    // Get user's credits for display (no deduction needed as all plans include AI)
    const userCredits = await db.credit.findUnique({ where: { userId: session.user.id } });

    // Get user's package and education level for appropriate system prompt
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { educationLevel: true },
    });
    const userPackage = subscription?.package || "FREE";
    const educationLevel = user?.educationLevel || undefined;

    const projectContext = projectId
      ? await db.project.findFirst({
          where: { id: projectId, userId: session.user.id },
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
      : null;

    const mergedContext = [projectContext ? buildProjectContext(projectContext) : null, context]
      .filter(Boolean)
      .join("\n\n");

    const citationStyle = projectContext?.brief?.citationStyle || "ABNT";

    // Check cache first (if enabled)
    const cacheKey = generateCacheKey(
      action,
      [
        PROMPT_VERSION,
        userPackage,
        educationLevel,
        citationStyle,
        text,
        mergedContext,
        projectId,
      ]
        .filter(Boolean)
        .join("::"),
    );
    if (useCache) {
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        // Cache hit - no credits deducted, free response!
        return NextResponse.json({
          success: true,
          response: cachedResponse,
          creditsUsed: 0,
          remainingCredits: userCredits?.balance || 0,
          cached: true,
        });
      }
    }

    const systemPrompt = buildSystemPrompt(userPackage, educationLevel);

    const isStructuredAction = action === "generate" || action === "generate-section" || action === "generate-complete";
    const temperature = isStructuredAction ? 0 : 0.3;
    const maxTokens = action === "generate-complete" ? 8000 : action === "generate-section" ? 4000 : 2000;

    const prompt = buildActionPrompt({
      action: actionKey,
      text,
      mergedContext,
      citationStyle,
    });

    const completion = await runAIChatCompletion({
      model: "", // Provider uses its default model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const response = completion.choices[0]?.message?.content || "";

    if (!response) {
      return NextResponse.json(
        { error: "Erro ao gerar resposta" },
        { status: 500 }
      );
    }

    // Cache the response
    setCachedResponse(cacheKey, response);

    return NextResponse.json({
      success: true,
      response,
      remainingCredits: userCredits?.balance || 0,
      package: packageFeatures.key,
      promptVersion: PROMPT_VERSION,
    });
  } catch (error) {
    logger.error("AI generation error", { error: String(error) });
    return NextResponse.json(
      { error: getFriendlyAIErrorMessage(error) },
      { status: getFriendlyAIErrorStatus(error) }
    );
  }
}

// GET endpoint for cache stats (admin only)
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { getCacheStats } = await import("@/lib/ai-cache");
  return NextResponse.json(getCacheStats());
}
