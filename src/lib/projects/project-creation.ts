import type { Prisma, ProjectType } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeWorkDocumentInput } from "@/lib/document-profile";
import { getSectionsForEducationLevel } from "@/lib/project-templates";
import { generateCover, generateTitlePage } from "@/lib/work-generation-jobs";
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

  const normalized = normalizeWorkDocumentInput({
    type: input.type,
    brief: input.brief,
  });

  return {
    workType: normalized.type as ProjectType,
    generationStatus: "BRIEFING" as const,
    institutionName: normalized.brief.institutionName,
    courseName: normalized.brief.courseName,
    subjectName: normalized.brief.subjectName,
    educationLevel: normalized.brief.educationLevel,
    advisorName: normalized.brief.advisorName,
    studentName: normalized.brief.studentName,
    city: normalized.brief.city,
    academicYear: normalized.brief.academicYear,
    dueDate: normalized.brief.dueDate ? new Date(normalized.brief.dueDate) : undefined,
    theme: normalized.brief.theme || input.title,
    subtitle: normalized.brief.subtitle,
    objective: normalized.brief.objective,
    researchQuestion: normalized.brief.researchQuestion,
    methodology: normalized.brief.methodology,
    keywords: normalized.brief.keywords,
    referencesSeed: normalized.brief.referencesSeed,
    citationStyle: normalized.brief.citationStyle,
    language: normalized.brief.language,
    additionalInstructions: normalized.brief.additionalInstructions,
    coverTemplate: normalized.brief.coverTemplate,
    className: normalized.brief.className,
    turma: normalized.brief.turma,
    facultyName: normalized.brief.facultyName,
    departmentName: normalized.brief.departmentName,
    studentNumber: normalized.brief.studentNumber,
    semester: normalized.brief.semester,
  };
}

function buildGenerationScaffold(input: ProjectCreationInput) {
  const normalized = normalizeWorkDocumentInput({
    type: input.type,
    brief: input.brief,
  });
  const brief = normalized.brief;
  const sections = getSectionsForEducationLevel(brief.educationLevel, normalized.type);

  return sections.map((section) => {
    if (section.title === "Capa") {
      return {
        title: section.title,
        order: section.order,
        content: generateCover(input.title, normalized.type, brief),
      };
    }

    if (section.title === "Folha de Rosto") {
      return {
        title: section.title,
        order: section.order,
        content: generateTitlePage(input.title, normalized.type, brief),
      };
    }

    if (section.title === "Referências") {
      return {
        title: section.title,
        order: section.order,
        content: brief.referencesSeed || "",
      };
    }

    return {
      title: section.title,
      order: section.order,
      content: "",
    };
  });
}

export async function createProjectWithStructure(input: ProjectCreationInput) {
  return db.$transaction((tx) => createProjectWithStructureRunner(tx, input), {
    timeout: 30_000,
  });
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
  const normalized = normalizeWorkDocumentInput({
    type: input.type,
    brief: input.brief,
  });

  const project = await tx.project.create({
    data: {
      title: input.title,
      description: input.description,
      type: normalized.type as ProjectType,
      educationLevel: normalized.brief.educationLevel,
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
      : getSectionsForEducationLevel(normalized.brief.educationLevel, normalized.type).map(
          (section) => ({
            title: section.title,
            order: section.order,
            content: "",
          }),
        );

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
