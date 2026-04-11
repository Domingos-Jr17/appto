import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { withDistributedLock } from "@/lib/distributed-lock";
import { toWorkBriefInput } from "@/lib/projects/project-brief";
import { enforceRateLimit } from "@/lib/rate-limit";
import { subscriptionService, type AIAction } from "@/lib/subscription";
import { regenerateWorkSection, startWorkGenerationJob } from "@/lib/work-generation-jobs";

const regenerateSchema = z.object({
  mode: z.enum(["work", "section"]),
  sectionId: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  try {
    const payload = await parseBody(request, regenerateSchema);

    await enforceRateLimit(`regenerate:${session.user.id}`, 20, 60 * 1000);

    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      include: { brief: true, sections: true },
    });

    if (!project || !project.brief) {
        return apiError("Work not found", 404);
    }

    const brief = project.brief ? toWorkBriefInput(project.brief) : null;
    if (!brief) {
        return apiError("Invalid brief", 400);
    }

    if (payload.mode === "work") {
      const { allowed, reason, remaining } = await subscriptionService.canGenerateWork(session.user.id);
      if (!allowed) {
        return apiError(reason || "Work limit reached.", 403, "LIMIT_REACHED", { remaining });
      }

      const existingJob = await db.generationJob.findUnique({
        where: { projectId: id },
        select: { id: true, status: true },
      });

      if (existingJob && existingJob.status === "GENERATING") {
        return apiError("Generation is already in progress for this work.", 409);
      }

      await withDistributedLock(
        `regenerate:work:${session.user.id}:${id}`,
        20_000,
        async () => {
          let workConsumed = false;
          try {
            await subscriptionService.consumeWork(session.user.id);
            workConsumed = true;

            await startWorkGenerationJob({
              projectId: id,
              userId: session.user.id,
              title: project.title,
              type: project.type,
              brief,
              contentCost: 0,
              baseCost: 0,
            });
          } catch (error) {
            if (workConsumed) {
              await subscriptionService.refundWork(session.user.id).catch(() => null);
            }
            throw error;
          }
        },
        "A full regeneration is already in progress for this work.",
      );

      return apiSuccess(
        {
          success: true,
          asynchronous: true,
          projectId: id,
          remainingWorks: await subscriptionService.canGenerateWork(session.user.id).then((result) => result.remaining),
        },
        { status: 202 },
      );
    }

    const section = project.sections.find((item) => item.id === payload.sectionId);
    if (!section) {
        return apiError("Section not found", 404);
    }

    const sectionAction: AIAction = "generate-section";
    const { allowed: canRegenerateSection, reason: sectionReason } = await subscriptionService.canUseAIAction(
      session.user.id,
      sectionAction,
    );

    if (!canRegenerateSection) {
      return apiError(sectionReason || "This action is not available on your plan.", 403);
    }

    const content = await withDistributedLock(
      `regenerate:section:${session.user.id}:${section.id}`,
      15_000,
      async () =>
        regenerateWorkSection({
          sectionId: section.id,
          title: project.title,
          type: project.type,
          brief,
          sectionTitle: section.title,
        }),
      "A regeneration is already in progress for this section.",
    );

    const updatedSections = await db.documentSection.findMany({
      where: { projectId: id },
      select: { wordCount: true },
    });

    await db.project.update({
      where: { id },
      data: {
        wordCount: updatedSections.reduce((sum, item) => sum + item.wordCount, 0),
      },
    });

    return apiSuccess({ success: true, sectionId: section.id, content });
  } catch (error) {
    return handleApiError(error, "Could not regenerate the work");
  }
}
