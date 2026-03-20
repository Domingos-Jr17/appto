import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
          where: { parentId: null },
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

    return NextResponse.json(projects);
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

    if (!userCredits || userCredits.balance < 10) {
      return NextResponse.json(
        { error: "Créditos insuficientes para criar um novo projeto" },
        { status: 400 }
      );
    }

    // Create project with default sections
    const project = await db.$transaction(async (tx) => {
      // Deduct credits
      await tx.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: 10 },
          used: { increment: 10 },
        },
      });

      // Log transaction
      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -10,
          type: "USAGE",
          description: `Criação do projeto: ${title}`,
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

      // Create default document structure
      const defaultSections = [
        { title: "Capa", order: 1 },
        { title: "Resumo", order: 2 },
        { title: "Abstract", order: 3 },
        { title: "Agradecimentos", order: 4 },
        { title: "Índice", order: 5 },
        { title: "1. Introdução", order: 6 },
        { title: "2. Revisão da Literatura", order: 7 },
        { title: "3. Metodologia", order: 8 },
        { title: "4. Resultados", order: 9 },
        { title: "5. Discussão", order: 10 },
        { title: "6. Conclusão", order: 11 },
        { title: "Referências", order: 12 },
        { title: "Anexos", order: 13 },
      ];

      await tx.documentSection.createMany({
        data: defaultSections.map((section) => ({
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
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(completeProject, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
