import { Text, View, Document as PdfDocument, Page, StyleSheet } from "@react-pdf/renderer";
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  TableOfContents,
  TextRun,
} from "docx";

export interface ExportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  level: 1 | 2;
}

export interface ExportDocument {
  title: string;
  description?: string | null;
  type: string;
  sections: ExportSection[];
}

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 11,
    lineHeight: 1.5,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
  },
});

export class DocumentExportService {
  static createModel(project: {
    title: string;
    description?: string | null;
    type: string;
    sections: { id: string; title: string; content: string | null; order: number }[];
  }): ExportDocument {
    return {
      title: project.title,
      description: project.description,
      type: project.type,
      sections: project.sections.map((section) => ({
        id: section.id,
        title: section.title,
        content: section.content ?? "",
        order: section.order,
        level: /^\d+\./.test(section.title) ? 1 : 2,
      })),
    };
  }

  static async generateDocx(model: ExportDocument) {
    const children: (Paragraph | TableOfContents)[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: model.title,
            bold: true,
            size: 48,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 3000, after: 400 },
      }),
    ];

    if (model.description) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: model.description, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Índice", bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
      })
    );
    children.push(
      new TableOfContents("Sumário", {
        hyperlink: true,
        headingStyleRange: "1-3",
      })
    );
    children.push(new Paragraph({ children: [new PageBreak()] }));

    for (const section of model.sections) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: section.level === 1 ? 28 : 24,
            }),
          ],
          heading: section.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 160 },
        })
      );

      for (const paragraph of section.content.split(/\n{2,}/).filter(Boolean)) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: paragraph.trim(), size: 24 })],
            spacing: { after: 200, line: 360 },
            alignment: AlignmentType.JUSTIFIED,
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [new TextRun({ children: [PageNumber.CURRENT] })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children,
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  static createPdfComponent(model: ExportDocument) {
    return (
      <PdfDocument>
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.title}>{model.title}</Text>
          {model.description ? <Text style={pdfStyles.paragraph}>{model.description}</Text> : null}
          {model.sections.map((section) => (
            <View key={section.id}>
              <Text style={pdfStyles.sectionTitle}>{section.title}</Text>
              {section.content.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
                <Text key={`${section.id}-${index}`} style={pdfStyles.paragraph}>
                  {paragraph.trim()}
                </Text>
              ))}
            </View>
          ))}
        </Page>
      </PdfDocument>
    );
  }
}
