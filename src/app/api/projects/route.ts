import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { batchGetWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";
import { createProjectWithStructure } from "@/lib/projects/project-creation";
import { buildGenerationMap, serializeProjectDetail, serializeProjectListItem } from "@/lib/projects/project-serialization";
import { createProjectSchema } from "@/lib/validators";
import type { Prisma, ProjectStatus, ProjectType } from "@prisma/client";

function parsePositiveIntParam(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
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
            content: true,
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
    const generationMap = buildGenerationMap(new Map(
      Array.from(statusMap.entries()).map(([id, s]) => [id, { status: s.status, progress: s.progress, step: s.step }]),
    ));

    return apiSuccess(projects.map((p) => serializeProjectListItem(p, generationMap)), {
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

    const project = await createProjectWithStructure({
      userId: session.user.id,
      title,
      description,
      type,
      brief,
      structureMode: "template",
    });

    // Fetch the complete project with sections
    const completeProject = await db.project.findUnique({
      where: { id: project.id },
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            content: true,
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

    const serializedProject = completeProject
      ? await serializeProjectDetail(completeProject)
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
