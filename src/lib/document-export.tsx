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
import { normalizeStoredContent, parseMarkdownBlocks } from "@/lib/content";

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
        content: normalizeStoredContent(section.content ?? ""),
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

      for (const block of parseMarkdownBlocks(section.content)) {
        if (block.type === "heading" && block.text) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: block.text, bold: true, size: 24 })],
              heading: block.level && block.level <= 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
              spacing: { before: 220, after: 120 },
            })
          );
        }

        if (block.type === "paragraph" && block.text) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: block.text, size: 24 })],
              spacing: { after: 200, line: 360 },
              alignment: AlignmentType.JUSTIFIED,
            })
          );
        }

        if (block.type === "quote" && block.text) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: block.text, italics: true, size: 24 })],
              spacing: { after: 180, line: 340 },
              indent: { left: 520 },
            })
          );
        }

        if (block.type === "list" && block.items) {
          for (const item of block.items) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: item, size: 24 })],
                bullet: { level: 0 },
                spacing: { after: 120, line: 320 },
              })
            );
          }
        }
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
              {parseMarkdownBlocks(section.content).map((block, index) => {
                if (block.type === "heading" && block.text) {
                  return (
                    <Text key={`${section.id}-${index}`} style={[pdfStyles.paragraph, { fontSize: 12, fontWeight: 700 }]}>
                      {block.text}
                    </Text>
                  );
                }

                if (block.type === "quote" && block.text) {
                  return (
                    <Text key={`${section.id}-${index}`} style={[pdfStyles.paragraph, { fontStyle: "italic", marginLeft: 12 }]}>
                      {block.text}
                    </Text>
                  );
                }

                if (block.type === "list" && block.items) {
                  return (
                    <View key={`${section.id}-${index}`}>
                      {block.items.map((item, itemIndex) => (
                        <Text key={`${section.id}-${index}-${itemIndex}`} style={pdfStyles.paragraph}>
                          {"• "}{item}
                        </Text>
                      ))}
                    </View>
                  );
                }

                if (block.text) {
                  return (
                    <Text key={`${section.id}-${index}`} style={pdfStyles.paragraph}>
                      {block.text}
                    </Text>
                  );
                }

                return null;
              })}
            </View>
          ))}
        </Page>
      </PdfDocument>
    );
  }
}
