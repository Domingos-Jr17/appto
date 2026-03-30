import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createWorkSchema } from "@/lib/validators";
import { createZAIChatCompletion, getFriendlyZAIErrorMessage } from "@/lib/zai";
import type { WorkBriefInput } from "@/types/editor";

const SYSTEM_PROMPT = `Você é um especialista em escrita académica para estudantes moçambicanos.
Gere conteúdo académico de alta qualidade em Português de Moçambique.
Siga a norma de citação pedida no briefing.
Seja formal, estruturado e academicamente plausível.
Nunca invente metadados da capa sem base no briefing.`;

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

const SECTION_TEMPLATES: Record<string, SectionTemplate[]> = {
  MONOGRAPHY: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Revisão da Literatura", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. Desenvolvimento", order: 6 },
    { title: "5. Conclusão", order: 7 },
  ],
  DISSERTATION: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Fundamentação Teórica", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. Análise e Discussão", order: 6 },
    { title: "5. Conclusão", order: 7 },
  ],
  THESIS: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Revisão da Literatura", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. Resultados", order: 6 },
    { title: "5. Discussão", order: 7 },
    { title: "6. Conclusão", order: 8 },
  ],
  ARTICLE: [
    { title: "1. Introdução", order: 4 },
    { title: "2. Metodologia", order: 5 },
    { title: "3. Resultados e Discussão", order: 6 },
    { title: "4. Conclusão", order: 7 },
  ],
  ESSAY: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Desenvolvimento", order: 4 },
    { title: "3. Conclusão", order: 5 },
  ],
  REPORT: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Enquadramento", order: 4 },
    { title: "3. Desenvolvimento", order: 5 },
    { title: "4. Resultados", order: 6 },
    { title: "5. Conclusão", order: 7 },
  ],
  SCHOOL_WORK: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Desenvolvimento", order: 4 },
    { title: "3. Conclusão", order: 5 },
  ],
  RESEARCH_PROJECT: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Revisão da Literatura", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. Resultados", order: 6 },
    { title: "5. Conclusão", order: 7 },
  ],
  INTERNSHIP_REPORT: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Contexto do Estágio", order: 4 },
    { title: "3. Actividades Desenvolvidas", order: 5 },
    { title: "4. Resultados e Aprendizagens", order: 6 },
    { title: "5. Conclusão", order: 7 },
  ],
  PRACTICAL_WORK: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Procedimentos", order: 4 },
    { title: "3. Resultados", order: 5 },
    { title: "4. Conclusão", order: 6 },
  ],
  TCC: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Fundamentação Teórica", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. Desenvolvimento", order: 6 },
    { title: "5. Conclusão", order: 7 },
  ],
};

function extractJSONObject(rawContent: string) {
  const trimmed = rawContent.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("A IA não devolveu JSON válido para o trabalho.");
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}

function parseGeneratedWorkContent(rawContent: string, templates: SectionTemplate[]) {
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
          Boolean(section && typeof section.title === "string" && typeof section.content === "string")
      )
      .map((section) => [section.title.trim(), section.content.trim()])
  );

  const sections = templates.map((section) => {
    const content = sectionsByTitle.get(section.title);

    if (!content) {
      throw new Error(`A IA não devolveu conteúdo para a secção "${section.title}".`);
    }

    return { title: section.title, content };
  });

  return {
    abstract: parsed.abstract.trim(),
    sections,
  };
}

function getSectionTemplates(type: string) {
  return SECTION_TEMPLATES[type] || SECTION_TEMPLATES.MONOGRAPHY;
}

function buildBriefContext(brief: WorkBriefInput) {
  return [
    ["Instituição", brief.institutionName],
    ["Curso", brief.courseName],
    ["Disciplina", brief.subjectName],
    ["Nível académico", brief.educationLevel],
    ["Professor/Orientador", brief.advisorName],
    ["Estudante", brief.studentName],
    ["Cidade", brief.city],
    ["Ano académico", brief.academicYear?.toString()],
    ["Prazo", brief.dueDate],
    ["Tema", brief.theme],
    ["Subtítulo", brief.subtitle],
    ["Objetivo", brief.objective],
    ["Pergunta de investigação", brief.researchQuestion],
    ["Metodologia", brief.methodology],
    ["Palavras-chave", brief.keywords],
    ["Referências iniciais", brief.referencesSeed],
    ["Norma de citação", brief.citationStyle],
    ["Idioma", brief.language],
    ["Instruções adicionais", brief.additionalInstructions],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `- ${label}: ${value}`)
    .join("\n");
}

