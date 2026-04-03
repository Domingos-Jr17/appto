import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { DocumentExportService } from "@/lib/document-export";
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

    // Check if user can export PDF (PRO only)
    const { allowed: canExportPdf, reason } = await subscriptionService.canExportPdf(session.user.id);
    
    if (!canExportPdf) {
      return apiError(reason || "Export PDF disponível apenas em PRO", 403);
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!project) {
      return apiError("Projecto não encontrado", 404);
    }

    const model = DocumentExportService.createModel(project);
    const pdfBuffer = await renderToBuffer(DocumentExportService.createPdfComponent(model));

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
