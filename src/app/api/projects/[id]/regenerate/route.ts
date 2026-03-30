import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regenerateWorkSection, startWorkGenerationJob } from "@/lib/work-generation-jobs";

const regenerateSchema = z.object({
  mode: z.enum(["work", "section"]),
  sectionId: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const payload = regenerateSchema.parse(await request.json());

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    include: { brief: true, sections: true },
  });

  if (!project || !project.brief) {
    return NextResponse.json({ error: "Trabalho não encontrado" }, { status: 404 });
  }

  if (payload.mode === "work") {
    const templatesLength = project.sections.filter(
      (section) => !["Capa", "Resumo", "Referências"].includes(section.title)
    ).length;
    const contentCost = templatesLength * 15;

    const userCredits = await db.credit.findUnique({ where: { userId: session.user.id } });
    if (!userCredits || userCredits.balance < contentCost) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Necessário: ${contentCost} créditos.` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.projectBrief.update({
        where: { projectId: id },
        data: { generationStatus: "GENERATING" },
      });

      await tx.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: contentCost },
          used: { increment: contentCost },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -contentCost,
          type: "USAGE",
          description: `Regeneração do trabalho: ${project.title}`,
          metadata: JSON.stringify({ projectId: id, mode: "regenerate-work" }),
        },
      });
    });

    await startWorkGenerationJob({
      projectId: id,
      userId: session.user.id,
      title: project.title,
      type: project.type,
      brief: {
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
      },
      contentCost,
    });

    return NextResponse.json({ success: true, asynchronous: true, projectId: id }, { status: 202 });
  }

  const section = project.sections.find((item) => item.id === payload.sectionId);
  if (!section) {
    return NextResponse.json({ error: "Secção não encontrada" }, { status: 404 });
  }

  const userCredits = await db.credit.findUnique({ where: { userId: session.user.id } });
  const sectionCost = 8;
  if (!userCredits || userCredits.balance < sectionCost) {
    return NextResponse.json(
      { error: `Créditos insuficientes. Necessário: ${sectionCost} créditos.` },
      { status: 400 }
    );
  }

  const content = await regenerateWorkSection({
    sectionId: section.id,
    title: project.title,
    type: project.type,
    brief: {
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
    },
    sectionTitle: section.title,
  });

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

  await db.$transaction([
    db.credit.update({
      where: { userId: session.user.id },
      data: {
        balance: { decrement: sectionCost },
        used: { increment: sectionCost },
      },
    }),
    db.creditTransaction.create({
      data: {
        userId: session.user.id,
        amount: -sectionCost,
        type: "USAGE",
        description: `Regeneração da secção: ${section.title}`,
        metadata: JSON.stringify({ projectId: id, sectionId: section.id, mode: "regenerate-section" }),
      },
    }),
  ]);

  return NextResponse.json({ success: true, sectionId: section.id, content });
}
