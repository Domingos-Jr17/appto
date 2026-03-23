import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteStoredObject } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const project = await db.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto nÃ£o encontrado" }, { status: 404 });
    }

    return NextResponse.json(project);
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
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, status, type } = body;

    const existingProject = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Projeto nÃ£o encontrado" }, { status: 404 });
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
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
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existingProject = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Projeto nÃ£o encontrado" }, { status: 404 });
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
