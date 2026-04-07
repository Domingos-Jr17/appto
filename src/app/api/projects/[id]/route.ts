import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteStoredObject } from "@/lib/storage";
import { serializeProjectDetail } from "@/lib/projects/project-serialization";
import { updateProjectSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const project = await db.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            content: true,
            order: true,
            wordCount: true,
            parentId: true,
            updatedAt: true,
          },
          orderBy: { order: "asc" },
        },
        brief: true,
      },
    });

    if (!project) {
      return apiError("Projecto não encontrado", 404);
    }

    return apiSuccess(await serializeProjectDetail(project));
  } catch (error) {
    logger.error("Get project error", { error: String(error) });
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const { title, description, status, type, brief } = await parseBody(request, updateProjectSchema);

    const existingProject = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingProject) {
      return apiError("Projecto não encontrado", 404);
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(type && { type }),
        ...((type || brief) && {
          brief: {
            upsert: {
              create: {
                workType: type || existingProject.type,
                generationStatus: "NEEDS_REVIEW",
                institutionName: brief?.institutionName,
                courseName: brief?.courseName,
                subjectName: brief?.subjectName,
                educationLevel: brief?.educationLevel,
                advisorName: brief?.advisorName,
                studentName: brief?.studentName,
                city: brief?.city,
                academicYear: brief?.academicYear,
                dueDate: brief?.dueDate ? new Date(brief.dueDate) : undefined,
                theme: brief?.theme || title || existingProject.title,
                subtitle: brief?.subtitle,
                objective: brief?.objective,
                researchQuestion: brief?.researchQuestion,
                methodology: brief?.methodology,
                keywords: brief?.keywords,
                referencesSeed: brief?.referencesSeed,
                citationStyle: brief?.citationStyle || "ABNT",
                language: brief?.language || "pt-MZ",
                additionalInstructions: brief?.additionalInstructions,
                coverTemplate: brief?.coverTemplate || "UEM_STANDARD",
              },
              update: {
                ...(type ? { workType: type } : {}),
                ...(brief?.institutionName !== undefined ? { institutionName: brief.institutionName } : {}),
                ...(brief?.courseName !== undefined ? { courseName: brief.courseName } : {}),
                ...(brief?.subjectName !== undefined ? { subjectName: brief.subjectName } : {}),
                ...(brief?.educationLevel !== undefined ? { educationLevel: brief.educationLevel } : {}),
                ...(brief?.advisorName !== undefined ? { advisorName: brief.advisorName } : {}),
                ...(brief?.studentName !== undefined ? { studentName: brief.studentName } : {}),
                ...(brief?.city !== undefined ? { city: brief.city } : {}),
                ...(brief?.academicYear !== undefined ? { academicYear: brief.academicYear } : {}),
                ...(brief?.dueDate !== undefined ? { dueDate: brief.dueDate ? new Date(brief.dueDate) : null } : {}),
                ...(brief?.theme !== undefined ? { theme: brief.theme } : {}),
                ...(brief?.subtitle !== undefined ? { subtitle: brief.subtitle } : {}),
                ...(brief?.objective !== undefined ? { objective: brief.objective } : {}),
                ...(brief?.researchQuestion !== undefined ? { researchQuestion: brief.researchQuestion } : {}),
                ...(brief?.methodology !== undefined ? { methodology: brief.methodology } : {}),
                ...(brief?.keywords !== undefined ? { keywords: brief.keywords } : {}),
                ...(brief?.referencesSeed !== undefined ? { referencesSeed: brief.referencesSeed } : {}),
                ...(brief?.citationStyle !== undefined ? { citationStyle: brief.citationStyle } : {}),
                ...(brief?.language !== undefined ? { language: brief.language } : {}),
                ...(brief?.additionalInstructions !== undefined ? { additionalInstructions: brief.additionalInstructions } : {}),
                ...(brief?.coverTemplate !== undefined ? { coverTemplate: brief.coverTemplate } : {}),
                generationStatus: "NEEDS_REVIEW",
              },
            },
          },
        }),
        ...(brief?.educationLevel !== undefined ? { educationLevel: brief.educationLevel } : {}),
      },
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            content: true,
            order: true,
            wordCount: true,
            parentId: true,
            updatedAt: true,
          },
          orderBy: { order: "asc" },
        },
        brief: true,
      },
    });

    return apiSuccess(await serializeProjectDetail(project));
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("Payload inválido", 400, "VALIDATION_ERROR", error.flatten());
    }

    logger.error("Update project error", { error: String(error) });
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const existingProject = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingProject) {
      return apiError("Projecto não encontrado", 404);
    }

    const storedFiles = await db.storedFile.findMany({
      where: { projectId: id },
    });

    await Promise.all(
      storedFiles.map(async (file) => {
        try {
          await deleteStoredObject(file);
        } catch (err) {
          logger.warn("Failed to delete stored file", { fileId: file.id, error: String(err) });
        }
      }),
    );

    await db.project.delete({
      where: { id },
    });

    return apiSuccess({ message: "Projeto eliminado com sucesso" });
  } catch (error) {
    logger.error("Delete project error", { error: String(error) });
    return handleApiError(error);
  }
}
