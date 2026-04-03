import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { withDistributedLock } from "@/lib/distributed-lock";
import { enforceRateLimit } from "@/lib/rate-limit";
import { type AIAction, subscriptionService } from "@/lib/subscription";
import { regenerateWorkSection, startWorkGenerationJob } from "@/lib/work-generation-jobs";
import type { AcademicEducationLevel } from "@/types/editor";

const regenerateSchema = z.object({
  mode: z.enum(["work", "section"]),
  sectionId: z.string().min(1).optional(),
});

interface ProjectWithBrief {
  brief: {
    institutionName: string | null;
    courseName: string | null;
    subjectName: string | null;
    educationLevel: AcademicEducationLevel | null;
    advisorName: string | null;
    studentName: string | null;
    city: string | null;
    academicYear: number | null;
    dueDate: Date | null;
    theme: string | null;
    subtitle: string | null;
    objective: string | null;
    researchQuestion: string | null;
    methodology: string | null;
    keywords: string | null;
    referencesSeed: string | null;
    citationStyle: "ABNT" | "APA" | "Vancouver";
    language: string;
    additionalInstructions: string | null;
  } | null;
}

function serializeBrief(project: ProjectWithBrief) {
  if (!project.brief) {
    return null;
  }

  return {
    institutionName: project.brief.institutionName || undefined,
    courseName: project.brief.courseName || undefined,
    subjectName: project.brief.subjectName || undefined,
    educationLevel: project.brief.educationLevel || undefined,
    advisorName: project.brief.advisorName || undefined,
    studentName: project.brief.studentName || undefined,
    city: project.brief.city || undefined,
    academicYear: project.brief.academicYear || undefined,
    dueDate: project.brief.dueDate?.toISOString() || undefined,
    theme: project.brief.theme || undefined,
    subtitle: project.brief.subtitle || undefined,
    objective: project.brief.objective || undefined,
    researchQuestion: project.brief.researchQuestion || undefined,
    methodology: project.brief.methodology || undefined,
    keywords: project.brief.keywords || undefined,
    referencesSeed: project.brief.referencesSeed || undefined,
    citationStyle: project.brief.citationStyle,
    language: project.brief.language,
    additionalInstructions: project.brief.additionalInstructions || undefined,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const payload = regenerateSchema.parse(await request.json());

  await enforceRateLimit(`regenerate:${session.user.id}`, 20, 60 * 1000);

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    include: { brief: true, sections: true },
  });

  if (!project || !project.brief) {
    return NextResponse.json({ error: "Trabalho não encontrado" }, { status: 404 });
  }

  const brief = serializeBrief(project);
  if (!brief) {
    return NextResponse.json({ error: "Briefing inválido" }, { status: 400 });
  }

  if (payload.mode === "work") {
    const { allowed, reason, remaining } = await subscriptionService.canGenerateWork(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: reason || "Limite de trabalhos atingido.", remaining },
        { status: 403 },
      );
    }

    const existingJob = await db.generationJob.findUnique({
      where: { projectId: id },
      select: { id: true, status: true },
    });

    if (existingJob && existingJob.status === "GENERATING") {
      return NextResponse.json(
        { error: "Geração já está em curso para este trabalho." },
        { status: 409 },
      );
    }

    await withDistributedLock(
      `regenerate:work:${session.user.id}:${id}`,
      20_000,
      async () => {
        await subscriptionService.consumeWork(session.user.id);

        await startWorkGenerationJob({
          projectId: id,
          userId: session.user.id,
          title: project.title,
          type: project.type,
          brief,
          contentCost: 0,
          baseCost: 0,
        });
      },
      "Já existe uma regeneração completa em curso para este trabalho.",
    );

    return NextResponse.json(
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
    return NextResponse.json({ error: "Secção não encontrada" }, { status: 404 });
  }

  const sectionAction: AIAction = "generate-section";
  const { allowed: canRegenerateSection, reason: sectionReason } = await subscriptionService.canUseAIAction(
    session.user.id,
    sectionAction,
  );

  if (!canRegenerateSection) {
    return NextResponse.json(
      { error: sectionReason || "Ação não disponível no seu pacote." },
      { status: 403 },
    );
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
    "Já existe uma regeneração em curso para esta secção.",
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

  return NextResponse.json({ success: true, sectionId: section.id, content });
}
