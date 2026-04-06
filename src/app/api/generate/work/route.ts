import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSectionsForEducationLevel } from "@/lib/project-templates";
import { trackProductEvent } from "@/lib/product-events";
import { SubscriptionService, subscriptionService } from "@/lib/subscription";
import { createWorkSchema } from "@/lib/validators";
import {
  generateCover,
  generateTitlePage,
  getSectionTemplates,
  getWorkGenerationStatus,
  getWorkGenerationStatusAsync,
  triggerQueuedGenerationProcessing,
  startWorkGenerationJob,
  formatProjectType,
  serializeBrief,
} from "@/lib/work-generation-jobs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const body = createWorkSchema.parse(await request.json());
    const { title, type, description, generateContent, brief: rawBrief } = body;

    // Fallback inteligente: adapta-se à forma como o user preencheu os dados
    const brief = { ...rawBrief };
    const hasFullContext = brief.objective && brief.theme;
    const hasOnlyTheme = brief.theme && !brief.objective;

    // Cenário 1: User preencheu tudo → usa os campos normalmente
    // Cenário 2: User só preencheu o tema (ex: "Energia Solar nas zonas rurais de Gaza")
    //   → O tema pode conter contexto extra, reforçamos nas instruções adicionais
    if (hasOnlyTheme && description) {
      brief.additionalInstructions = `${brief.additionalInstructions ? brief.additionalInstructions + "\n" : ""}${description}`;
    } else if (!hasFullContext && description) {
      // User não preencheu campos estruturados mas escreveu na descrição
      brief.additionalInstructions = description;
    }

    // Se o tema é longo (>60 chars), provavelmente contém contexto extra
    // Além do título. Extraímos isso para as instruções.
    if (hasOnlyTheme && brief.theme && brief.theme.length > 60 && !brief.additionalInstructions) {
      brief.additionalInstructions = brief.theme;
    }

    const templates = getSectionTemplates(type, brief.educationLevel);

    const { allowed, reason } = await subscriptionService.canGenerateWork(session.user.id);
    if (!allowed) {
      return apiError(reason || "Limite de geração atingido", 403, "LIMIT_REACHED", { remaining: 0 });
    }

    const project = await db.$transaction(async (tx) => {
      await new SubscriptionService(tx).consumeWork(session.user.id);

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
              generationStatus: "BRIEFING",
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
      const isHigherEd = brief.educationLevel === "HIGHER_EDUCATION";
      const initialSections = [
        { title: "Capa", order: 1, content: generateCover(title, type, brief) },
        ...(isHigherEd ? [{ title: "Folha de Rosto", order: 2, content: generateTitlePage(title, type, brief) }] : []),
        ...projectSections
          .filter((section) => section.title !== "Capa" && section.title !== "Folha de Rosto" && section.title !== "Referências" && section.title !== "Anexos" && section.title !== "Apêndices")
          .map((section) => ({ title: section.title, order: section.order, content: "" })),
        ...templates.map((section) => ({ title: section.title, order: section.order, content: "" })),
        { title: "Referências", order: referenceOrder, content: brief.referencesSeed || "" },
      ];

      const seen = new Set<string>();
      const dedupedSections = initialSections.filter((section) => {
        if (seen.has(section.title)) return false;
        seen.add(section.title);
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
        return apiError("Geração já está em curso ou concluída para este trabalho.", 409);
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

    return apiSuccess(
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
