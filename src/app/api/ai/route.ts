import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAIProvider,
  getFriendlyAIErrorMessage,
  getFriendlyAIErrorStatus,
} from "@/lib/ai";
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "@/lib/ai-cache";
import { AI_ACTION_CREDIT_COSTS as _AI_ACTION_CREDIT_COSTS, DEFAULT_AI_ACTION_COST as _DEFAULT_AI_ACTION_COST } from "@/lib/credits";
import { aiRequestSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";
import { subscriptionService, type AIAction } from "@/lib/subscription";

// System prompts for different education levels
const EDUCATION_PROMPTS = {
  SECONDARY: `Você é um assistente educacional para estudantes do ensino secundário moçambicano.

Suas responsabilidades:
- Ajudar a estruturar trabalhos escolares e projectos de investigação simples
- Explicar conceitos de forma clara e acessível
- Sugerir melhorias de texto com linguagem apropriada para o nível
- Gerar referências bibliográficas no formato ABNT simplificado
- Auxiliar na revisão gramatical básica

Regras importantes:
- Sempre responda em Português de Moçambique
- Use linguagem simples mas correcta
- Evite jargões técnicos excessivos
- Explique termos quando necessário
- Seja encorajador e educativo
- Para trabalhos de 500-2000 palavras
- Estrutura básica: Introdução, Desenvolvimento, Conclusão, Referências`,

  TECHNICAL: `Você é um assistente educacional para estudantes do ensino técnico profissional moçambicano.

Suas responsabilidades:
- Ajudar a estruturar relatórios de estágio e trabalhos práticos
- Sugerir melhorias de texto técnico e profissional
- Gerar referências bibliográficas no formato ABNT
- Auxiliar na elaboração de relatórios técnicos
- Propor conteúdo para trabalhos práticos

Regras importantes:
- Sempre responda em Português de Moçambique
- Use terminologia técnica apropriada
- Foque em aplicações práticas
- Inclua exemplos relevantes para o contexto profissional
- Para trabalhos de 1500-4000 palavras
- Estrutura: Capa, Resumo, Introdução, Desenvolvimento, Conclusão, Referências, Anexos`,

  HIGHER_EDUCATION: `Você é um assistente académico especializado em ajudar estudantes universitários moçambicanos.

Suas responsabilidades:
- Ajudar a estruturar documentos académicos (monografias, dissertações, teses, artigos)
- Sugerir melhorias de texto mantendo o estilo académico
- Gerar referências bibliográficas no formato ABNT, APA
- Auxiliar na revisão gramatical e de estilo
- Propor argumentos e contra-argumentos para discussões académicas

Regras importantes:
- Sempre responda em Português de Moçambique
- Mantenha um tom formal e académico
- Use terminologia académica apropriada
- Sugira referências quando relevante
- Seja objectivo e preciso
- Respeite as normas ABNT para citações e referências`,
};

// Plan-based prompts (for subscription levels)
const PLAN_PROMPTS = {
  FREE: `Você é um assistente educacional básico.
Responda sempre em Português de Moçambique.
Mantenha um tom formal mas acessível.`,

  STUDENT: EDUCATION_PROMPTS.HIGHER_EDUCATION,

  ACADEMIC: `Você é um assistente académico avançado, especializado em pesquisa e escrita académica de alto nível.

Suas capacidades:
- Análise crítica de literatura científica
- Estruturação de pesquisas complexas (teses, dissertações, artigos científicos)
- Revisão académica com sugestões de metodologia
- Geração de referências ABNT, APA, Vancouver
- Tradução académica Português-Inglês
- Verificação de coerência argumentativa
- Sugestão de lacunas de pesquisa

Padrões de qualidade:
- Rigor científico
- Precisão terminológica
- Coerência argumentativa
- Originalidade e criatividade
- Normas académicas internacionais

Sempre forneça respostas detalhadas, fundamentadas e com referências.`,
};

function getSystemPrompt(packageValue: string, educationLevel?: string): string {
  // First, try to get education-level specific prompt
  if (educationLevel && educationLevel in EDUCATION_PROMPTS) {
    return EDUCATION_PROMPTS[educationLevel as keyof typeof EDUCATION_PROMPTS];
  }
  // Fall back to package-based prompt
  return PLAN_PROMPTS[packageValue as keyof typeof PLAN_PROMPTS] || PLAN_PROMPTS.STUDENT;
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

    // Check cache first (if enabled)
    const cacheKey = generateCacheKey(action, [text, mergedContext, projectId].filter(Boolean).join("::"));
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

    const systemPrompt = getSystemPrompt(userPackage, educationLevel);

    const citationStyle = projectContext?.brief?.citationStyle || "ABNT";

    const isStructuredAction = action === "generate" || action === "generate-section" || action === "generate-complete";
    const temperature = isStructuredAction ? 0 : 0.3;
    const maxTokens = action === "generate-complete" ? 8000 : action === "generate-section" ? 4000 : 2000;

    let prompt: string;

    switch (action) {
      case "generate":
        prompt = `Gere conteúdo académico sobre: ${text}\n\nContexto adicional: ${
          mergedContext || "Nenhum"
        }\n\nEscreva em Português académico de Moçambique, com cerca de 200-300 palavras. Inclua estrutura clara e argumentos fundamentados.`;
        break;

      case "improve":
        prompt = `Melhore o seguinte texto académico, mantendo o significado original mas tornando-o mais formal, claro e bem estruturado:\n\n"${text}"\n\nContexto: ${
          mergedContext || "Trabalho académico"
        }\n\nForneça apenas o texto melhorado, sem explicações adicionais.`;
        break;

      case "suggest":
        prompt = `Com base no seguinte texto, sugira 3-5 continuidades ou desenvolvimentos possíveis. Para cada sugestão, forneça um breve parágrafo:\n\n"${text}"\n\nFormato: Lista numerada com cada sugestão.`;
        break;

      case "references":
        prompt = `Gere referências bibliográficas no formato ${citationStyle} para o seguinte tema ou fonte:\n\n"${text}"\n\nForneça pelo menos 5 referências relevantes e atuais, incluindo autores moçambicanos ou africanos quando possível.`;
        break;

      case "outline":
        prompt = `Crie um esboço estruturado e detalhado para um trabalho académico sobre: "${text}"\n\nTipo de documento: ${
          mergedContext || "Monografia"
        }\n\nInclua seções principais, subseções e breve descrição do conteúdo de cada uma.`;
        break;

      case "summarize":
        prompt = `Resuma o seguinte texto de forma concisa, mantendo os pontos principais:\n\n"${text}"\n\nO resumo deve ter cerca de 20% do tamanho original.`;
        break;

      case "translate":
        prompt = `Traduza o seguinte texto para Inglês académico, mantendo o tom formal:\n\n"${text}"`;
        break;

      case "citations":
        prompt = `Crie citações no formato ${citationStyle} para as seguintes informações:\n\n"${text}"\n\nForneça a citação no texto e a referência completa.`;
        break;

      case "plagiarism-check":
        prompt = `Analise o seguinte texto em busca de potenciais problemas de originalidade:\n\n"${text}"\n\nIdentifique:\n1. Frases que podem ser consideradas plágio\n2. Sugestões de parafraseamento\n3. Áreas que precisam de citação\n\nNão verifique realmente online, apenas analise criticamente.`;
        break;

      case "generate-section":
        prompt = `Gere o conteúdo completo para a seguinte secção de um trabalho académico:\n\nSecção: ${text}\n\nContexto do trabalho: ${
          mergedContext || "Trabalho académico"
        }\n\nEscreva em Português académico, com 400-600 palavras, incluindo:\n- Introdução ao tema\n- Desenvolvimento argumentativo\n- Conclusão parcial\n- Transição para próxima secção`;
        break;

      case "generate-complete":
        prompt = `Crie um plano completo para um trabalho académico sobre: "${text}"\n\nTipo: ${mergedContext || "Monografia"}\n\nForneça:\n1. Título sugerido\n2. Resumo (150 palavras)\n3. Estrutura completa com todas as secções\n4. Para cada secção: objetivo, pontos principais, referências sugeridas\n5. Conclusão geral\n\nFormate de forma clara e estruturada.`;
        break;

      case "chat":
      default:
        prompt = mergedContext ? `${text}\n\nContexto do trabalho:\n${mergedContext}` : text;
        break;
    }

    const provider = await getAIProvider();
    const completion = await provider.chatCompletion({
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
