import { getFriendlyAIErrorMessage, runAIChatCompletion } from "@/lib/ai";
import { enrichReferencesWithAcademicSources } from "@/lib/academic-search";
import { generateCoverHTML } from "@/lib/cover-templates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";
import { subscriptionService } from "@/lib/subscription";
import {
  buildBriefContext,
  buildSectionGenerationPrompt,
  buildWorkGenerationPrompt,
  buildWorkRegenerationRepairPrompt,
  detectCrossSectionRepetition,
  getWorkGenerationProfile,
  parseGeneratedWorkContent,
  type SectionTemplate,
  validateGeneratedSection,
} from "@/lib/work-generation-prompts";
import type { CitationStyle, CoverTemplate, WorkBriefInput } from "@/types/editor";

type JobStatus = "GENERATING" | "READY" | "FAILED";

export interface WorkGenerationJobStatus {
  projectId: string;
  status: JobStatus;
  progress: number;
  step: string;
  error?: string;
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
  SECONDARY_WORK: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Desenvolvimento", order: 4 },
    { title: "3. Conclusão", order: 5 },
  ],
  TECHNICAL_WORK: [
    { title: "1. Introdução", order: 3 },
    { title: "2. Fundamentação Teórica", order: 4 },
    { title: "3. Metodologia", order: 5 },
    { title: "4. Análise Prática", order: 6 },
    { title: "5. Conclusão", order: 7 },
    { title: "6. Recomendações", order: 8 },
  ],
  HIGHER_EDUCATION_WORK: [
    { title: "1. Introdução", order: 6 },
    { title: "2. Revisão da Literatura", order: 7 },
    { title: "3. Metodologia", order: 8 },
    { title: "4. Análise e Discussão", order: 9 },
    { title: "5. Conclusão", order: 10 },
    { title: "6. Recomendações", order: 11 },
  ],
};

const jobStore = globalThis as typeof globalThis & {
  __apptoWorkGenerationJobs?: Map<string, WorkGenerationJobStatus>;
};

const jobs = jobStore.__apptoWorkGenerationJobs ?? new Map<string, WorkGenerationJobStatus>();
jobStore.__apptoWorkGenerationJobs = jobs;
const JOB_RECLAIM_AFTER_MS = 10 * 60_000;

export function getSectionTemplates(type: string, educationLevel?: string | null) {
  return SECTION_TEMPLATES[type] || SECTION_TEMPLATES.HIGHER_EDUCATION_WORK;
}

export function getWorkGenerationStatus(projectId: string): WorkGenerationJobStatus | null {
  const inMemory = jobs.get(projectId);
  if (inMemory) return inMemory;
  
  // Fall through to DB lookup is handled by getWorkGenerationStatusAsync
  // This function returns only in-memory for sync contexts; use async for DB fallback
  return null;
}

