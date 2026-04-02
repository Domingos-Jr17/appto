import { getAIProvider, getFriendlyAIErrorMessage } from "@/lib/ai";
import { generateCoverHTML } from "@/lib/cover-templates";
import { db } from "@/lib/db";
import { subscriptionService } from "@/lib/subscription";
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
Adapte o nível de linguagem ao nível educacional indicado:
- SECONDARY: linguagem simples, frases curtas, vocabulário acessível, sem jargão excessivo
- TECHNICAL: terminologia técnica prática, foco em aplicações
- HIGHER_EDUCATION: linguagem formal, terminologia académica, citações obrigatórias
Nunca invente metadados da capa sem base no briefing.`;

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
  return SYSTEM_PROMPT;
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

const jobStore = globalThis as typeof globalThis & {
  __apptoWorkGenerationJobs?: Map<string, WorkGenerationJobStatus>;
};

const jobs = jobStore.__apptoWorkGenerationJobs ?? new Map<string, WorkGenerationJobStatus>();
jobStore.__apptoWorkGenerationJobs = jobs;

export function getSectionTemplates(type: string) {
  return SECTION_TEMPLATES[type] || SECTION_TEMPLATES.MONOGRAPHY;
}

export function getWorkGenerationStatus(projectId: string): WorkGenerationJobStatus | null {
  const inMemory = jobs.get(projectId);
  if (inMemory) return inMemory;
  
  return null;
}

export async function getWorkGenerationStatusAsync(projectId: string): Promise<WorkGenerationJobStatus | null> {
  const dbJob = await db.generationJob.findUnique({
    where: { projectId },
    select: { status: true, progress: true, step: true, error: true },
  });

  if (dbJob) {
    return {
      projectId,
      status: dbJob.status as "GENERATING" | "READY" | "FAILED",
      progress: dbJob.progress,
      step: dbJob.step || "",
      error: dbJob.error || undefined,
    };
  }

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
  coverTemplate?: string | null;
  className: string | null;
  turma: string | null;
  facultyName: string | null;
  departmentName: string | null;
  studentNumber: string | null;
  semester: string | null;
}) {
  return {
    ...brief,
    dueDate: brief.dueDate?.toISOString() ?? null,
    coverTemplate: brief.coverTemplate ?? undefined,
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
      className: brief.className,
      turma: brief.turma,
      facultyName: brief.facultyName,
      departmentName: brief.departmentName,
      studentNumber: brief.studentNumber,
      semester: brief.semester,
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
    ["Faculdade", brief.facultyName],
    ["Departamento", brief.departmentName],
    ["Curso", brief.courseName],
    ["Disciplina", brief.subjectName],
    ["Nível académico", brief.educationLevel],
    ["Classe", brief.className],
    ["Turma", brief.turma],
    ["Semestre", brief.semester],
    ["Professor/Orientador", brief.advisorName],
    ["Estudante", brief.studentName],
    ["Nº de Estudante", brief.studentNumber],
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
  const isSchool = brief.educationLevel === "SECONDARY" || brief.educationLevel === "TECHNICAL";
  const abstractRequirement = isSchool
    ? "O resumo é opcional; se incluído, deve ter entre 80 e 140 palavras"
    : "O resumo deve ter entre 140 e 220 palavras";
  const sectionWords = isSchool ? "entre 150 e 280" : "entre 220 e 380";
  const citationNote = isSchool
    ? `As citações no texto são opcionais; se usar, siga a norma ${brief.citationStyle || "ABNT"}`
    : `Respeite a norma ${brief.citationStyle || "ABNT"}`;

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
- ${abstractRequirement}
- Cada secção deve ter ${sectionWords} palavras
- Use Português académico de Moçambique${isSchool ? " (simplificado para o ensino secundário)" : ""}
- ${citationNote}
- Use os dados do briefing para tornar o conteúdo específico e plausível
- Não deixe nenhuma secção vazia
- Produza JSON estritamente válido`;

  const provider = await getAIProvider();
  const systemPrompt = getSystemPromptForEducation(brief.educationLevel);
  const completion = await provider.chatCompletion({
    model: "", // Provider uses its default model
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
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

  const updated = { ...current, ...partial };
  jobs.set(projectId, updated);

  persistJob(projectId, partial).catch(console.error);
}

async function persistJob(
  projectId: string,
  partial: Partial<WorkGenerationJobStatus>,
  userId?: string
) {
  const current = await db.generationJob.findUnique({
    where: { projectId },
  });

  if (current) {
    await db.generationJob.update({
      where: { projectId },
      data: partial,
    });
  } else if (userId) {
    await db.generationJob.create({
      data: {
        projectId,
        userId,
        status: partial.status || "GENERATING",
        progress: partial.progress || 0,
        step: partial.step,
        error: partial.error,
      },
    });
  }
}

export async function startWorkGenerationJob(input: {
  projectId: string;
  userId: string;
  title: string;
  type: string;
  brief: WorkBriefInput;
  contentCost: number;
  baseCost: number;
}) {
  const { projectId, userId, title, type, brief, contentCost, baseCost } = input;
  const templates = getSectionTemplates(type);
  const totalRefund = baseCost + contentCost;

  const existingBrief = await db.projectBrief.findUnique({
    where: { projectId },
    select: { generationStatus: true },
  });

  if (existingBrief?.generationStatus === "GENERATING") {
    throw new Error("Geração já está em curso para este trabalho.");
  }

  await db.generationJob.upsert({
    where: { projectId },
    create: {
      projectId,
      userId,
      status: "GENERATING",
      progress: 5,
      step: "A validar o briefing",
    },
    update: {
      status: "GENERATING",
      progress: 5,
      step: "A validar o briefing",
      error: null,
      startedAt: new Date(),
      completedAt: null,
    },
  });

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
      const friendlyMessage = getFriendlyAIErrorMessage(error);

      await db.$transaction(async (tx) => {
        await tx.projectBrief.update({
          where: { projectId },
          data: { generationStatus: "FAILED" },
        });

        if (totalRefund > 0) {
          await tx.credit.update({
            where: { userId },
            data: {
              balance: { increment: totalRefund },
              used: { decrement: totalRefund },
            },
          });

          await tx.creditTransaction.create({
            data: {
              userId,
              amount: totalRefund,
              type: "REFUND",
              description: `Compensação pela falha na geração do trabalho: ${title}`,
              metadata: JSON.stringify({ projectId }),
            },
          });
        }
      });

      await subscriptionService.refundWork(userId).catch((err) => {
        console.error("[Work Generation] Failed to refund subscription work:", err);
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

  const isSchool = brief.educationLevel === "SECONDARY" || brief.educationLevel === "TECHNICAL";
  const wordCount = isSchool ? "entre 180 e 320" : "entre 260 e 420";

  const prompt = `Regere apenas a secção "${sectionTitle}" de um trabalho académico.

Título do trabalho: ${title}
Tipo de trabalho: ${formatProjectType(type)}
Contexto do briefing:
${buildBriefContext(brief)}

Requisitos obrigatórios:
- Escreva em Português académico de Moçambique${isSchool ? " (simplificado para o ensino secundário)" : ""}
- Use a norma ${brief.citationStyle || "ABNT"}
- Produza ${wordCount} palavras
- Mantenha tom formal, coerente e plausível
- Devolva apenas o conteúdo final da secção, sem markdown extra nem explicações`;

  const provider = await getAIProvider();
  const systemPrompt = getSystemPromptForEducation(brief.educationLevel);
  const completion = await provider.chatCompletion({
    model: "", // Provider uses its default model
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
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
