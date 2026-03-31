import { createZAIChatCompletion, getFriendlyZAIErrorMessage } from "@/lib/zai";
import { generateCoverHTML } from "@/lib/cover-templates";
import { db } from "@/lib/db";
import type { CitationStyle, CoverTemplate, WorkBriefInput } from "@/types/editor";

type JobStatus = "GENERATING" | "READY" | "FAILED";

export interface WorkGenerationJobStatus {
  projectId: string;
  status: JobStatus;
  progress: number;
  step: string;
  error?: string;
}

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

const SYSTEM_PROMPT = `Você é um especialista em escrita académica para estudantes moçambicanos.
Gere conteúdo académico de alta qualidade em Português de Moçambique.
Siga a norma de citação pedida no briefing.
Seja formal, estruturado e academicamente plausível.
Nunca invente metadados da capa sem base no briefing.`;

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

const jobStore = globalThis as typeof globalThis & {
  __apptoWorkGenerationJobs?: Map<string, WorkGenerationJobStatus>;
};

const jobs = jobStore.__apptoWorkGenerationJobs ?? new Map<string, WorkGenerationJobStatus>();
jobStore.__apptoWorkGenerationJobs = jobs;

export function getSectionTemplates(type: string) {
  return SECTION_TEMPLATES[type] || SECTION_TEMPLATES.MONOGRAPHY;
}

export function getWorkGenerationStatus(projectId: string) {
  return jobs.get(projectId) || null;
}

export function serializeBrief(brief: {
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
  citationStyle: CitationStyle | string;
  language: string;
  additionalInstructions: string | null;
  coverTemplate?: string;
}) {
  return {
    ...brief,
    dueDate: brief.dueDate?.toISOString() ?? null,
  };
}

export function generateCover(title: string, type: string, brief: WorkBriefInput) {
  const coverTemplate = brief.coverTemplate || "UEM_STANDARD";

  if (coverTemplate) {
    return generateCoverHTML(coverTemplate as CoverTemplate, {
      title,
      type: formatProjectType(type),
      institutionName: brief.institutionName,
      courseName: brief.courseName,
      subjectName: brief.subjectName,
      advisorName: brief.advisorName,
      studentName: brief.studentName,
      city: brief.city,
      academicYear: brief.academicYear,
      subtitle: brief.subtitle,
    });
  }

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

function setJob(projectId: string, partial: Partial<WorkGenerationJobStatus>) {
  const current = jobs.get(projectId) || {
    projectId,
    status: "GENERATING" as JobStatus,
    progress: 0,
    step: "A preparar geração",
  };

  jobs.set(projectId, { ...current, ...partial });
}

export async function startWorkGenerationJob(input: {
  projectId: string;
  userId: string;
  title: string;
  type: string;
  brief: WorkBriefInput;
  contentCost: number;
}) {
  const { projectId, userId, title, type, brief, contentCost } = input;
  const templates = getSectionTemplates(type);

  setJob(projectId, {
    status: "GENERATING",
    progress: 5,
    step: "A validar o briefing",
  });

  void (async () => {
    try {
      await db.projectBrief.update({
        where: { projectId },
        data: { generationStatus: "GENERATING" },
      });

      setJob(projectId, { progress: 25, step: "A gerar capa e estrutura" });

      const generatedContent = await generateCompleteWorkContent(title, type, brief, templates);
      const referenceOrder = Math.max(...templates.map((section) => section.order)) + 1;

      setJob(projectId, { progress: 65, step: "A escrever as secções iniciais" });

      await db.$transaction(async (tx) => {
        await tx.documentSection.updateMany({
          where: { projectId, title: "Capa" },
          data: { content: generateCover(title, type, brief) },
        });

        await tx.documentSection.updateMany({
          where: { projectId, title: "Resumo" },
          data: { content: generatedContent.abstract },
        });

        await tx.documentSection.updateMany({
          where: { projectId, title: "Referências" },
          data: { content: brief.referencesSeed || "", order: referenceOrder },
        });

        for (const section of generatedContent.sections) {
          await tx.documentSection.updateMany({
            where: { projectId, title: section.title },
            data: { content: section.content },
          });
        }

        const updatedSections = await tx.documentSection.findMany({
          where: { projectId },
          select: { wordCount: true, content: true },
        });

        const totalWords = updatedSections.reduce((sum, section) => {
          if (typeof section.wordCount === "number" && section.wordCount > 0) return sum + section.wordCount;
          if (section.content) return sum + section.content.split(/\s+/).filter(Boolean).length;
          return sum;
        }, 0);

        await tx.project.update({
          where: { id: projectId },
          data: { wordCount: totalWords },
        });

        await tx.projectBrief.update({
          where: { projectId },
          data: { generationStatus: "READY" },
        });
      });

      setJob(projectId, {
        status: "READY",
        progress: 100,
        step: "Trabalho pronto para revisão",
      });
    } catch (error) {
      const friendlyMessage = getFriendlyZAIErrorMessage(error);

      await db.$transaction(async (tx) => {
        await tx.projectBrief.update({
          where: { projectId },
          data: { generationStatus: "FAILED" },
        });

        if (contentCost > 0) {
          await tx.credit.update({
            where: { userId },
            data: {
              balance: { increment: contentCost },
              used: { decrement: contentCost },
            },
          });

          await tx.creditTransaction.create({
            data: {
              userId,
              amount: contentCost,
              type: "REFUND",
              description: `Compensação pela falha na geração do trabalho: ${title}`,
              metadata: JSON.stringify({ projectId }),
            },
          });
        }
      });

      setJob(projectId, {
        status: "FAILED",
        progress: 100,
        step: "Falha na geração",
        error: friendlyMessage,
      });
    }
  })();
}

export async function regenerateWorkSection(input: {
  sectionId: string;
  title: string;
  type: string;
  brief: WorkBriefInput;
  sectionTitle: string;
}) {
  const { sectionId, title, type, brief, sectionTitle } = input;

  const prompt = `Regere apenas a secção "${sectionTitle}" de um trabalho académico.

Título do trabalho: ${title}
Tipo de trabalho: ${formatProjectType(type)}
Contexto do briefing:
${buildBriefContext(brief)}

Requisitos obrigatórios:
- Escreva em Português académico de Moçambique
- Use a norma ${brief.citationStyle || "ABNT"}
- Produza entre 260 e 420 palavras
- Mantenha tom formal, coerente e plausível
- Devolva apenas o conteúdo final da secção, sem markdown extra nem explicações`;

  const completion = await createZAIChatCompletion({
    model: "glm-4.7-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    thinking: { type: "disabled" },
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

export function formatProjectType(type: string): string {
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
