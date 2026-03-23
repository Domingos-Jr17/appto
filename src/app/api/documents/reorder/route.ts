import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeStoredContent } from "@/lib/content";

interface ReorderItem {
  id: string;
  parentId: string | null;
  order: number;
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const projectId = body?.projectId as string | undefined;
    const items = body?.items as ReorderItem[] | undefined;

    if (!projectId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
        sections: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    const allowedIds = new Set(project.sections.map((section) => section.id));
    if (items.some((item) => !allowedIds.has(item.id) || (item.parentId !== null && !allowedIds.has(item.parentId)))) {
      return NextResponse.json({ error: "Secções inválidas no reorder" }, { status: 400 });
    }

    await db.$transaction(
      items.map((item) =>
        db.documentSection.update({
          where: { id: item.id },
          data: {
            parentId: item.parentId,
            order: item.order,
          },
        })
      )
    );

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
    console.error("Reorder documents error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
