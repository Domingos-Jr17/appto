import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteStoredObject } from "@/lib/storage";
import { normalizeStoredContent } from "@/lib/content";
import { getWorkGenerationStatus } from "@/lib/work-generation-jobs";
import { getLastEditedSection, getResumeMode, getSectionSummary } from "@/lib/workspace";
import { updateProjectSchema } from "@/lib/validators";

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

function serializeProject(project: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  sections: {
    id: string;
    title: string;
    content: string | null;
    order: number;
    wordCount: number;
    parentId: string | null;
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
  const sections = project.sections.map((section) => ({
    ...section,
    content: normalizeStoredContent(section.content),
  }));
  const lastEditedSection = getLastEditedSection(sections);
  const sectionSummary = getSectionSummary(sections);
  const liveGeneration = getWorkGenerationStatus(project.id);

  return {
    ...project,
    sections,
    brief: serializeBrief(project.brief),
    generationStatus: liveGeneration?.status || project.brief?.generationStatus || "BRIEFING",
    generationProgress: liveGeneration?.progress || (project.brief?.generationStatus === "READY" ? 100 : 0),
    generationStep: liveGeneration?.step || null,
    resumeMode: getResumeMode(project, lastEditedSection),
    lastEditedSection,
    sectionSummary,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const project = await db.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            content: true,
            order: true,
            wordCount: true,
            parentId: true,
            updatedAt: true,
          },
          orderBy: { order: "asc" },
        },
        brief: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projecto não encontrado" }, { status: 404 });
    }

    return NextResponse.json(serializeProject(project));
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { title, description, status, type, brief } = updateProjectSchema.parse(await request.json());

    const existingProject = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Projecto não encontrado" }, { status: 404 });
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(type && { type }),
        ...((type || brief) && {
          brief: {
            upsert: {
              create: {
                workType: type || existingProject.type,
                generationStatus: "NEEDS_REVIEW",
                institutionName: brief?.institutionName,
                courseName: brief?.courseName,
                subjectName: brief?.subjectName,
                educationLevel: brief?.educationLevel,
                advisorName: brief?.advisorName,
                studentName: brief?.studentName,
                city: brief?.city,
                academicYear: brief?.academicYear,
                dueDate: brief?.dueDate ? new Date(brief.dueDate) : undefined,
                theme: brief?.theme || title || existingProject.title,
                subtitle: brief?.subtitle,
                objective: brief?.objective,
                researchQuestion: brief?.researchQuestion,
                methodology: brief?.methodology,
                keywords: brief?.keywords,
                referencesSeed: brief?.referencesSeed,
                citationStyle: brief?.citationStyle || "ABNT",
                language: brief?.language || "pt-MZ",
                additionalInstructions: brief?.additionalInstructions,
                coverTemplate: brief?.coverTemplate || "UEM_STANDARD",
              },
              update: {
                ...(type ? { workType: type } : {}),
                ...(brief?.institutionName !== undefined ? { institutionName: brief.institutionName } : {}),
                ...(brief?.courseName !== undefined ? { courseName: brief.courseName } : {}),
                ...(brief?.subjectName !== undefined ? { subjectName: brief.subjectName } : {}),
                ...(brief?.educationLevel !== undefined ? { educationLevel: brief.educationLevel } : {}),
                ...(brief?.advisorName !== undefined ? { advisorName: brief.advisorName } : {}),
                ...(brief?.studentName !== undefined ? { studentName: brief.studentName } : {}),
                ...(brief?.city !== undefined ? { city: brief.city } : {}),
                ...(brief?.academicYear !== undefined ? { academicYear: brief.academicYear } : {}),
                ...(brief?.dueDate !== undefined ? { dueDate: brief.dueDate ? new Date(brief.dueDate) : null } : {}),
                ...(brief?.theme !== undefined ? { theme: brief.theme } : {}),
                ...(brief?.subtitle !== undefined ? { subtitle: brief.subtitle } : {}),
                ...(brief?.objective !== undefined ? { objective: brief.objective } : {}),
                ...(brief?.researchQuestion !== undefined ? { researchQuestion: brief.researchQuestion } : {}),
                ...(brief?.methodology !== undefined ? { methodology: brief.methodology } : {}),
                ...(brief?.keywords !== undefined ? { keywords: brief.keywords } : {}),
                ...(brief?.referencesSeed !== undefined ? { referencesSeed: brief.referencesSeed } : {}),
                ...(brief?.citationStyle !== undefined ? { citationStyle: brief.citationStyle } : {}),
                ...(brief?.language !== undefined ? { language: brief.language } : {}),
                ...(brief?.additionalInstructions !== undefined ? { additionalInstructions: brief.additionalInstructions } : {}),
                ...(brief?.coverTemplate !== undefined ? { coverTemplate: brief.coverTemplate } : {}),
                generationStatus: "NEEDS_REVIEW",
              },
            },
          },
        }),
        ...(brief?.educationLevel !== undefined ? { educationLevel: brief.educationLevel } : {}),
      },
      include: {
        sections: {
          select: {
            id: true,
            title: true,
            content: true,
            order: true,
            wordCount: true,
            parentId: true,
            updatedAt: true,
          },
          orderBy: { order: "asc" },
        },
        brief: true,
      },
    });

    return NextResponse.json(serializeProject(project));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }

    console.error("Update project error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existingProject = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Projecto não encontrado" }, { status: 404 });
    }

    const storedFiles = await db.storedFile.findMany({
      where: { projectId: id },
    });

    await Promise.all(
      storedFiles.map(async (file) => {
        await deleteStoredObject(file).catch(() => null);
      })
    );

    await db.project.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Projeto eliminado com sucesso" });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