export async function getWorkGenerationStatusAsync(projectId: string): Promise<WorkGenerationJobStatus | null> {
  // First check in-memory
  const inMemory = jobs.get(projectId);
  if (inMemory) return inMemory;
  
  // Then check database
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

export async function batchGetWorkGenerationStatusAsync(
  projectIds: string[],
): Promise<Map<string, WorkGenerationJobStatus>> {
  const result = new Map<string, WorkGenerationJobStatus>();

  for (const projectId of projectIds) {
    const inMemory = jobs.get(projectId);
    if (inMemory) {
      result.set(projectId, inMemory);
    }
  }

  const missingIds = projectIds.filter((id) => !result.has(id));
  if (missingIds.length > 0) {
    const dbJobs = await db.generationJob.findMany({
      where: { projectId: { in: missingIds } },
      select: { projectId: true, status: true, progress: true, step: true, error: true },
    });

    for (const job of dbJobs) {
      result.set(job.projectId, {
        projectId: job.projectId,
        status: job.status as "GENERATING" | "READY" | "FAILED",
        progress: job.progress,
        step: job.step || "",
        error: job.error || undefined,
      });
    }
  }

  return result;
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

export function generateTitlePage(title: string, type: string, brief: WorkBriefInput) {
  const kind = formatProjectType(type);
  const institution = brief.institutionName || "INSTITUIÇÃO DE ENSINO";
  const faculty = brief.facultyName || "";
  const course = brief.courseName || "";
  const student = brief.studentName || "Nome do estudante";
  const studentNumber = brief.studentNumber ? `Nº ${brief.studentNumber}` : "";
  const advisor = brief.advisorName ? `Orientador: ${brief.advisorName}` : "";
  const city = brief.city || "Cidade";
  const year = brief.academicYear || new Date().getFullYear();
  const subtitle = brief.subtitle || "";

  return [
    `<div style="text-align: center; font-family: 'Times New Roman', serif; padding: 40mm 30mm; min-height: 297mm; display: flex; flex-direction: column; justify-content: space-between;">`,
    `<div>`,
    `<p style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 8px 0;">${institution}</p>`,
    faculty ? `<p style="font-size: 12pt; margin: 8px 0;">${faculty}</p>` : "",
    course ? `<p style="font-size: 12pt; margin: 8px 0;">${course}</p>` : "",
    `</div>`,
    `<div style="margin: 40px 0;">`,
    `<p style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 8px 0;">${title}</p>`,
    subtitle ? `<p style="font-size: 12pt; font-style: italic; margin: 8px 0;">${subtitle}</p>` : "",
    `<p style="font-size: 12pt; margin: 16px 0;">${kind}</p>`,
    `</div>`,
    `<div>`,
    `<p style="font-size: 12pt; margin: 8px 0;">${student} ${studentNumber}</p>`,
    advisor ? `<p style="font-size: 12pt; margin: 8px 0;">${advisor}</p>` : "",
    `</div>`,
    `<p style="font-size: 12pt; margin-top: 32px;">${city} — ${year}</p>`,
    `</div>`,
  ]
    .filter((line) => line !== "")
    .join("\n")
    .trim();
}

async function generateCompleteWorkContent(
  title: string,
  type: string,
  brief: WorkBriefInput,
  templates: SectionTemplate[]
) {
  // Enrich references with real academic sources from Semantic Scholar
  let enrichedBrief = brief;
  if (!brief.referencesSeed || brief.referencesSeed.trim().length < 20) {
    const enriched = await enrichReferencesWithAcademicSources(title, brief.referencesSeed || "", 6);
    if (enriched && enriched !== brief.referencesSeed) {
      enrichedBrief = { ...brief, referencesSeed: enriched };
    }
  }

  const profile = getWorkGenerationProfile(type, enrichedBrief, templates);
  const prompt = buildWorkGenerationPrompt({
    title,
    typeLabel: formatProjectType(type),
    brief: enrichedBrief,
    templates,
    profile,
  });
  const resolvedEducationLevel = brief.educationLevel || "HIGHER_EDUCATION";
  const systemPrompt = getSystemPromptForEducation(resolvedEducationLevel);

  let assistantReply = "";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await runAIChatCompletion({
      model: "", // Provider uses its default model
      messages:
        attempt === 0
          ? [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ]
          : [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
              { role: "assistant", content: assistantReply },
              {
                role: "user",
                content: buildWorkRegenerationRepairPrompt({
                  issues: [lastError?.message || "A resposta anterior ficou abaixo do esperado."],
                  profile,
                }),
              },
            ],
      temperature: 0,
      max_tokens: 16000,
    });

    assistantReply = completion.choices[0]?.message?.content || "";

    if (!assistantReply) {
      lastError = new Error("A IA não devolveu conteúdo para o trabalho completo.");
      continue;
    }

    try {
      return parseGeneratedWorkContent(assistantReply, templates, profile, title);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("A IA não devolveu conteúdo para o trabalho completo.");
}

async function saveSectionToDb(
  projectId: string,
  title: string,
  content: string,
) {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const result = await db.documentSection.updateMany({
    where: { projectId, title },
    data: { content, wordCount },
  });

  if (result.count === 0) {
    logger.warn("[work-generation] section not found, creating fallback", { projectId, title });

    const maxOrder = await db.documentSection.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    await db.documentSection.create({
      data: {
        projectId,
        title,
        content,
        wordCount,
        order: (maxOrder?.order ?? 0) + 1,
      },
    });
  }
}

async function loadGeneratedSections(
  projectId: string,
  templates: SectionTemplate[],
) {
  const sections = await db.documentSection.findMany({
    where: { projectId, title: { in: templates.map((t) => t.title) } },
    select: { title: true, content: true },
  });
  return sections
    .filter((s) => s.content && s.content.trim().length > 0)
    .map((s) => ({ title: s.title, content: s.content! }));
}

async function generateWorkSectionBySection(
  projectId: string,
  title: string,
  type: string,
  brief: WorkBriefInput,
  templates: SectionTemplate[],
  userId: string,
  onProgress: (progress: number, step: string) => Promise<void>,
) {
  // Enrich references with real academic sources from Semantic Scholar
  let enrichedBrief = brief;
  if (!brief.referencesSeed || brief.referencesSeed.trim().length < 20) {
    const enriched = await enrichReferencesWithAcademicSources(title, brief.referencesSeed || "", 6);
    if (enriched && enriched !== brief.referencesSeed) {
      enrichedBrief = { ...brief, referencesSeed: enriched };
    }
  }

  const profile = getWorkGenerationProfile(type, enrichedBrief, templates);
  const resolvedEducationLevel = enrichedBrief.educationLevel || "HIGHER_EDUCATION";
  const systemPrompt = getSystemPromptForEducation(resolvedEducationLevel);
  const typeLabel = formatProjectType(type);
  const isHigherEd = enrichedBrief.educationLevel === "HIGHER_EDUCATION";

  const totalSteps = templates.length + (profile.abstract.required ? 1 : 0) + 1 + (isHigherEd ? 1 : 0); // +1 for cover, +1 for title page if higher ed
  let completedSteps = 0;

  const progressForStep = () => {
    completedSteps += 1;
    return Math.round((completedSteps / totalSteps) * 90) + 10; // 10-100 range
  };

  // Step 1: Generate cover
  await onProgress(progressForStep(), "A gerar capa");
  await saveSectionToDb(projectId, "Capa", generateCover(title, type, brief));

  // Step 1.5: Generate title page for higher education
  if (isHigherEd) {
    await onProgress(progressForStep(), "A gerar folha de rosto");
    await saveSectionToDb(projectId, "Folha de Rosto", generateTitlePage(title, type, brief));
  }

  // Step 2: Generate abstract if required
  if (profile.abstract.required && profile.abstract.range) {
    await onProgress(progressForStep(), "A gerar resumo");
    const abstractPrompt = buildSectionGenerationPrompt({
      title,
      typeLabel,
      brief,
      sectionTitle: "Resumo",
      sectionGuidance: profile.abstract.guidance,
      sectionRange: profile.abstract.range,
      previousSections: [],
      styleRules: profile.styleRules,
      citationGuidance: profile.citationGuidance,
      factualGuidance: profile.factualGuidance,
    });

    let abstractContent = "";
    let abstractError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const completion = await runAIChatCompletion({
          model: "",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: abstractPrompt },
          ],
          temperature: 0,
          max_tokens: Math.ceil((profile.abstract.range.max || 260) * 1.5),
        });

        abstractContent = completion.choices[0]?.message?.content?.trim() || "";
        if (!abstractContent) {
          abstractError = new Error("A IA não devolveu conteúdo para o resumo.");
          continue;
        }

        const issues = validateGeneratedSection(abstractContent, "Resumo", profile.abstract.range, title);
        if (issues.length > 0) {
          abstractError = new Error(issues.map((i) => i.message).join(" "));
          continue;
        }

        abstractError = null;
        break;
      } catch (error) {
        abstractError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (abstractContent && !abstractError) {
      await saveSectionToDb(projectId, "Resumo", abstractContent);
    } else if (abstractError) {
      logger.warn("[work-generation] abstract generation failed", { projectId, error: abstractError.message });
    }
  }

  // Step 3: Generate each content section sequentially
  const sectionsFailed: string[] = [];

  for (const template of templates) {
    const sectionPlan = profile.sections.find((s) => s.title === template.title);
    if (!sectionPlan) continue;

    await onProgress(progressForStep(), `A gerar ${template.title}`);

    const previousSections = await loadGeneratedSections(projectId, templates);

    const sectionPrompt = buildSectionGenerationPrompt({
      title,
      typeLabel,
      brief,
      sectionTitle: template.title,
      sectionGuidance: sectionPlan.guidance,
      sectionRange: sectionPlan.range,
      previousSections,
      styleRules: profile.styleRules,
      citationGuidance: profile.citationGuidance,
      factualGuidance: profile.factualGuidance,
    });

    let sectionContent = "";
    let sectionError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const maxTokens = Math.ceil((sectionPlan.range.max || 800) * 1.8);
        const completion = await runAIChatCompletion({
          model: "",
          messages:
            attempt === 0
              ? [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: sectionPrompt },
                ]
              : [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: sectionPrompt },
                  {
                    role: "user",
                    content: `A resposta anterior para a secção "${template.title}" não cumpriu os requisitos: ${sectionError?.message || "Conteúdo insuficiente"}. Regere a secção respeitando todos os requisitos.`,
                  },
                ],
          temperature: 0,
          max_tokens: maxTokens,
        });

        sectionContent = completion.choices[0]?.message?.content?.trim() || "";
        if (!sectionContent) {
          sectionError = new Error(`A IA não devolveu conteúdo para "${template.title}".`);
          continue;
        }

        const issues = validateGeneratedSection(sectionContent, template.title, sectionPlan.range, title);
        if (issues.length > 0) {
          sectionError = new Error(issues.map((i) => i.message).join(" "));
          continue;
        }

        sectionError = null;
        break;
      } catch (error) {
        sectionError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (sectionContent && !sectionError) {
      await saveSectionToDb(projectId, template.title, sectionContent);
    } else {
      sectionsFailed.push(template.title);
      logger.warn("[work-generation] section generation failed", {
        projectId,
        section: template.title,
        error: sectionError?.message,
      });
    }
  }

  // Step 4: Cross-section repetition check and repair
  await onProgress(95, "A validar conteúdo");
  const allSections = await loadGeneratedSections(projectId, templates);
  const repetitionIssues = detectCrossSectionRepetition(allSections);

  for (const issue of repetitionIssues) {
    const failedSection = templates.find((t) => t.title === issue.sectionB);
    if (!failedSection) continue;

    const sectionPlan = profile.sections.find((s) => s.title === failedSection.title);
    if (!sectionPlan) continue;

    logger.info("[work-generation] repairing cross-section repetition", {
      projectId,
      sectionA: issue.sectionA,
      sectionB: issue.sectionB,
    });

    const repeatedSectionContent = allSections.find((s) => s.title === issue.sectionB)?.content || "";
    const originalSectionContent = allSections.find((s) => s.title === issue.sectionA)?.content || "";

    const repairPrompt = `A secção "${issue.sectionB}" tem repetição significativa de conteúdo da secção "${issue.sectionA}".
Regere APENAS a secção "${issue.sectionB}" com conteúdo NOVO e DIFERENTE.

Conteúdo da secção "${issue.sectionA}" (NÃO repita isto):
${originalSectionContent}

Conteúdo actual da secção "${issue.sectionB}" (que precisa ser refeito):
${repeatedSectionContent}

Instrução: Gere a secção "${issue.sectionB}" com conteúdo completamente diferente, sem repetir ideias ou frases da secção "${issue.sectionA}".
Respeite o range de ${sectionPlan.range.min}-${sectionPlan.range.max} palavras.
Devolva apenas o texto da secção.`;

    try {
      const completion = await runAIChatCompletion({
        model: "",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: repairPrompt },
        ],
        temperature: 0.3,
        max_tokens: Math.ceil(sectionPlan.range.max * 1.8),
      });

      const repairedContent = completion.choices[0]?.message?.content?.trim() || "";
      if (repairedContent) {
        const issues = validateGeneratedSection(repairedContent, failedSection.title, sectionPlan.range, title);
        if (issues.length === 0) {
          await saveSectionToDb(projectId, failedSection.title, repairedContent);
        }
      }
    } catch (error) {
      logger.warn("[work-generation] cross-section repair failed", {
        projectId,
        section: issue.sectionB,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Step 5: Save references section with enriched academic sources
  const referenceOrder = Math.max(...templates.map((section) => section.order)) + 1;
  await saveSectionToDb(
    projectId,
    "Referências",
    enrichedBrief.referencesSeed || "Adicione referências verificadas manualmente antes da submissão.",
  );
  await db.documentSection.updateMany({
    where: { projectId, title: "Referências" },
    data: { order: referenceOrder },
  });

  return { sectionsFailed };
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
  const { projectId, userId } = input;

  // Check for existing active generation job - this is the single source of truth
  const existingJob = await db.generationJob.findUnique({
    where: { projectId },
    select: { id: true, status: true },
  });

  if (existingJob && existingJob.status === "GENERATING") {
    throw new Error("Geração já está em curso para este trabalho.");
  }

  // Create/update the job record first - this is the single source of truth for generation status
  await db.generationJob.upsert({
    where: { projectId },
    create: {
      projectId,
      userId,
      status: "GENERATING",
      progress: 5,
      step: "Na fila do worker",
    },
    update: {
      status: "GENERATING",
      progress: 5,
      step: "Na fila do worker",
      error: null,
      startedAt: new Date(),
      completedAt: null,
    },
  });

  setJob(projectId, {
    status: "GENERATING",
    progress: 5,
    step: "Na fila do worker",
  });

  await trackProductEvent({
    name: "work_generation_queued",
    category: "workspace",
    userId,
    projectId,
  }).catch(() => null);

  triggerQueuedGenerationProcessing();
}

function buildWorkBriefInputFromRecord(brief: {
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
  coverTemplate: string | null;
  className: string | null;
  turma: string | null;
  facultyName: string | null;
  departmentName: string | null;
  studentNumber: string | null;
  semester: string | null;
}): WorkBriefInput {
  return {
    institutionName: brief.institutionName ?? undefined,
    courseName: brief.courseName ?? undefined,
    subjectName: brief.subjectName ?? undefined,
    educationLevel: (brief.educationLevel as WorkBriefInput["educationLevel"]) ?? undefined,
    advisorName: brief.advisorName ?? undefined,
    studentName: brief.studentName ?? undefined,
    city: brief.city ?? undefined,
    academicYear: brief.academicYear ?? undefined,
    dueDate: brief.dueDate?.toISOString().slice(0, 10),
    theme: brief.theme ?? undefined,
    subtitle: brief.subtitle ?? undefined,
    objective: brief.objective ?? undefined,
    researchQuestion: brief.researchQuestion ?? undefined,
    methodology: brief.methodology ?? undefined,
    keywords: brief.keywords ?? undefined,
    referencesSeed: brief.referencesSeed ?? undefined,
    citationStyle: (brief.citationStyle as WorkBriefInput["citationStyle"]) ?? "ABNT",
    language: brief.language,
    additionalInstructions: brief.additionalInstructions ?? undefined,
    coverTemplate: (brief.coverTemplate as WorkBriefInput["coverTemplate"]) ?? undefined,
    className: brief.className ?? undefined,
    turma: brief.turma ?? undefined,
    facultyName: brief.facultyName ?? undefined,
    departmentName: brief.departmentName ?? undefined,
    studentNumber: brief.studentNumber ?? undefined,
    semester: brief.semester ?? undefined,
  };
}

async function processGenerationJob(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { brief: true },
  });

  if (!project?.brief) {
    throw new Error("Projecto ou briefing não encontrado para processamento.");
  }

  const brief = buildWorkBriefInputFromRecord(project.brief);
  const templates = getSectionTemplates(project.type, project.brief.educationLevel);

  try {
    await db.projectBrief.update({
      where: { projectId },
      data: { generationStatus: "GENERATING" },
    });

    await setJobAsync(projectId, { progress: 5, step: "A iniciar geração", startedAt: new Date() });

    const { sectionsFailed } = await generateWorkSectionBySection(
      projectId,
      project.title,
      project.type,
      brief,
      templates,
      project.userId,
      async (progress, step) => {
        setJob(projectId, { progress, step });
        await setJobAsync(projectId, { progress, step });
      },
    );

    // Calculate total word count
    const updatedSections = await db.documentSection.findMany({
      where: { projectId },
      select: { wordCount: true, content: true },
    });

    const totalWords = updatedSections.reduce((sum, section) => {
      if (typeof section.wordCount === "number" && section.wordCount > 0) return sum + section.wordCount;
      if (section.content) return sum + section.content.split(/\s+/).filter(Boolean).length;
      return sum;
    }, 0);

    await db.project.update({
      where: { id: projectId },
      data: { wordCount: totalWords },
    });

    if (sectionsFailed.length > 0) {
      await db.projectBrief.update({
        where: { projectId },
        data: { generationStatus: "READY" },
      });

      await setJobAsync(projectId, {
        status: "READY",
        progress: 100,
        step: `Trabalho pronto — ${sectionsFailed.length} secção(ões) com qualidade abaixo do esperado. Pode re-gerar individualmente.`,
        completedAt: new Date(),
      });
      setJob(projectId, {
        status: "READY",
        progress: 100,
        step: `Trabalho pronto — ${sectionsFailed.length} secção(ões) com qualidade abaixo do esperado. Pode re-gerar individualmente.`,
      });
    } else {
      await db.projectBrief.update({
        where: { projectId },
        data: { generationStatus: "READY" },
      });

      await setJobAsync(projectId, {
        status: "READY",
        progress: 100,
        step: "Trabalho pronto para revisão",
        completedAt: new Date(),
      });
      setJob(projectId, {
        status: "READY",
        progress: 100,
        step: "Trabalho pronto para revisão",
      });
    }

    await trackProductEvent({
      name: "work_generation_completed",
      category: "workspace",
      userId: project.userId,
      projectId,
      metadata: { type: project.type, sectionsFailed: sectionsFailed.length },
    }).catch(() => null);
  } catch (error) {
    const friendlyMessage = getFriendlyAIErrorMessage(error);

    await db.projectBrief.update({
      where: { projectId },
      data: { generationStatus: "FAILED" },
    });

    await subscriptionService.refundWork(project.userId).catch((err) => {
      console.error("[Work Generation] Failed to refund subscription work:", err);
    });

    await setJobAsync(projectId, {
      status: "FAILED",
      progress: 100,
      step: "Falha na geração",
      error: friendlyMessage,
      completedAt: new Date(),
    });
    setJob(projectId, {
      status: "FAILED",
      progress: 100,
      step: "Falha na geração",
      error: friendlyMessage,
    });

    await trackProductEvent({
      name: "work_generation_failed",
      category: "workspace",
      userId: project.userId,
      projectId,
      metadata: { error: friendlyMessage },
    }).catch(() => null);
  }
}

