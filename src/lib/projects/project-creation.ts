import type { Prisma, ProjectType } from "@prisma/client";
import { db } from "@/lib/db";
import { getSectionsForEducationLevel } from "@/lib/project-templates";
import { generateCover, generateTitlePage, getSectionTemplates } from "@/lib/work-generation-jobs";
import type { WorkBriefInput } from "@/types/editor";

type ProjectCreationInput = {
  userId: string;
  title: string;
  description?: string;
  type: string;
  brief?: WorkBriefInput;
  structureMode: "template" | "generation";
};

function createBriefData(input: ProjectCreationInput) {
  if (!input.brief) {
    return undefined;
  }

  return {
    workType: input.type as ProjectType,
    generationStatus: "BRIEFING" as const,
    institutionName: input.brief.institutionName,
    courseName: input.brief.courseName,
    subjectName: input.brief.subjectName,
    educationLevel: input.brief.educationLevel,
    advisorName: input.brief.advisorName,
    studentName: input.brief.studentName,
    city: input.brief.city,
    academicYear: input.brief.academicYear,
    dueDate: input.brief.dueDate ? new Date(input.brief.dueDate) : undefined,
    theme: input.brief.theme || input.title,
    subtitle: input.brief.subtitle,
    objective: input.brief.objective,
    researchQuestion: input.brief.researchQuestion,
    methodology: input.brief.methodology,
    keywords: input.brief.keywords,
    referencesSeed: input.brief.referencesSeed,
    citationStyle: input.brief.citationStyle,
    language: input.brief.language,
    additionalInstructions: input.brief.additionalInstructions,
    coverTemplate: input.brief.coverTemplate,
    className: input.brief.className,
    turma: input.brief.turma,
    facultyName: input.brief.facultyName,
    departmentName: input.brief.departmentName,
    studentNumber: input.brief.studentNumber,
    semester: input.brief.semester,
  };
}

function buildGenerationScaffold(input: ProjectCreationInput) {
  const brief = input.brief;
  if (!brief) {
    return getSectionsForEducationLevel(undefined, input.type).map((section) => ({
      title: section.title,
      order: section.order,
      content: "",
    }));
  }

  const templates = getSectionTemplates(input.type, brief.educationLevel);
  const projectSections = getSectionsForEducationLevel(brief.educationLevel, input.type);
  const isHigherEd = brief.educationLevel === "HIGHER_EDUCATION";
  const referenceOrder = Math.max(...templates.map((section) => section.order)) + 1;

  const initialSections = [
    { title: "Capa", order: 1, content: generateCover(input.title, input.type, brief) },
    ...(isHigherEd ? [{ title: "Folha de Rosto", order: 2, content: generateTitlePage(input.title, input.type, brief) }] : []),
    ...projectSections
      .filter((section) => !["Capa", "Folha de Rosto", "Referências", "Anexos", "Apêndices"].includes(section.title))
      .map((section) => ({ title: section.title, order: section.order, content: "" })),
    ...templates.map((section) => ({ title: section.title, order: section.order, content: "" })),
    { title: "Referências", order: referenceOrder, content: brief.referencesSeed || "" },
  ];

  const seen = new Set<string>();
  return initialSections.filter((section) => {
    if (seen.has(section.title)) {
      return false;
    }
    seen.add(section.title);
    return true;
  });
}

export async function createProjectWithStructure(input: ProjectCreationInput) {
  return db.$transaction((tx) => createProjectWithStructureRunner(tx, input), { timeout: 30_000 });
}

export async function createProjectWithStructureTx(
  tx: Prisma.TransactionClient,
  input: ProjectCreationInput,
) {
  return createProjectWithStructureRunner(tx, input);
}

async function createProjectWithStructureRunner(
  tx: Prisma.TransactionClient,
  input: ProjectCreationInput,
) {
    const project = await tx.project.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type as ProjectType,
        educationLevel: input.brief?.educationLevel,
        userId: input.userId,
        status: "IN_PROGRESS",
      ...(input.brief
        ? {
            brief: {
              create: createBriefData(input),
            },
          }
        : {}),
    },
  });

  const sections =
    input.structureMode === "generation"
      ? buildGenerationScaffold(input)
      : getSectionsForEducationLevel(input.brief?.educationLevel, input.type).map((section) => ({
          title: section.title,
          order: section.order,
          content: "",
        }));

  await tx.documentSection.createMany({
    data: sections.map((section) => ({
      projectId: project.id,
      title: section.title,
      order: section.order,
      content: section.content,
    })),
  });

  return project;
}
