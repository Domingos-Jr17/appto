import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DocumentExportService } from "@/lib/document-export";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {

    const sharedDoc = await db.sharedDocument.findUnique({
      where: { token },
      include: {
        project: {
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
        },
      },
    });

    if (!sharedDoc || !sharedDoc.isActive) {
      return NextResponse.json(
        { error: "Documento não encontrado ou link expirado" },
        { status: 404 }
      );
    }

    if (sharedDoc.expiresAt && sharedDoc.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Este link de partilha expirou" },
        { status: 410 }
      );
    }

    await db.sharedDocument.update({
      where: { id: sharedDoc.id },
      data: {
        views: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    const exportModel = DocumentExportService.createModel(sharedDoc.project);

    return NextResponse.json({
      success: true,
      data: {
        title: exportModel.title,
        type: exportModel.type,
        description: exportModel.description,
        brief: exportModel.brief,
        sections: exportModel.sections,
        frontMatterSections: exportModel.frontMatterSections,
        references: exportModel.references,
        profile: exportModel.profile,
        sharedAt: sharedDoc.createdAt,
        views: sharedDoc.views + 1,
      },
    });
  } catch (error) {
    console.error("Erro ao obter documento partilhado:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
