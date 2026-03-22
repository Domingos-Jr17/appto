import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { CreditLedgerService } from "@/lib/credit-ledger";
import { CREDIT_DEFAULTS } from "@/lib/credits";
import { DocumentExportService } from "@/lib/document-export";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return apiError("ID do projeto é obrigatório", 400);
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
      return apiError("Projeto não encontrado", 404);
    }

    const model = DocumentExportService.createModel(project);
    const ledger = new CreditLedgerService(db);
    await ledger.charge(
      session.user.id,
      CREDIT_DEFAULTS.exportPdf,
      `Exportação PDF: ${model.title}`,
      { projectId, format: "pdf" }
    );

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
