import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkGenerationStatus, getWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";
import { getLastEditedSection, getResumeMode, getSectionSummary } from "@/lib/workspace";
import { getSectionsForEducationLevel } from "@/lib/project-templates";
import { subscriptionService } from "@/lib/subscription";
import { createProjectSchema } from "@/lib/validators";

function serializeBrief(
  brief:
    | {
        workType: string;
        generationStatus: string;
        institutionName: string | null;
        courseName: string | null;
        subjectName: string | null;
        educationLevel: string | null;
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
        citationStyle: string;
        language: string;
        additionalInstructions: string | null;
        coverTemplate?: string;
      }
    | null
) {
  if (!brief) {
    return null;
  }

  return {
    ...brief,
    dueDate: brief.dueDate?.toISOString() ?? null,
  };
}

async function serializeProject(project: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  wordCount: number;
  updatedAt: Date;
  createdAt: Date;
  sections: {
    id: string;
    title: string;
    parentId: string | null;
    order: number;
    wordCount: number;
    updatedAt: Date;
  }[];
  brief: {
    workType: string;
    generationStatus: string;
    institutionName: string | null;
    courseName: string | null;
    subjectName: string | null;
    educationLevel: string | null;
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
    citationStyle: string;
    language: string;
    additionalInstructions: string | null;
  } | null;
}) {
  const lastEditedSection = getLastEditedSection(project.sections);
  const sectionSummary = getSectionSummary(project.sections);
  const liveGeneration = await getWorkGenerationStatusAsync(project.id);

  return {
    ...project,
    brief: serializeBrief(project.brief),
    generationStatus: liveGeneration?.status || project.brief?.generationStatus || "BRIEFING",
    generationProgress: liveGeneration?.progress || (project.brief?.generationStatus === "READY" ? 100 : 0),
    generationStep: liveGeneration?.step || null,
    resumeMode: getResumeMode(project, lastEditedSection),
    lastEditedSection,
    sectionSummary,
  };
}

// GET /api/projects - List all user's projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortByInput = searchParams.get("sortBy") || "updatedAt";
    const sortOrderInput = searchParams.get("sortOrder") || "desc";

    const sortBy = (
      field: string
    ): "createdAt" | "updatedAt" | "title" => {
      if (field === "createdAt") return "createdAt";
      if (field === "updatedAt") return "updatedAt";
      if (field === "title") return "title";
      return "updatedAt";
    };
    const sortField = sortBy(sortByInput);
    const sortOrder = sortOrderInput === "asc" ? "asc" as const : "desc" as const;

    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const projects = await db.project.findMany({
      where,
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            parentId: true,
            order: true,
            wordCount: true,
            updatedAt: true,
          },
          orderBy: { order: "asc" },
        },
        brief: true,
        _count: {
          select: { sections: true },
        },
      },
      orderBy: {
        [sortField]: sortOrder,
      },
    });

    return NextResponse.json(await Promise.all(projects.map(serializeProject)));
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = createProjectSchema.parse(await request.json());
    const { title, description, type = "MONOGRAPHY", brief } = body;

    // Check user subscription
    const { allowed, reason } = await subscriptionService.canGenerateWork(session.user.id);

    if (!allowed) {
      return NextResponse.json(
        { error: reason, code: "LIMIT_REACHED", remaining: 0 },
        { status: 403 }
      );
    }

    // Create project with default sections
    const project = await db.$transaction(async (tx) => {
      // Consume work from subscription
      await subscriptionService.consumeWork(session.user.id);

      // Create project
      const newProject = await tx.project.create({
        data: {
          title,
          description,
          type,
          educationLevel: brief?.educationLevel,
          userId: session.user.id,
          ...(brief
              ? {
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
                      citationStyle: brief.citationStyle || "ABNT",
                      language: brief.language || "pt-MZ",
                      additionalInstructions: brief.additionalInstructions,
                      className: brief.className,
                      turma: brief.turma,
                      facultyName: brief.facultyName,
                      departmentName: brief.departmentName,
                      studentNumber: brief.studentNumber,
                      semester: brief.semester,
                    },
                  },
                }
            : {}),
        },
      });

      // Create default document structure from template
      const sections = getSectionsForEducationLevel(brief?.educationLevel, type);
      await tx.documentSection.createMany({
        data: sections.map((section) => ({
          projectId: newProject.id,
          title: section.title,
          order: section.order,
        })),
      });

      return newProject;
    });

    // Fetch the complete project with sections
    const completeProject = await db.project.findUnique({
      where: { id: project.id },
        include: {
          sections: {
            select: {
            id: true,
            title: true,
            parentId: true,
            order: true,
            wordCount: true,
            updatedAt: true,
            },
            orderBy: { order: "asc" },
          },
          brief: true,
        },
      });

    const serializedProject = completeProject ? await serializeProject(completeProject) : completeProject;
    return NextResponse.json(serializedProject, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }

    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
