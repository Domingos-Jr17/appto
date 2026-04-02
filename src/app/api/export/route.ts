import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { CreditLedgerService } from "@/lib/credit-ledger";
import { CREDIT_DEFAULTS } from "@/lib/credits";
import { DocumentExportService } from "@/lib/document-export";
import { subscriptionService } from "@/lib/subscription";

async function getExportModel(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      sections: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) {
    throw new Error("Projecto não encontrado");
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

    const model = await getExportModel(projectId, session.user.id);
    const ledger = new CreditLedgerService(db);
    await ledger.charge(
      session.user.id,
      CREDIT_DEFAULTS.exportDocx,
      `Exportação DOCX: ${model.title}`,
      { projectId, format: "docx" }
    );

    const buffer = await DocumentExportService.generateDocx(model);

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
