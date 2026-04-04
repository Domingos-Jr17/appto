import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { normalizeStoredContent } from "@/lib/content";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

interface ReorderItem {
  id: string;
  parentId: string | null;
  order: number;
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const body = await request.json();
    const projectId = body?.projectId as string | undefined;
    const items = body?.items as ReorderItem[] | undefined;

    if (!projectId || !Array.isArray(items) || items.length === 0) {
      return apiError("Payload inválido", 400);
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
        sections: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!project) {
      return apiError("Projecto não encontrado", 404);
    }

    const allowedIds = new Set(project.sections.map((section) => section.id));
    if (items.some((item) => !allowedIds.has(item.id) || (item.parentId !== null && !allowedIds.has(item.parentId)))) {
      return apiError("Secções inválidas no reorder", 400);
    }

    await db.$transaction(
      items.map((item) =>
        db.documentSection.update({
          where: { id: item.id },
          data: {
            parentId: item.parentId,
            order: item.order,
          },
        }),
      ),
    );

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
    logger.error("Reorder documents error", { error: String(error) });
    return handleApiError(error);
  }
}
