import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";
import { resolveGenerationSnapshot } from "@/lib/work-generation-state";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        brief: {
          select: { generationStatus: true },
        },
      },
    });

    if (!project) {
      return apiError("Trabalho não encontrado", 404);
    }

    const liveJob = await getWorkGenerationStatusAsync(id);

    const snapshot = resolveGenerationSnapshot({
      liveJob,
      fallbackStatus: project.brief?.generationStatus,
    });

    return apiSuccess({
      projectId: id,
      status: snapshot.status,
      progress: snapshot.progress,
      step: snapshot.step,
      activeSectionTitle: snapshot.activeSectionTitle,
      error: liveJob?.error || null,
      ready: snapshot.status === "READY",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
