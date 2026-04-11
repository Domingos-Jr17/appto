import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildGenerationSectionKey } from "@/lib/generation/run-domain";
import { getSectionTemplates } from "@/lib/work-generation-jobs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { id: projectId } = await params;
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true, type: true },
    });

    if (!project) {
      return apiError("Work not found", 404);
    }

    const templates = getSectionTemplates(project.type);
    const existingSections = await db.documentSection.findMany({
      where: { projectId, title: { in: templates.map((t) => t.title) } },
      select: { title: true, content: true, wordCount: true },
    });

    const generatedSections = templates.map((template) => {
      const existing = existingSections.find((s) => s.title === template.title);
      return {
        key: buildGenerationSectionKey({ title: template.title, order: template.order }),
        title: template.title,
        order: template.order,
        generated: !!existing?.content,
        wordCount: existing?.wordCount || 0,
      };
    });

    return apiSuccess({ sections: generatedSections });
  } catch (error) {
    return handleApiError(error, "Failed to get section status");
  }
}
