import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// Initialize ZAI instance
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

const ACADEMIC_SYSTEM_PROMPT = `Você é um assistente académico especializado em ajudar estudantes moçambicanos a escrever trabalhos académicos de alta qualidade.

Suas responsabilidades:
- Ajudar a estruturar documentos académicos (monografias, dissertações, teses, artigos)
- Sugerir melhorias de texto mantendo o estilo académico
- Gerar referências bibliográficas no formato ABNT
- Auxiliar na revisão gramatical e de estilo
- Propor argumentos e contra-argumentos para discussões académicas
- Responder em Português de Moçambique (pt-MZ)

Regras importantes:
- Sempre responda em Português
- Mantenha um tom formal e académico
- Use terminologia académica apropriada
- Sugira referências quando relevante
- Seja objetivo e preciso
- Respeite as normas ABNT para citações e referências`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { action, text, context, projectId } = body;

    // Check user credits
    const userCredits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits || userCredits.balance < 5) {
      return NextResponse.json(
        { error: "Créditos insuficientes. Por favor, adquira mais créditos." },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    let response: string;
    let creditsUsed = 5;

    switch (action) {
      case "generate":
        // Generate content based on topic/context
        const generateCompletion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: ACADEMIC_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Gere conteúdo académico sobre: ${text}\n\nContexto adicional: ${
                context || "Nenhum"
              }\n\nEscreva em Português académico, com cerca de 200-300 palavras.`,
            },
          ],
          thinking: { type: "disabled" },
        });
        response = generateCompletion.choices[0]?.message?.content || "";
        creditsUsed = 10;
        break;

      case "improve":
        // Improve existing text
        const improveCompletion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: ACADEMIC_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Melhore o seguinte texto académico, mantendo o significado original mas tornando-o mais formal, claro e bem estruturado:\n\n"${text}"\n\nContexto: ${
                context || "Trabalho académico"
              }\n\nForneça apenas o texto melhorado, sem explicações adicionais.`,
            },
          ],
          thinking: { type: "disabled" },
        });
        response = improveCompletion.choices[0]?.message?.content || "";
        creditsUsed = 5;
        break;

      case "suggest":
        // Generate writing suggestions
        const suggestCompletion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: ACADEMIC_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Com base no seguinte texto, sugira 3-5 continuidades ou desenvolvimentos possíveis. Para cada sugestão, forneça um breve parágrafo:\n\n"${text}"\n\nFormato: Lista numerada com cada sugestão.`,
            },
          ],
          thinking: { type: "disabled" },
        });
        response = suggestCompletion.choices[0]?.message?.content || "";
        creditsUsed = 7;
        break;

      case "references":
        // Generate ABNT references
        const refCompletion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: ACADEMIC_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Gere referências bibliográficas no formato ABNT para o seguinte tema ou fonte:\n\n"${text}"\n\nForneça pelo menos 3 referências relevantes.`,
            },
          ],
          thinking: { type: "disabled" },
        });
        response = refCompletion.choices[0]?.message?.content || "";
        creditsUsed = 3;
        break;

      case "outline":
        // Generate document outline
        const outlineCompletion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: ACADEMIC_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Crie um esboço estruturado para um trabalho académico sobre: "${text}"\n\nTipo de documento: ${
                context || "Monografia"
              }\n\nInclua seções principais e subseções.`,
            },
          ],
          thinking: { type: "disabled" },
        });
        response = outlineCompletion.choices[0]?.message?.content || "";
        creditsUsed = 5;
        break;

      case "chat":
        // General academic chat
        const chatCompletion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: ACADEMIC_SYSTEM_PROMPT },
            { role: "user", content: text },
          ],
          thinking: { type: "disabled" },
        });
        response = chatCompletion.choices[0]?.message?.content || "";
        creditsUsed = 3;
        break;

      default:
        return NextResponse.json(
          { error: "Ação não reconhecida" },
          { status: 400 }
        );
    }

    // Deduct credits
    await db.$transaction([
      db.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: creditsUsed },
          used: { increment: creditsUsed },
        },
      }),
      db.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -creditsUsed,
          type: "USAGE",
          description: `IA: ${action}`,
          metadata: JSON.stringify({ projectId }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      response,
      creditsUsed,
      remainingCredits: userCredits.balance - creditsUsed,
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Erro ao processar pedido de IA" },
      { status: 500 }
    );
  }
}
