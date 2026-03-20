import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  TableOfContents,
  Footer,
  PageNumber,
  NumberFormat,
} from "docx";

// GET /api/export?projectId=xxx - Export project as DOCX
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "ID do projeto é obrigatório" },
        { status: 400 }
      );
    }

    // Get project with sections
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
      return NextResponse.json(
        { error: "Projeto não encontrado" },
        { status: 404 }
      );
    }

    // Check credits for export
    const userCredits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits || userCredits.balance < 5) {
      return NextResponse.json(
        { error: "Créditos insuficientes para exportar" },
        { status: 400 }
      );
    }

    // Create document sections
    const children: Paragraph[] = [];

    // Cover Page
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: project.title,
            bold: true,
            size: 48,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 4000, after: 400 },
      })
    );

    if (project.description) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: project.description,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Tipo: ${formatProjectType(project.type)}`,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000 },
      })
    );

    // Page break before TOC
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    // Table of Contents
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Índice",
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
      })
    );

    children.push(
      new TableOfContents("Sumário", {
        hyperlink: true,
        headingStyleRange: "1-3",
      })
    );

    // Page break before content
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    // Document sections
    for (const section of project.sections) {
      const isChapter = /^\d+\./.test(section.title);

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: isChapter ? 28 : 24,
            }),
          ],
          heading: isChapter ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      if (section.content) {
        // Split content into paragraphs
        const paragraphs = section.content.split("\n\n");

        for (const para of paragraphs) {
          if (para.trim()) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: para.trim(),
                    size: 24,
                  }),
                ],
                spacing: { after: 200, line: 360 },
                alignment: AlignmentType.JUSTIFIED,
              })
            );
          }
        }
      }
    }

    // Create the document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch = 1440 twips
                right: 1440,
                bottom: 1440,
                left: 1800, // 1.25 inches for binding
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children,
        },
      ],
      numbering: {
        config: [
          {
            reference: "default-numbering",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: 720, hanging: 360 },
                  },
                },
              },
            ],
          },
        ],
      },
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Deduct credits
    await db.$transaction([
      db.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: 5 },
          used: { increment: 5 },
        },
      }),
      db.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -5,
          type: "USAGE",
          description: `Exportação DOCX: ${project.title}`,
          metadata: JSON.stringify({ projectId }),
        },
      }),
    ]);

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${project.title.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}.docx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erro ao exportar documento" },
      { status: 500 }
    );
  }
}

function formatProjectType(type: string): string {
  const types: Record<string, string> = {
    MONOGRAPHY: "Monografia",
    DISSERTATION: "Dissertação",
    THESIS: "Tese",
    ARTICLE: "Artigo Científico",
    ESSAY: "Ensaio",
    REPORT: "Relatório",
  };
  return types[type] || type;
}

// Need to import LevelFormat
import { LevelFormat } from "docx";