async function generateCompleteWorkContent(
  title: string,
  type: string,
  brief: WorkBriefInput,
  templates: SectionTemplate[]
) {
  const orderedTitles = templates.map((section) => section.title).join(", ");
  const prompt = `Gere um trabalho académico sobre "${title}".

Tipo de trabalho: ${formatProjectType(type)}
Contexto do briefing:
${buildBriefContext(brief)}

Responda exclusivamente com JSON válido, sem markdown.

Use exactamente este formato:
{
  "abstract": "resumo académico",
  "sections": [
    ${templates.map((section) => `{ "title": "${section.title}", "content": "..." }`).join(",\n    ")}
  ]
}

Requisitos obrigatórios:
- Mantenha exactamente estes títulos e esta ordem: ${orderedTitles}
- O resumo deve ter entre 140 e 220 palavras
- Cada secção deve ter entre 220 e 380 palavras
- Use Português académico de Moçambique
- Respeite a norma ${brief.citationStyle || "ABNT"}
- Use os dados do briefing para tornar o conteúdo específico e plausível
- Não deixe nenhuma secção vazia
- Produza JSON estritamente válido`;

  const completion = await createZAIChatCompletion({
    model: "glm-4.7-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    thinking: { type: "disabled" },
    max_tokens: 8000,
  });

  const rawContent = completion.choices[0]?.message?.content || "";

  if (!rawContent) {
    throw new Error("A IA não devolveu conteúdo para o trabalho completo.");
  }

  return parseGeneratedWorkContent(rawContent, templates);
}

function generateCover(title: string, type: string, brief: WorkBriefInput) {
  const kind = formatProjectType(type).toUpperCase();
  const institution = brief.institutionName || "INSTITUIÇÃO DE ENSINO";
  const student = brief.studentName || "Nome do estudante";
  const advisor = brief.advisorName ? `Orientador: ${brief.advisorName}` : null;
  const city = brief.city || "Cidade";
  const year = brief.academicYear || new Date().getFullYear();
  const subtitle = brief.subtitle ? `\n${brief.subtitle}` : "";

  return [
    institution,
    brief.courseName || null,
    brief.subjectName || null,
    "",
    kind,
    "",
    `${title.toUpperCase()}${subtitle ? subtitle.toUpperCase() : ""}`,
    "",
    `Autor: ${student}`,
    advisor,
    "",
    `${city}`,
    `${year}`,
  ]
    .filter((line) => line !== null)
    .join("\n")
    .trim();
}

