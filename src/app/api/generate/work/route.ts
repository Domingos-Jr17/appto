import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createWorkSchema } from "@/lib/validators";
import {
  formatProjectType,
  generateCover,
  getSectionTemplates,
  serializeBrief,
  startWorkGenerationJob,
} from "@/lib/work-generation-jobs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = createWorkSchema.parse(await request.json());
    const { title, type, description, generateContent, brief } = body;
    const templates = getSectionTemplates(type);
    const baseCost = 20;
    const contentCost = generateContent ? templates.length * 15 : 0;
    const totalCost = baseCost + contentCost;

    const userCredits = await db.credit.findUnique({ where: { userId: session.user.id } });

    if (!userCredits || userCredits.balance < totalCost) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Necessário: ${totalCost} créditos.` },
        { status: 400 }
      );
    }

    const project = await db.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          title,
          description,
          type,
          educationLevel: brief.educationLevel,
          userId: session.user.id,
          status: "IN_PROGRESS",
          brief: {
            create: {
              workType: type,
              generationStatus: generateContent ? "GENERATING" : "BRIEFING",
              institutionName: brief.institutionName,
              courseName: brief.courseName,
              subjectName: brief.subjectName,
              educationLevel: brief.educationLevel,
              advisorName: brief.advisorName,
              studentName: brief.studentName,
              city: brief.city,
              academicYear: brief.academicYear,
              dueDate: brief.dueDate ? new Date(brief.dueDate) : undefined,
              theme: brief.theme || title,
              subtitle: brief.subtitle,
              objective: brief.objective,
              researchQuestion: brief.researchQuestion,
              methodology: brief.methodology,
              keywords: brief.keywords,
              referencesSeed: brief.referencesSeed,
              citationStyle: brief.citationStyle,
              language: brief.language,
              additionalInstructions: brief.additionalInstructions,
            },
          },
        },
      });

      const referenceOrder = Math.max(...templates.map((section) => section.order)) + 1;
      const initialSections = [
        { title: "Capa", order: 1, content: generateCover(title, type, brief) },
        { title: "Resumo", order: 2, content: "" },
        ...templates.map((section) => ({ title: section.title, order: section.order, content: "" })),
        { title: "Referências", order: referenceOrder, content: brief.referencesSeed || "" },
      ];

      await tx.documentSection.createMany({
        data: initialSections.map((section) => ({
          projectId: createdProject.id,
          title: section.title,
          order: section.order,
          content: section.content,
        })),
      });

      await tx.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: totalCost },
          used: { increment: totalCost },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -totalCost,
          type: "USAGE",
          description: `Geração de trabalho: ${title}`,
          metadata: JSON.stringify({
            projectId: createdProject.id,
            mode: generateContent ? "async-generation" : "briefing-only",
          }),
        },
      });

      return createdProject;
    });

    if (generateContent) {
      await startWorkGenerationJob({
        projectId: project.id,
        userId: session.user.id,
        title,
        type,
        brief,
        contentCost,
      });
    }

    const completeProject = await db.project.findUnique({
      where: { id: project.id },
      include: {
        sections: { orderBy: { order: "asc" } },
        brief: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        project: completeProject
          ? {
              ...completeProject,
              brief: completeProject.brief ? serializeBrief(completeProject.brief) : null,
            }
          : completeProject,
        generation: {
          asynchronous: generateContent,
          projectId: project.id,
          step: generateContent ? "A validar o briefing" : "Briefing criado",
        },
        creditsUsed: totalCost,
        message: generateContent
          ? `A geração de ${formatProjectType(type)} começou com sucesso.`
          : "Briefing guardado e estrutura criada com sucesso.",
      },
      { status: generateContent ? 202 : 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload inválido", details: error.flatten() },
        { status: 400 }
      );
    }

    const message =
      process.env.NODE_ENV === "production"
        ? "Erro ao gerar trabalho"
        : error instanceof Error
          ? error.message
          : "Erro ao gerar trabalho";

    console.error("[Work Generation Error]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
