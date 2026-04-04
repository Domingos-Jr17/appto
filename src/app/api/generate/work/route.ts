import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createWorkSchema } from "@/lib/validators";
import { trackProductEvent } from "@/lib/product-events";
import { getSectionsForEducationLevel } from "@/lib/project-templates";
import {
  formatProjectType,
  generateCover,
  getSectionTemplates,
  serializeBrief,
  startWorkGenerationJob,
} from "@/lib/work-generation-jobs";
import { subscriptionService } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = createWorkSchema.parse(await request.json());
    const { title, type, description, generateContent, brief } = body;
    const templates = getSectionTemplates(type);

    // Check user subscription
    const { allowed, reason } = await subscriptionService.canGenerateWork(session.user.id);

    if (!allowed) {
      return NextResponse.json(
        { error: reason, code: "LIMIT_REACHED", remaining: 0 },
        { status: 403 }
      );
    }

    const project = await db.$transaction(async (tx) => {
      // Consume work from subscription
      await subscriptionService.consumeWork(session.user.id);

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
              generationStatus: generateContent ? "BRIEFING" : "BRIEFING",
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
              coverTemplate: brief.coverTemplate,
              className: brief.className,
              turma: brief.turma,
              facultyName: brief.facultyName,
              departmentName: brief.departmentName,
              studentNumber: brief.studentNumber,
              semester: brief.semester,
            },
          },
        },
      });

      const referenceOrder = Math.max(...templates.map((section) => section.order)) + 1;
      const projectSections = getSectionsForEducationLevel(brief.educationLevel, type);

      // Build initial sections: cover + content sections + references
      const initialSections = [
        { title: "Capa", order: 1, content: generateCover(title, type, brief) },
        ...projectSections
          .filter((s) => s.title !== "Capa" && s.title !== "Referências" && s.title !== "Anexos")
          .map((section) => ({ title: section.title, order: section.order, content: "" })),
        ...templates.map((section) => ({ title: section.title, order: section.order, content: "" })),
        { title: "Referências", order: referenceOrder, content: brief.referencesSeed || "" },
      ];

      // Deduplicate by title (keep first occurrence)
      const seen = new Set<string>();
      const dedupedSections = initialSections.filter((s) => {
        if (seen.has(s.title)) return false;
        seen.add(s.title);
        return true;
      });

      await tx.documentSection.createMany({
        data: dedupedSections.map((section) => ({
          projectId: createdProject.id,
          title: section.title,
          order: section.order,
          content: section.content,
        })),
      });

      return createdProject;
    });

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
        return NextResponse.json(
          { error: "Geração já está em curso ou concluída para este trabalho." },
          { status: 409 }
        );
      }

      await startWorkGenerationJob({
        projectId: project.id,
        userId: session.user.id,
        title,
        type,
        brief,
        contentCost: 0,
        baseCost: 0,
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
        remainingWorks: await subscriptionService.canGenerateWork(session.user.id).then(r => r.remaining),
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
