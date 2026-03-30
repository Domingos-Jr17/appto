import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkGenerationStatus } from "@/lib/work-generation-jobs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
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
    return NextResponse.json({ error: "Trabalho não encontrado" }, { status: 404 });
  }

  const liveJob = getWorkGenerationStatus(id);

  if (liveJob) {
    return NextResponse.json({
      projectId: id,
      status: liveJob.status,
      progress: liveJob.progress,
      step: liveJob.step,
      error: liveJob.error || null,
      ready: liveJob.status === "READY",
    });
  }

  const generationStatus = project.brief?.generationStatus || "BRIEFING";
  const fallbackStatus =
    generationStatus === "READY"
      ? { status: "READY", progress: 100, step: "Trabalho pronto para revisão", ready: true }
      : generationStatus === "FAILED"
        ? { status: "FAILED", progress: 100, step: "Falha na geração", ready: false }
        : generationStatus === "GENERATING"
          ? { status: "GENERATING", progress: 15, step: "A preparar geração", ready: false }
          : { status: "BRIEFING", progress: 0, step: "Briefing criado", ready: false };

  return NextResponse.json({ projectId: id, error: null, ...fallbackStatus });
}
