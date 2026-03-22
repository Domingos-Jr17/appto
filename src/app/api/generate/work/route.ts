import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createZAIChatCompletion, getFriendlyZAIErrorMessage } from "@/lib/zai";

const SYSTEM_PROMPT = `Você é um especialista em escrita académica para estudantes universitários moçambicanos.
Gere conteúdo académico de alta qualidade em Português de Moçambique.
Siga rigorosamente as normas ABNT.
Seja preciso, formal e académico.
Inclua referências bibliográficas relevantes quando apropriado.`;

interface SectionTemplate {
  title: string;
  order: number;
}

interface GeneratedSection {
  title: string;
  content: string;
}

interface GeneratedWorkContent {
  abstract: string;
  sections: GeneratedSection[];
}

const DEFAULT_SECTIONS: SectionTemplate[] = [
  { title: "1. Introdução", order: 6 },
  { title: "2. Revisão da Literatura", order: 7 },
  { title: "3. Metodologia", order: 8 },
  { title: "4. Resultados", order: 9 },
  { title: "5. Discussão", order: 10 },
  { title: "6. Conclusão", order: 11 },
];

function extractJSONObject(rawContent: string) {
  const trimmed = rawContent.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("A IA não devolveu JSON válido para o trabalho completo.");
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}

function parseGeneratedWorkContent(rawContent: string) {
  const parsed = JSON.parse(extractJSONObject(rawContent)) as Partial<GeneratedWorkContent>;

  if (!parsed.abstract || typeof parsed.abstract !== "string") {
    throw new Error("A IA não devolveu um resumo válido.");
  }

  if (!Array.isArray(parsed.sections)) {
    throw new Error("A IA não devolveu as secções esperadas.");
  }

  const sectionsByTitle = new Map(
    parsed.sections
      .filter(
        (section): section is GeneratedSection =>
          Boolean(
            section &&
              typeof section.title === "string" &&
              typeof section.content === "string"
          )
      )
      .map((section) => [section.title.trim(), section.content.trim()])
  );

  const sections = DEFAULT_SECTIONS.map((section) => {
    const content = sectionsByTitle.get(section.title);

    if (!content) {
      throw new Error(`A IA não devolveu conteúdo para a secção "${section.title}".`);
    }

    return {
      title: section.title,
      content,
    };
  });

  return {
    abstract: parsed.abstract.trim(),
    sections,
  };
}

async function generateCompleteWorkContent(title: string, type: string, author: string) {
  const orderedTitles = DEFAULT_SECTIONS.map((section) => section.title).join(", ");
  const prompt = `Gere um trabalho académico completo sobre "${title}".

Tipo de trabalho: ${formatProjectType(type)}
Autor: ${author}

Responda exclusivamente com JSON válido, sem markdown, sem comentários, sem texto antes ou depois.

Use exactamente este formato:
{
  "abstract": "resumo académico",
  "sections": [
    { "title": "1. Introdução", "content": "..." },
    { "title": "2. Revisão da Literatura", "content": "..." },
    { "title": "3. Metodologia", "content": "..." },
    { "title": "4. Resultados", "content": "..." },
    { "title": "5. Discussão", "content": "..." },
    { "title": "6. Conclusão", "content": "..." }
  ]
}

Requisitos obrigatórios:
- Mantenha exactamente estes títulos e esta ordem: ${orderedTitles}
- "abstract" deve ter entre 150 e 220 palavras
- Cada secção deve ter entre 220 e 320 palavras
- Use Português académico de Moçambique
- Siga normas ABNT
- Use linguagem formal, precisa e académica
- Não deixe nenhuma secção vazia
- Produza JSON estritamente válido`;

  const completion = await createZAIChatCompletion({
    model: "glm-4.7-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    thinking: { type: "disabled" },
    max_tokens: 7000,
  });

  const rawContent = completion.choices[0]?.message?.content || "";

  if (!rawContent) {
    throw new Error("A IA não devolveu conteúdo para o trabalho completo.");
  }

  return parseGeneratedWorkContent(rawContent);
}

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

    let shouldGenerateContent = Boolean(generateContent);
    let fallbackWarning: string | null = null;
    const sectionContents = new Map<string, string>();
    let abstractContent = "";

    if (shouldGenerateContent) {
      try {
        const generatedContent = await generateCompleteWorkContent(
          title,
          type,
          session.user.name || "Estudante"
        );

        for (const section of generatedContent.sections) {
          sectionContents.set(section.title, section.content);
        }

        abstractContent = generatedContent.abstract;
      } catch (error) {
        console.warn(
          "ZAI unavailable for project generation, falling back to structure-only mode:",
          error
        );
        shouldGenerateContent = false;
        fallbackWarning =
          `Estrutura do trabalho criada com sucesso. ${getFriendlyZAIErrorMessage(error)}`;
      }
    }

    const baseCost = 20;
    const contentCost = shouldGenerateContent ? DEFAULT_SECTIONS.length * 15 : 0;
    const totalCost = baseCost + contentCost;

    const userCredits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits || userCredits.balance < totalCost) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Necessário: ${totalCost} créditos.` },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title,
          description,
          type,
          userId: session.user.id,
          status: "IN_PROGRESS",
        },
      });

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

      for (const section of DEFAULT_SECTIONS) {
        await tx.documentSection.create({
          data: {
            projectId: project.id,
            title: section.title,
            order: section.order,
            content: shouldGenerateContent
              ? sectionContents.get(section.title) || ""
              : "",
          },
        });
      }

      if (shouldGenerateContent && abstractContent) {
        await tx.documentSection.updateMany({
          where: { projectId: project.id, title: "Resumo" },
          data: { content: abstractContent },
        });
      }

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
          metadata: JSON.stringify({
            projectId: project.id,
            type: shouldGenerateContent ? "complete" : "structure",
          }),
        },
      });

      return project;
    });

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
      message: shouldGenerateContent
        ? "Trabalho completo gerado com sucesso!"
        : fallbackWarning || "Estrutura do trabalho criada com sucesso!",
      contentGenerated: shouldGenerateContent,
    });
  } catch (error) {
    console.error("Generate work error:", error);
    const message =
      process.env.NODE_ENV === "production"
        ? "Erro ao gerar trabalho"
        : error instanceof Error
          ? error.message
          : "Erro ao gerar trabalho";
    return NextResponse.json(
      { error: message },
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