async function setJobAsync(projectId: string, partial: {
  status?: string;
  progress?: number;
  step?: string;
  error?: string | null;
  completedAt?: Date | null;
  startedAt?: Date;
}) {
  await db.generationJob.update({
    where: { projectId },
    data: partial,
  }).catch(() => null);
}

async function claimGenerationJob(projectId: string, startedAt: Date) {
  const result = await db.generationJob.updateMany({
    where: {
      projectId,
      status: "GENERATING",
      startedAt,
      completedAt: null,
    },
    data: {
      step: "A processar em worker persistente",
      startedAt: new Date(),
      error: null,
    },
  });

  return result.count === 1;
}

export async function processQueuedGenerationJobs(limit = 2) {
  const staleCutoff = new Date(Date.now() - JOB_RECLAIM_AFTER_MS);
  const candidates = await db.generationJob.findMany({
    where: {
      status: "GENERATING",
      completedAt: null,
      OR: [
        { step: "Na fila do worker" },
        { startedAt: { lt: staleCutoff } },
      ],
    },
    orderBy: { startedAt: "asc" },
    take: limit,
    select: { projectId: true, startedAt: true },
  });

  let processed = 0;
  for (const candidate of candidates) {
    const claimed = await claimGenerationJob(candidate.projectId, candidate.startedAt);
    if (!claimed) {
      continue;
    }

    processed += 1;
    logger.info("[worker] processing generation job", { projectId: candidate.projectId });
    await processGenerationJob(candidate.projectId);
  }

  return { processed };
}

