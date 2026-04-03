import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { withDistributedLock } from "@/lib/distributed-lock";
import { DocumentExportService } from "@/lib/document-export";
import { enforceRateLimit } from "@/lib/rate-limit";

async function getExportModel(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      brief: {
        select: {
          institutionName: true,
          studentName: true,
          city: true,
          academicYear: true,
        },
      },
      sections: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) {
    return null;
  }

  return DocumentExportService.createModel(project);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return apiError("ID do projecto é obrigatório", 400);
    }

    await enforceRateLimit(`export:docx:${session.user.id}`, 20, 60 * 1000);

    const exportResult = await withDistributedLock(
      `export:docx:${session.user.id}:${projectId}`,
      15_000,
      async () => {
        const exportModel = await getExportModel(projectId, session.user.id);
        if (!exportModel) {
          return null;
        }
        const exportBuffer = await DocumentExportService.generateDocx(exportModel);
        return { model: exportModel, buffer: exportBuffer };
      },
      "Já existe uma exportação DOCX em curso para este projecto.",
    );

    if (!exportResult) {
      return apiError("Projecto não encontrado", 404);
    }

    const { model, buffer } = exportResult;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${model.title.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}.docx"`,
      },
    });
  } catch (error) {
    return handleApiError(error, "Erro ao exportar documento");
  }
}
