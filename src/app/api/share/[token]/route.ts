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
        { error: "Document not found or link expired" },
        { status: 404 }
      );
    }

    if (sharedDoc.expiresAt && sharedDoc.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
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
    console.error("Error fetching shared document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
