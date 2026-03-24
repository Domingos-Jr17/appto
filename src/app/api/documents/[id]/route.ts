import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { countWordsInMarkdown, normalizeStoredContent } from "@/lib/content";
import { updateDocumentSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";

// GET /api/documents/[id] - Get a single section
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const section = await db.documentSection.findUnique({
      where: { id },
      include: {
        project: true,
        children: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!section) {
      return NextResponse.json(
        { error: "Secção não encontrada" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (section.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    return NextResponse.json({
      ...section,
      content: normalizeStoredContent(section.content),
      children: section.children.map((child) => ({
        ...child,
        content: normalizeStoredContent(child.content),
      })),
    });
  } catch (error) {
    logger.error("Get document error", { error: String(error) });
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update a section
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
    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content, order } = parsed.data;

    const existingSection = await db.documentSection.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingSection) {
      return NextResponse.json(
        { error: "Secção não encontrada" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingSection.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Calculate word count
    const normalizedContent =
      content !== undefined ? normalizeStoredContent(content) : undefined;
    const wordCount = countWordsInMarkdown(normalizedContent ?? existingSection.content);

    const section = await db.documentSection.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content: normalizedContent, wordCount }),
        ...(order !== undefined && { order }),
      },
    });

    // Update project word count
    const totalWords = await db.documentSection.aggregate({
      where: { projectId: existingSection.projectId },
      _sum: { wordCount: true },
    });

    await db.project.update({
      where: { id: existingSection.projectId },
      data: { wordCount: totalWords._sum.wordCount || 0 },
    });

    return NextResponse.json({
      ...section,
      content: normalizeStoredContent(section.content),
    });
  } catch (error) {
    logger.error("Update document error", { error: String(error) });
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const existingSection = await db.documentSection.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingSection) {
      return NextResponse.json(
        { error: "Secção não encontrada" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingSection.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    await db.documentSection.delete({
      where: { id },
    });

    // Update project word count
    const totalWords = await db.documentSection.aggregate({
      where: { projectId: existingSection.projectId },
      _sum: { wordCount: true },
    });

    await db.project.update({
      where: { id: existingSection.projectId },
      data: { wordCount: totalWords._sum.wordCount || 0 },
    });

    return NextResponse.json({ message: "Secção eliminada com sucesso" });
  } catch (error) {
    logger.error("Delete document error", { error: String(error) });
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
