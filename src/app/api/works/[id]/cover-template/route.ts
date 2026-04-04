import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { coverTemplateSchema } from "@/lib/validators";

const bodySchema = z.object({
  template: coverTemplateSchema,
});

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
    const { template } = await parseBody(request, bodySchema);

    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      include: { brief: true },
    });

    if (!project || !project.brief) {
      return apiError("Trabalho não encontrado", 404);
    }

    await db.projectBrief.update({
      where: { projectId: id },
      data: { coverTemplate: template },
    });

    return apiSuccess({ ok: true, template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Dados inválidos", 400, "VALIDATION_ERROR", error.issues);
    }

    logger.error("Cover template update error", { error: String(error) });
    return handleApiError(error);
  }
}
