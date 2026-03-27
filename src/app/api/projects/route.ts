import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLastEditedSection, getResumeMode, getSectionSummary } from "@/lib/workspace";
import { DEFAULT_PROJECT_SECTIONS } from "@/lib/project-templates";
import { CREDIT_DEFAULTS } from "@/lib/credits";

function serializeProject(project: {
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
}) {
  const lastEditedSection = getLastEditedSection(project.sections);
  const sectionSummary = getSectionSummary(project.sections);

  return {
    ...project,
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
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

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
        _count: {
          select: { sections: true },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json(projects.map(serializeProject));
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

    const body = await request.json();
    const { title, description, type = "MONOGRAPHY" } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Título é obrigatório" },
        { status: 400 }
      );
    }

    // Check user credits
    const userCredits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits || userCredits.balance < CREDIT_DEFAULTS.createProject) {
      return NextResponse.json(
        { error: "Créditos insuficientes para criar um novo projecto" },
        { status: 400 }
      );
    }

    // Create project with default sections
    const project = await db.$transaction(async (tx) => {
      // Deduct credits
      await tx.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: CREDIT_DEFAULTS.createProject },
          used: { increment: CREDIT_DEFAULTS.createProject },
        },
      });

      // Log transaction
      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -CREDIT_DEFAULTS.createProject,
          type: "USAGE",
          description: `Criação do projecto: ${title}`,
        },
      });

      // Create project
      const newProject = await tx.project.create({
        data: {
          title,
          description,
          type,
          userId: session.user.id,
        },
      });

      // Create default document structure from template
      await tx.documentSection.createMany({
        data: DEFAULT_PROJECT_SECTIONS.map((section) => ({
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
      },
    });

    return NextResponse.json(completeProject ? serializeProject(completeProject) : completeProject, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
