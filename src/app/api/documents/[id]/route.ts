import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { countWordsInMarkdown, normalizeStoredContent } from "@/lib/content";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { updateDocumentSchema } from "@/lib/validators";

async function getSectionWithOwnership(sectionId: string, userId: string) {
  const section = await db.documentSection.findUnique({
    where: { id: sectionId },
    include: {
      project: true,
      children: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!section || section.project.userId !== userId) {
    return null;
  }

  return section;
}

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
    const section = await getSectionWithOwnership(id, session.user.id);

    if (!section) {
      return apiError("Secção não encontrada", 404);
    }

    return apiSuccess({
      ...section,
      content: normalizeStoredContent(section.content),
      children: section.children.map((child) => ({
        ...child,
        content: normalizeStoredContent(child.content),
      })),
    });
  } catch (error) {
    logger.error("Get document error", { error: String(error) });
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
    const { title, content, order } = await parseBody(request, updateDocumentSchema);

    const existingSection = await db.documentSection.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingSection || existingSection.project.userId !== session.user.id) {
      return apiError("Secção não encontrada", 404);
    }

    const normalizedContent =
      content !== undefined ? normalizeStoredContent(content) : undefined;
    const wordCount = countWordsInMarkdown(normalizedContent ?? existingSection.content);

    const section = await db.documentSection.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content: normalizedContent, wordCount }),
        ...(order !== undefined && { order }),
      },
    });

    const totalWords = await db.documentSection.aggregate({
      where: { projectId: existingSection.projectId },
      _sum: { wordCount: true },
    });

    await db.project.update({
      where: { id: existingSection.projectId },
      data: { wordCount: totalWords._sum.wordCount || 0 },
    });

    return apiSuccess({
      ...section,
      content: normalizeStoredContent(section.content),
    });
  } catch (error) {
    logger.error("Update document error", { error: String(error) });
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

    const existingSection = await db.documentSection.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingSection || existingSection.project.userId !== session.user.id) {
      return apiError("Secção não encontrada", 404);
    }

    await db.documentSection.delete({
      where: { id },
    });

    const totalWords = await db.documentSection.aggregate({
      where: { projectId: existingSection.projectId },
      _sum: { wordCount: true },
    });

    await db.project.update({
      where: { id: existingSection.projectId },
      data: { wordCount: totalWords._sum.wordCount || 0 },
    });

    return apiSuccess({ message: "Secção eliminada com sucesso" });
  } catch (error) {
    logger.error("Delete document error", { error: String(error) });
    return handleApiError(error);
  }
}
