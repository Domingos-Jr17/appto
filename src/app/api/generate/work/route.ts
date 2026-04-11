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
      return apiError("Unauthorized", 401);
    }

    const body = createWorkSchema.parse(await request.json());
    const { title, type, description, generateContent } = body;
    const brief = normalizeWorkBriefForGeneration({ ...body.brief }, description);

    if (generateContent) {
      const { allowed, reason } = await subscriptionService.canGenerateWork(session.user.id);
      if (!allowed) {
        return apiError(reason || "Generation limit reached", 403, "LIMIT_REACHED", { remaining: 0 });
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
        return apiError("Generation is already in progress or completed for this work.", 409);
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
          "Generation is already in progress for this project"
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
          step: generateContent ? "Validating the brief" : "Brief created",
        },
        remainingWorks: await subscriptionService.canGenerateWork(session.user.id).then((result) => result.remaining),
        message: generateContent
          ? `${formatProjectType(type)} generation started successfully.`
          : "Brief saved and structure created successfully.",
      },
      { status: generateContent ? 202 : 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("Invalid payload", 400, "VALIDATION_ERROR", error.flatten());
    }

    const message =
      process.env.NODE_ENV === "production"
        ? "Failed to generate work"
        : error instanceof Error
          ? error.message
          : "Failed to generate work";

    logger.error("Work generation error", { error: String(error) });
    return handleApiError(error, message);
  }
}
