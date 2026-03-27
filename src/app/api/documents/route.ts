import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { countWordsInMarkdown, normalizeStoredContent } from "@/lib/content";
import { createDocumentSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";

// GET /api/documents - Get sections by project
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "ID do projecto é obrigatório" },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projecto não encontrado" },
        { status: 404 }
      );
    }

    const sections = await db.documentSection.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(
      sections.map((section) => ({
        ...section,
        content: normalizeStoredContent(section.content),
      }))
    );
  } catch (error) {
    logger.error("Get documents error", { error: String(error) });
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new section
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { projectId, parentId, title, content, order } = parsed.data;

    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projecto não encontrado" },
        { status: 404 }
      );
    }

    // Calculate word count
    const normalizedContent = normalizeStoredContent(content);
    const wordCount = countWordsInMarkdown(normalizedContent);

    const section = await db.documentSection.create({
      data: {
        projectId,
        parentId,
        title,
        content: normalizedContent,
        order: order || 0,
        wordCount,
      },
    });

    // Update project word count
    const totalWords = await db.documentSection.aggregate({
      where: { projectId },
      _sum: { wordCount: true },
    });

    await db.project.update({
      where: { id: projectId },
      data: { wordCount: totalWords._sum.wordCount || 0 },
    });

    return NextResponse.json(
      {
        ...section,
        content: normalizeStoredContent(section.content),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Create document error", { error: String(error) });
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