function serializeBrief(brief: {
  workType: string;
  generationStatus: string;
  institutionName: string | null;
  courseName: string | null;
  subjectName: string | null;
  educationLevel: string | null;
  advisorName: string | null;
  studentName: string | null;
  city: string | null;
  academicYear: number | null;
  dueDate: Date | null;
  theme: string | null;
  subtitle: string | null;
  objective: string | null;
  researchQuestion: string | null;
  methodology: string | null;
  keywords: string | null;
  referencesSeed: string | null;
  citationStyle: string;
  language: string;
  additionalInstructions: string | null;
}) {
  return {
    ...brief,
    dueDate: brief.dueDate?.toISOString() ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = createWorkSchema.parse(await request.json());
    const { title, type, description, generateContent, brief } = body;
    const templates = getSectionTemplates(type);

    let shouldGenerateContent = Boolean(generateContent);
    let fallbackWarning: string | null = null;
    const sectionContents = new Map<string, string>();
    let abstractContent = "";

    if (shouldGenerateContent) {
      try {
        const generatedContent = await generateCompleteWorkContent(title, type, brief, templates);
        for (const section of generatedContent.sections) {
          sectionContents.set(section.title, section.content);
        }
        abstractContent = generatedContent.abstract;
      } catch (error) {
        shouldGenerateContent = false;
        fallbackWarning = `Estrutura do trabalho criada com sucesso. ${getFriendlyZAIErrorMessage(error)}`;
      }
    }

    const baseCost = 20;
    const contentCost = shouldGenerateContent ? templates.length * 15 : 0;
    const totalCost = baseCost + contentCost;

    const userCredits = await db.credit.findUnique({ where: { userId: session.user.id } });

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
          educationLevel: brief.educationLevel,
          userId: session.user.id,
          status: "IN_PROGRESS",
          brief: {
            create: {
              workType: type,
              generationStatus: shouldGenerateContent ? "READY" : "BRIEFING",
              institutionName: brief.institutionName,
              courseName: brief.courseName,
              subjectName: brief.subjectName,
              advisorName: brief.advisorName,
              studentName: brief.studentName,
              city: brief.city,
              academicYear: brief.academicYear,
              dueDate: brief.dueDate ? new Date(brief.dueDate) : undefined,
              theme: brief.theme || title,
              subtitle: brief.subtitle,
              objective: brief.objective,
              researchQuestion: brief.researchQuestion,
              methodology: brief.methodology,
              keywords: brief.keywords,
              referencesSeed: brief.referencesSeed,
              citationStyle: brief.citationStyle,
              language: brief.language,
              additionalInstructions: brief.additionalInstructions,
            },
          },
        },
      });

      const staticSections = [
        { title: "Capa", order: 1, content: generateCover(title, type, brief) },
        { title: "Resumo", order: 2, content: abstractContent },
        { title: "Referências", order: templates.length + 3, content: brief.referencesSeed || "" },
      ];

      for (const section of staticSections) {
        await tx.documentSection.create({
          data: {
            projectId: project.id,
            title: section.title,
            order: section.order,
            content: section.content,
          },
        });
      }

      for (const section of templates) {
        await tx.documentSection.create({
          data: {
            projectId: project.id,
            title: section.title,
            order: section.order,
            content: shouldGenerateContent ? sectionContents.get(section.title) || "" : "",
          },
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
            generationStatus: shouldGenerateContent ? "READY" : "BRIEFING",
          }),
        },
      });

      return project;
    });

    const completeProject = await db.project.findUnique({
      where: { id: result.id },
      include: {
        sections: { orderBy: { order: "asc" } },
        brief: true,
      },
    });

    return NextResponse.json({
      success: true,
      project: completeProject
        ? {
            ...completeProject,
            brief: completeProject.brief ? serializeBrief(completeProject.brief) : null,
          }
        : completeProject,
      creditsUsed: totalCost,
      message: shouldGenerateContent
        ? "Trabalho gerado com sucesso."
        : fallbackWarning || "Briefing guardado e estrutura criada com sucesso.",
      contentGenerated: shouldGenerateContent,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload inválido", details: error.flatten() },
        { status: 400 }
      );
    }

    const isNetworkError =
      error instanceof Error &&
      (error.message.includes("fetch failed") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("connection"));

    const message =
      process.env.NODE_ENV === "production"
        ? isNetworkError
          ? "Servidor de IA não está acessível. Verifique a conectividade de rede."
          : "Erro ao gerar trabalho"
        : error instanceof Error
          ? error.message
          : "Erro ao gerar trabalho";

    console.error("[Work Generation Error]", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isNetworkError,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatProjectType(type: string): string {
  const types: Record<string, string> = {
    MONOGRAPHY: "Monografia",
    DISSERTATION: "Dissertação",
    THESIS: "Tese",
    ARTICLE: "Artigo Científico",
    ESSAY: "Ensaio",
    REPORT: "Relatório",
    SCHOOL_WORK: "Trabalho Escolar",
    RESEARCH_PROJECT: "Trabalho de Pesquisa",
    INTERNSHIP_REPORT: "Relatório de Estágio",
    PRACTICAL_WORK: "Trabalho Prático",
    TCC: "Trabalho de Conclusão de Curso",
  };

  return types[type] || "Trabalho Académico";
}
