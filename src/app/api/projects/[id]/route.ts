import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteStoredObject } from "@/lib/storage";
import { normalizeStoredContent } from "@/lib/content";
import { getLastEditedSection, getResumeMode, getSectionSummary } from "@/lib/workspace";
import { createProjectSchema, projectStatusSchema, projectTypeSchema } from "@/lib/validators";

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

  return {
    ...project,
    sections,
    brief: serializeBrief(project.brief),
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
    const rawBody = (await request.json()) as Record<string, unknown>;
    const title = typeof rawBody.title === "string" ? createProjectSchema.shape.title.parse(rawBody.title) : undefined;
    const description = rawBody.description === undefined
      ? undefined
      : rawBody.description === null
        ? null
        : createProjectSchema.shape.description.parse(rawBody.description);
    const status = typeof rawBody.status === "string" ? projectStatusSchema.parse(rawBody.status) : undefined;
    const type = typeof rawBody.type === "string" ? projectTypeSchema.parse(rawBody.type) : undefined;

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
        ...(type && {
          brief: {
            upsert: {
              create: { workType: type },
              update: { workType: type },
            },
          },
        }),
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
