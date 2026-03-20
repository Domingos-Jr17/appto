import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createZAIChatCompletion,
  getFriendlyZAIErrorMessage,
  getFriendlyZAIErrorStatus,
} from "@/lib/zai";
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "@/lib/ai-cache";

// Credit costs for each action
const CREDIT_COSTS: Record<string, number> = {
  generate: 10,
  improve: 5,
  suggest: 7,
  references: 3,
  outline: 5,
  chat: 3,
  summarize: 3,
  translate: 5,
  citations: 2,
  "plagiarism-check": 15,
  "generate-section": 8,
  "generate-complete": 50, // Generate entire work
};

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

function getSystemPrompt(plan: string, educationLevel?: string): string {
  // First, try to get education-level specific prompt
  if (educationLevel && educationLevel in EDUCATION_PROMPTS) {
    return EDUCATION_PROMPTS[educationLevel as keyof typeof EDUCATION_PROMPTS];
  }
  // Fall back to plan-based prompt
  return PLAN_PROMPTS[plan as keyof typeof PLAN_PROMPTS] || PLAN_PROMPTS.STUDENT;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { action, text, context, projectId, useCache = true } = body;

    const creditsNeeded = CREDIT_COSTS[action] || 5;

    // Check user credits
    const userCredits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits || userCredits.balance < creditsNeeded) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Necessário: ${creditsNeeded} créditos.` },
        { status: 400 }
      );
    }

    // Get user's plan and education level for appropriate system prompt
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { educationLevel: true },
    });
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });
    const userPlan = subscription?.plan || "STUDENT";
    const educationLevel = user?.educationLevel || undefined;

    // Check cache first (if enabled)
    const cacheKey = generateCacheKey(action, text || context || "");
    if (useCache) {
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        // Cache hit - no credits deducted, free response!
        return NextResponse.json({
          success: true,
          response: cachedResponse,
          creditsUsed: 0,
          remainingCredits: userCredits.balance,
          cached: true,
        });
      }
    }

    const systemPrompt = getSystemPrompt(userPlan, educationLevel);

    let response: string;
    let prompt: string;

    switch (action) {
      case "generate":
        prompt = `Gere conteúdo académico sobre: ${text}\n\nContexto adicional: ${
          context || "Nenhum"
        }\n\nEscreva em Português académico de Moçambique, com cerca de 200-300 palavras. Inclua estrutura clara e argumentos fundamentados.`;
        break;

      case "improve":
        prompt = `Melhore o seguinte texto académico, mantendo o significado original mas tornando-o mais formal, claro e bem estruturado:\n\n"${text}"\n\nContexto: ${
          context || "Trabalho académico"
        }\n\nForneça apenas o texto melhorado, sem explicações adicionais.`;
        break;

      case "suggest":
        prompt = `Com base no seguinte texto, sugira 3-5 continuidades ou desenvolvimentos possíveis. Para cada sugestão, forneça um breve parágrafo:\n\n"${text}"\n\nFormato: Lista numerada com cada sugestão.`;
        break;

      case "references":
        prompt = `Gere referências bibliográficas no formato ABNT para o seguinte tema ou fonte:\n\n"${text}"\n\nForneça pelo menos 5 referências relevantes e atuais, incluindo autores moçambicanos ou africanos quando possível.`;
        break;

      case "outline":
        prompt = `Crie um esboço estruturado e detalhado para um trabalho académico sobre: "${text}"\n\nTipo de documento: ${
          context || "Monografia"
        }\n\nInclua seções principais, subseções e breve descrição do conteúdo de cada uma.`;
        break;

      case "summarize":
        prompt = `Resuma o seguinte texto de forma concisa, mantendo os pontos principais:\n\n"${text}"\n\nO resumo deve ter cerca de 20% do tamanho original.`;
        break;

      case "translate":
        prompt = `Traduza o seguinte texto para Inglês académico, mantendo o tom formal:\n\n"${text}"`;
        break;

      case "citations":
        prompt = `Crie citações no formato ABNT para as seguintes informações:\n\n"${text}"\n\nForneça a citação no texto e a referência completa.`;
        break;

      case "plagiarism-check":
        prompt = `Analise o seguinte texto em busca de potenciais problemas de originalidade:\n\n"${text}"\n\nIdentifique:\n1. Frases que podem ser consideradas plágio\n2. Sugestões de parafraseamento\n3. Áreas que precisam de citação\n\nNão verifique realmente online, apenas analise criticamente.`;
        break;

      case "generate-section":
        prompt = `Gere o conteúdo completo para a seguinte secção de um trabalho académico:\n\nSecção: ${text}\n\nContexto do trabalho: ${
          context || "Trabalho académico"
        }\n\nEscreva em Português académico, com 400-600 palavras, incluindo:\n- Introdução ao tema\n- Desenvolvimento argumentativo\n- Conclusão parcial\n- Transição para próxima secção`;
        break;

      case "generate-complete":
        prompt = `Crie um plano completo para um trabalho académico sobre: "${text}"\n\nTipo: ${context || "Monografia"}\n\nForneça:\n1. Título sugerido\n2. Resumo (150 palavras)\n3. Estrutura completa com todas as secções\n4. Para cada secção: objetivo, pontos principais, referências sugeridas\n5. Conclusão geral\n\nFormate de forma clara e estruturada.`;
        break;

      case "chat":
      default:
        prompt = text;
        break;
    }

    const completion = await createZAIChatCompletion({
      model: "glm-4.7-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });

    response = completion.choices[0]?.message?.content || "";

    if (!response) {
      return NextResponse.json(
        { error: "Erro ao gerar resposta" },
        { status: 500 }
      );
    }

    // Cache the response
    setCachedResponse(cacheKey, response);

    // Deduct credits
    await db.$transaction([
      db.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: creditsNeeded },
          used: { increment: creditsNeeded },
        },
      }),
      db.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -creditsNeeded,
          type: "USAGE",
          description: `IA: ${action}`,
          metadata: JSON.stringify({ projectId, cached: false }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      response,
      creditsUsed: creditsNeeded,
      remainingCredits: userCredits.balance - creditsNeeded,
      plan: userPlan,
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: getFriendlyZAIErrorMessage(error) },
      { status: getFriendlyZAIErrorStatus(error) }
    );
  }
}

// GET endpoint for cache stats (admin only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { getCacheStats } = await import("@/lib/ai-cache");
  return NextResponse.json(getCacheStats());
}
