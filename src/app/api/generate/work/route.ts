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

const SYSTEM_PROMPT = `Você é um especialista em escrita académica para estudantes universitários moçambicanos.
Gere conteúdo académico de alta qualidade em Português de Moçambique.
Siga rigorosamente as normas ABNT.
Seja preciso, formal e académico.
Inclua referências bibliográficas relevantes quando apropriado.`;

interface SectionToGenerate {
  title: string;
  order: number;
  prompt: string;
}

const DEFAULT_SECTIONS: SectionToGenerate[] = [
  { title: "1. Introdução", order: 6, prompt: "introdução completa com contextualização, problema, objetivos, justificativa e estrutura do trabalho" },
  { title: "2. Revisão da Literatura", order: 7, prompt: "revisão bibliográfica completa com autores clássicos e contemporâneos sobre o tema, organizada por temas" },
  { title: "3. Metodologia", order: 8, prompt: "metodologia detalhada com tipo de pesquisa, métodos de coleta, análise de dados e limitações" },
  { title: "4. Resultados", order: 9, prompt: "apresentação dos resultados obtidos, organizados de forma clara com análise preliminar" },
  { title: "5. Discussão", order: 10, prompt: "discussão aprofundada dos resultados à luz da literatura, implicações e conexões teóricas" },
  { title: "6. Conclusão", order: 11, prompt: "conclusão com síntese dos principais achados, contribuições, limitações e sugestões para pesquisas futuras" },
];

// POST /api/generate/work - Generate complete academic work
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      type = "MONOGRAPHY", 
      description,
      generateContent = true,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Título é obrigatório" },
        { status: 400 }
      );
    }

    // Calculate credits needed
    const baseCost = 20;
    const contentCost = generateContent ? DEFAULT_SECTIONS.length * 15 : 0;
    const totalCost = baseCost + contentCost;

    // Check user credits
    const userCredits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits || userCredits.balance < totalCost) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Necessário: ${totalCost} créditos.` },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    // Create project with transaction
    const result = await db.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          title,
          description,
          type,
          userId: session.user.id,
          status: "IN_PROGRESS",
        },
      });

      // Create static sections
      const staticSections = [
        { title: "Capa", order: 1, content: generateCover(title, session.user.name || "Autor", type) },
        { title: "Resumo", order: 2 },
        { title: "Abstract", order: 3 },
        { title: "Agradecimentos", order: 4 },
        { title: "Índice", order: 5 },
        { title: "Referências", order: 12 },
        { title: "Anexos", order: 13 },
      ];

      for (const section of staticSections) {
        await tx.documentSection.create({
          data: {
            projectId: project.id,
            title: section.title,
            order: section.order,
            content: section.content || "",
          },
        });
      }

      // Create main content sections
      for (const section of DEFAULT_SECTIONS) {
        let content = "";

        if (generateContent) {
          const prompt = `Gere a ${section.prompt} para um trabalho académico sobre: "${title}"

Tipo de trabalho: ${formatProjectType(type)}
Autor: ${session.user.name || "Estudante"}

Requisitos:
- Texto em Português académico de Moçambique
- Entre 400-600 palavras
- Inclua pelo menos 2-3 referências ABNT relevantes
- Use linguagem formal e objectiva
- Estruture com subtitulos quando apropriado`;

          const completion = await zai.chat.completions.create({
            model: "glm-4.7-flash",
            messages: [
              { role: "assistant", content: SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            thinking: { type: "disabled" },
          });

          content = completion.choices[0]?.message?.content || "";
        }

        await tx.documentSection.create({
          data: {
            projectId: project.id,
            title: section.title,
            order: section.order,
            content,
          },
        });
      }

      // Generate abstract
      if (generateContent) {
        const abstractPrompt = `Gere um resumo académico para o trabalho sobre: "${title}"

O resumo deve:
- Ter 150-250 palavras
- Incluir: objetivo, metodologia, resultados e conclusão
- Ser em Português de Moçambique
- Seguir normas ABNT`;

        const abstractCompletion = await zai.chat.completions.create({
          model: "glm-4.7-flash",
          messages: [
            { role: "assistant", content: SYSTEM_PROMPT },
            { role: "user", content: abstractPrompt },
          ],
          thinking: { type: "disabled" },
        });

        const abstractContent = abstractCompletion.choices[0]?.message?.content || "";

        await tx.documentSection.updateMany({
          where: { projectId: project.id, title: "Resumo" },
          data: { content: abstractContent },
        });
      }

      // Deduct credits
      await tx.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: totalCost },
          used: { increment: totalCost },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -totalCost,
          type: "USAGE",
          description: `Geração de trabalho: ${title}`,
          metadata: JSON.stringify({ projectId: project.id, type: generateContent ? "complete" : "structure" }),
        },
      });

      return project;
    });

    // Fetch the complete project
    const completeProject = await db.project.findUnique({
      where: { id: result.id },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      project: completeProject,
      creditsUsed: totalCost,
      message: generateContent 
        ? "Trabalho completo gerado com sucesso!" 
        : "Estrutura do trabalho criada com sucesso!",
    });
  } catch (error) {
    console.error("Generate work error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar trabalho" },
      { status: 500 }
    );
  }
}

function generateCover(title: string, author: string, type: string): string {
  const year = new Date().getFullYear();
  return `
UNIVERSIDADE

${type === "MONOGRAPHY" ? "MONOGRAFIA" : type === "DISSERTATION" ? "DISSERTAÇÃO" : type === "THESIS" ? "TESE" : "TRABALHO ACADÉMICO"}

${title.toUpperCase()}

Autor: ${author}
Ano: ${year}
`.trim();
}

function formatProjectType(type: string): string {
  const types: Record<string, string> = {
    MONOGRAPHY: "Monografia",
    DISSERTATION: "Dissertação de Mestrado",
    THESIS: "Tese de Doutoramento",
    ARTICLE: "Artigo Científico",
    ESSAY: "Ensaio",
    REPORT: "Relatório",
  };
  return types[type] || "Trabalho Académico";
}
