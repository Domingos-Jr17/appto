import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    return NextResponse.json(section);
  } catch (error) {
    console.error("Get document error:", error);
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
    const { title, content, order } = body;

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
    const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

    const section = await db.documentSection.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content, wordCount }),
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

    return NextResponse.json(section);
  } catch (error) {
    console.error("Update document error:", error);
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
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