export function triggerQueuedGenerationProcessing() {
  if (env.INTERNAL_WORKER_SECRET) {
    void fetch(`${env.APP_URL.replace(/\/$/, "")}/api/internal/workers/run`, {
      method: "POST",
      headers: {
        "x-worker-secret": env.INTERNAL_WORKER_SECRET,
      },
    }).catch((error) => {
      logger.warn("[worker] remote generation trigger failed; falling back to local execution", {
        error: error instanceof Error ? error.message : String(error),
      });
      queueMicrotask(() => {
        void processQueuedGenerationJobs(1).catch(() => null);
      });
    });
    return;
  }

  queueMicrotask(() => {
    void processQueuedGenerationJobs(1).catch((error) => {
      logger.warn("[worker] local generation trigger failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

export async function regenerateWorkSection(input: {
  sectionId: string;
  title: string;
  type: string;
  brief: WorkBriefInput;
  sectionTitle: string;
}) {
  const { sectionId, title, type, brief, sectionTitle } = input;

  const wordCount = "entre 260 e 420";

  const prompt = `Regere apenas a secção "${sectionTitle}" de um trabalho académico.

Título do trabalho: ${title}
Tipo de trabalho: ${formatProjectType(type)}
Contexto do briefing:
${buildBriefContext(brief)}

Requisitos obrigatórios:
- Escreva em Português académico de Moçambique
- Use a norma ${brief.citationStyle || "ABNT"}
- Produza ${wordCount} palavras
- Mantenha tom formal, coerente e plausível
- Não invente dados factuais, leis, autores ou referências bibliográficas sem base no briefing
- Devolva apenas o conteúdo final da secção, sem markdown extra nem explicações`;

  const systemPrompt = getSystemPromptForEducation("HIGHER_EDUCATION");
  const completion = await runAIChatCompletion({
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
    SECONDARY_WORK: "Trabalho Escolar",
    TECHNICAL_WORK: "Trabalho Técnico",
    HIGHER_EDUCATION_WORK: "Trabalho Académico",
  };
  return types[type] || "Trabalho Académico";
}
