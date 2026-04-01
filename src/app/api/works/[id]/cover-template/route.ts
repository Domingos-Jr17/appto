import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { coverTemplateSchema } from "@/lib/validators";

const bodySchema = z.object({
  template: coverTemplateSchema,
});

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
    const { template } = bodySchema.parse(await request.json());

    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      include: { brief: true },
    });

    if (!project || !project.brief) {
      return NextResponse.json(
        { error: "Trabalho não encontrado" },
        { status: 404 }
      );
    }

    await db.projectBrief.update({
      where: { projectId: id },
      data: { coverTemplate: template },
    });

    return NextResponse.json({ ok: true, template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Cover template update error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
