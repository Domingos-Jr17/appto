import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { batchGetWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";
import { getLastEditedSection, getResumeMode, getSectionSummary } from "@/lib/workspace";
import { getSectionsForEducationLevel } from "@/lib/project-templates";
import { SubscriptionService, subscriptionService } from "@/lib/subscription";
import { createProjectSchema } from "@/lib/validators";
import type { Prisma, ProjectStatus, ProjectType } from "@prisma/client";

function serializeBrief(
  brief: {
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
    coverTemplate?: string;
  } | null,
) {
  if (!brief) {
    return null;
  }

  return {
    ...brief,
    dueDate: brief.dueDate?.toISOString() ?? null,
  };
}

type ProjectWithRelations = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  wordCount: number;
  updatedAt: Date;
  createdAt: Date;
  sections: {
    id: string;
    title: string;
    parentId: string | null;
    order: number;
    wordCount: number;
    updatedAt: Date;
  }[];
  brief: {
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
  } | null;
};

function parsePositiveIntParam(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function serializeProject(
  project: ProjectWithRelations,
  generationStatusMap: Map<string, { status: string; progress: number; step: string }>,
) {
  const liveGeneration = generationStatusMap.get(project.id);

  return {
    ...project,
    brief: serializeBrief(project.brief),
    generationStatus: liveGeneration?.status || project.brief?.generationStatus || "BRIEFING",
    generationProgress: liveGeneration?.progress || (project.brief?.generationStatus === "READY" ? 100 : 0),
    generationStep: liveGeneration?.step || null,
    resumeMode: getResumeMode(project, getLastEditedSection(project.sections)),
    lastEditedSection: getLastEditedSection(project.sections),
    sectionSummary: getSectionSummary(project.sections),
  };
}

// GET /api/projects - List all user's projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortByInput = searchParams.get("sortBy") || "updatedAt";
    const sortOrderInput = searchParams.get("sortOrder") || "desc";
    const page = parsePositiveIntParam(searchParams.get("page"), 1, 10_000);
    const limit = parsePositiveIntParam(searchParams.get("limit"), 25, 100);
    const skip = (page - 1) * limit;

    const sortField = (
      field: string,
    ): "createdAt" | "updatedAt" | "title" => {
      if (field === "createdAt") return "createdAt";
      if (field === "updatedAt") return "updatedAt";
      if (field === "title") return "title";
      return "updatedAt";
    };
    const sortOrder = sortOrderInput === "asc" ? "asc" as const : "desc" as const;

    const where: Prisma.ProjectWhereInput = {
      userId: session.user.id,
    };

    const validStatuses: ProjectStatus[] = ["DRAFT", "IN_PROGRESS", "REVIEW", "COMPLETED", "ARCHIVED"];
    const validTypes: ProjectType[] = ["SECONDARY_WORK", "TECHNICAL_WORK", "HIGHER_EDUCATION_WORK"];

    if (status && validStatuses.includes(status as ProjectStatus)) {
      where.status = status as ProjectStatus;
    }

    if (type && validTypes.includes(type as ProjectType)) {
      where.type = type as ProjectType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [projects, totalCount] = await Promise.all([
      db.project.findMany({
      where,
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            parentId: true,
            order: true,
            wordCount: true,
            updatedAt: true,
          },
          orderBy: { order: "asc" },
        },
        brief: true,
        _count: {
          select: { sections: true },
        },
      },
      orderBy: {
        [sortField(sortByInput)]: sortOrder,
      },
      skip,
      take: limit,
    }),
      db.project.count({ where }),
    ]);

    // Batch fetch generation status to avoid N+1
    const projectIds = projects.map((p) => p.id);
    const statusMap = await batchGetWorkGenerationStatusAsync(projectIds);
    const generationMap = new Map(
      Array.from(statusMap.entries()).map(([id, s]) => [id, { status: s.status, progress: s.progress, step: s.step }]),
    );

    return apiSuccess(projects.map((p) => serializeProject(p, generationMap)), {
      headers: {
        "x-total-count": String(totalCount),
        "x-page": String(page),
        "x-limit": String(limit),
      },
    });
  } catch (error) {
    logger.error("Get projects error", { error: String(error) });
    return handleApiError(error);
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const body = await parseBody(request, createProjectSchema);
    const { title, description, type, brief } = body;

    // Check user subscription
    const { allowed, reason } = await subscriptionService.canGenerateWork(session.user.id);

    if (!allowed) {
      return apiError(reason || "Limite de trabalhos atingido", 403, "LIMIT_REACHED", { remaining: 0 });
    }

    // Create project with default sections
    const project = await db.$transaction(async (tx) => {
      // Consume work from subscription within the same transaction
      await new SubscriptionService(tx).consumeWork(session.user.id);

      // Create project
      const newProject = await tx.project.create({
        data: {
          title,
          description,
          type,
          educationLevel: brief?.educationLevel,
          userId: session.user.id,
          ...(brief
            ? {
                brief: {
                  create: {
                    workType: type,
                    generationStatus: "BRIEFING",
                    institutionName: brief.institutionName,
                    courseName: brief.courseName,
                    subjectName: brief.subjectName,
                    educationLevel: brief.educationLevel,
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
                    citationStyle: brief.citationStyle || "ABNT",
                    language: brief.language || "pt-MZ",
                    additionalInstructions: brief.additionalInstructions,
                    className: brief.className,
                    turma: brief.turma,
                    facultyName: brief.facultyName,
                    departmentName: brief.departmentName,
                    studentNumber: brief.studentNumber,
                    semester: brief.semester,
                  },
                },
              }
            : {}),
        },
      });

      // Create default document structure from template
      const sections = getSectionsForEducationLevel(brief?.educationLevel, type);
      await tx.documentSection.createMany({
        data: sections.map((section) => ({
          projectId: newProject.id,
          title: section.title,
          order: section.order,
        })),
      });

      return newProject;
    });

    // Fetch the complete project with sections
    const completeProject = await db.project.findUnique({
      where: { id: project.id },
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            parentId: true,
            order: true,
            wordCount: true,
            updatedAt: true,
          },
          orderBy: { order: "asc" },
        },
        brief: true,
      },
    });

    const generationMap = await batchGetWorkGenerationStatusAsync([project.id]);
    const serializedProject = completeProject
      ? serializeProject(completeProject, new Map(
          Array.from(generationMap.entries()).map(([id, s]) => [id, { status: s.status, progress: s.progress, step: s.step }]),
        ))
      : null;

    return apiSuccess(serializedProject, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("Payload inválido", 400, "VALIDATION_ERROR", error.flatten());
    }

    logger.error("Create project error", { error: String(error) });
    return handleApiError(error);
  }
}
