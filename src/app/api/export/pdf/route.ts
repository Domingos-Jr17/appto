import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { withDistributedLock } from "@/lib/distributed-lock";
import { DocumentExportService } from "@/lib/document-export";
import { enforceRateLimit } from "@/lib/rate-limit";
import { subscriptionService } from "@/lib/subscription";

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

    await enforceRateLimit(`export:pdf:${session.user.id}`, 20, 60 * 1000);

    // Check if user can export PDF (PRO only)
    const { allowed: canExportPdf, reason } = await subscriptionService.canExportPdf(session.user.id);
    
    if (!canExportPdf) {
      return apiError(reason || "Export PDF disponível apenas em PRO", 403);
    }

    const exportResult = await withDistributedLock(
      `export:pdf:${session.user.id}:${projectId}`,
      15_000,
      async () => {
        const project = await db.project.findFirst({
          where: {
            id: projectId,
            userId: session.user.id,
          },
          include: {
            brief: {
              select: {
                institutionName: true,
                studentName: true,
                advisorName: true,
                courseName: true,
                subjectName: true,
                facultyName: true,
                departmentName: true,
                className: true,
                turma: true,
                coverTemplate: true,
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

        const exportModel = DocumentExportService.createModel(project);
        const exportBuffer = await renderToBuffer(DocumentExportService.createPdfComponent(exportModel));

        return { model: exportModel, pdfBuffer: exportBuffer };
      },
      "Já existe uma exportação PDF em curso para este projecto.",
    );

    if (!exportResult) {
      return apiError("Projecto não encontrado", 404);
    }

    const { model, pdfBuffer } = exportResult;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${model.title.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error, "Erro ao exportar PDF");
  }
}
