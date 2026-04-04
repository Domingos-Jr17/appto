import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { countWordsInMarkdown, normalizeStoredContent } from "@/lib/content";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createDocumentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return apiError("ID do projecto é obrigatório", 400);
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return apiError("Projecto não encontrado", 404);
    }

    const sections = await db.documentSection.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    return apiSuccess(
      sections.map((section) => ({
        ...section,
        content: normalizeStoredContent(section.content),
      })),
    );
  } catch (error) {
    logger.error("Get documents error", { error: String(error) });
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { projectId, parentId, title, content, order } = await parseBody(request, createDocumentSchema);

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return apiError("Projecto não encontrado", 404);
    }

    const normalizedContent = normalizeStoredContent(content);
    const wordCount = countWordsInMarkdown(normalizedContent);

    const section = await db.documentSection.create({
      data: {
        projectId,
        parentId,
        title,
        content: normalizedContent,
        order: order || 0,
        wordCount,
      },
    });

    const totalWords = await db.documentSection.aggregate({
      where: { projectId },
      _sum: { wordCount: true },
    });

    await db.project.update({
      where: { id: projectId },
      data: { wordCount: totalWords._sum.wordCount || 0 },
    });

    return apiSuccess(
      {
        ...section,
        content: normalizeStoredContent(section.content),
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Create document error", { error: String(error) });
    return handleApiError(error);
  }
}
