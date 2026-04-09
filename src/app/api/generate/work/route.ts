import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withDistributedLock } from "@/lib/distributed-lock";
import { trackProductEvent } from "@/lib/product-events";
import { normalizeWorkBriefForGeneration } from "@/lib/projects/project-brief";
import { createProjectWithStructureTx } from "@/lib/projects/project-creation";
import { serializeProjectDetail } from "@/lib/projects/project-serialization";
import { SubscriptionService, subscriptionService } from "@/lib/subscription";
import { createWorkSchema } from "@/lib/validators";
import {
  formatProjectType,
  startWorkGenerationJob,
} from "@/lib/work-generation-jobs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const body = createWorkSchema.parse(await request.json());
    const { title, type, description, generateContent } = body;
    const brief = normalizeWorkBriefForGeneration({ ...body.brief }, description);

    if (generateContent) {
      const { allowed, reason } = await subscriptionService.canGenerateWork(session.user.id);
      if (!allowed) {
        return apiError(reason || "Limite de geração atingido", 403, "LIMIT_REACHED", { remaining: 0 });
      }
    }

const txStart = Date.now();
    const project = await db.$transaction(async (tx) => {
      if (generateContent) {
        // Pass the transaction client - consumeWork will detect it's in a transaction
        await new SubscriptionService(tx).consumeWork(session.user.id);
      }

      return createProjectWithStructureTx(tx, {
        userId: session.user.id,
        title,
        description,
        type,
        brief,
        structureMode: "generation",
      });
    }, { timeout: 30000 });
    logger.info("Transaction completed", { projectId: project.id, durationMs: Date.now() - txStart });

    await trackProductEvent({
      name: "work_created",
      category: "workspace",
      userId: session.user.id,
      projectId: project.id,
      metadata: { type, generateContent },
    }).catch(() => null);

    if (generateContent) {
      const existingBrief = await db.projectBrief.findUnique({
        where: { projectId: project.id },
        select: { generationStatus: true },
      });

      if (existingBrief?.generationStatus === "GENERATING" || existingBrief?.generationStatus === "READY") {
        return apiError("Geração já está em curso ou concluída para este trabalho.", 409);
      }

try {
        await withDistributedLock(
          `generate-work:${project.id}`,
          60000, // 60s TTL
          async () => {
            await startWorkGenerationJob({
              projectId: project.id,
              userId: session.user.id,
              title,
              type,
              brief,
              contentCost: 0,
              baseCost: 0,
            });
          },
          "Geração já está em curso para este projeto"
        );
      } catch (err) {
        logger.error("Failed to start generation job", { error: String(err), projectId: project.id });
      }
    }

    const completeProject = await db.project.findUnique({
      where: { id: project.id },
      include: {
        sections: { orderBy: { order: "asc" } },
        brief: true,
      },
    });

    return apiSuccess(
      {
        success: true,
        project: completeProject ? await serializeProjectDetail(completeProject) : completeProject,
        generation: {
          asynchronous: generateContent,
          projectId: project.id,
          step: generateContent ? "A validar o briefing" : "Briefing criado",
        },
        remainingWorks: await subscriptionService.canGenerateWork(session.user.id).then((result) => result.remaining),
        message: generateContent
          ? `A geração de ${formatProjectType(type)} começou com sucesso.`
          : "Briefing guardado e estrutura criada com sucesso.",
      },
      { status: generateContent ? 202 : 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("Payload inválido", 400, "VALIDATION_ERROR", error.flatten());
    }

    const message =
      process.env.NODE_ENV === "production"
        ? "Erro ao gerar trabalho"
        : error instanceof Error
          ? error.message
          : "Erro ao gerar trabalho";

    logger.error("Work generation error", { error: String(error) });
    return handleApiError(error, message);
  }
}
