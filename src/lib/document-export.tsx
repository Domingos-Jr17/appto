import { Text, View, Document as PdfDocument, Page, StyleSheet } from "@react-pdf/renderer";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  SectionType,
  TextRun,
} from "docx";
import { normalizeStoredContent, parseMarkdownBlocks } from "@/lib/content";
import {
  isFrontMatterDocumentSectionTitle,
  resolveDocumentCourseLabel,
  resolveDocumentInstitutionName,
  resolveDocumentProfile,
  type DocumentProfile,
} from "@/lib/document-profile";
import { formatProjectType } from "@/lib/generation/work-generation-artifacts";
import { isReferenceReviewNotice } from "@/lib/reference-section";
import type { ReferenceData } from "@/types/editor";

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
  profile: DocumentProfile;
  brief?: {
    institutionName?: string | null;
    studentName?: string | null;
    advisorName?: string | null;
    courseName?: string | null;
    subjectName?: string | null;
    facultyName?: string | null;
    departmentName?: string | null;
    className?: string | null;
    turma?: string | null;
    coverTemplate?: string | null;
    city?: string | null;
    academicYear?: number | null;
    educationLevel?: string | null;
    studentNumber?: string | null;
    semester?: string | null;
  };
  frontMatterSections: ExportSection[];
  sections: ExportSection[];
  references: {
    status: "AUTO_FILLED" | "USER_PROVIDED" | "NEEDS_REVIEW" | "EMPTY";
    content: string;
  };
}

export interface StaticSummaryEntry {
  title: string;
  level: 1 | 2 | 3;
}

export function getAbntChecklist(template: string | null | undefined) {
  const resolvedTemplate = template || "ABNT_GENERIC";
  const baseItems = [
    "Margens: 3 cm superior/esquerda e 2 cm inferior/direita.",
    "Fonte principal Arial 12 com alinhamento justificado.",
    "Espaçamento 1.5 e recuo de 1,25 cm na primeira linha.",
    "Citações longas com recuo ampliado e fonte menor.",
    "Sumário visível com títulos hierárquicos coerentes.",
    "Referências ordenadas alfabeticamente por autor.",
  ];

  const templateItems: Record<string, string[]> = {
    UEM_STANDARD: [
      "Capa com Universidade Eduardo Mondlane no topo e autor centralizado.",
      "Linha de orientador e curso explícitos na capa.",
    ],
    UP: [
      "Capa com Universidade Pedagógica e curso em destaque institucional.",
      "Estrutura visual centrada para monografias e relatórios pedagógicos.",
    ],
    UDM: [
      "Capa com Universidade de Moçambique e metadados de faculdade/departamento.",
      "Bloco de autoria e orientação alinhado ao padrão institucional.",
    ],
    SCHOOL_MOZ: [
      "Cabeçalho da República de Moçambique e escola secundária.",
      "Classe e turma visíveis quando informadas.",
    ],
    DISCIPLINARY_MOZ: [
      "Curso técnico e disciplina evidenciados na capa.",
      "Metadados práticos do ensino técnico destacados no topo.",
    ],
    ABNT_GENERIC: [
      "Capa académica genérica compatível com exigências ABNT base.",
    ],
  };

  return {
    template: resolvedTemplate,
    items: [...baseItems, ...(templateItems[resolvedTemplate] || templateItems.ABNT_GENERIC)],
  };
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
    textAlign: "center",
  },
  coverMeta: {
    fontSize: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: "justify",
  },
  reference: {
    marginBottom: 6,
    textAlign: "left",
  },
});

function normalizeHeadingForComparison(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^#+\s*/, "")
    .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isFrontMatterSectionTitle(title: string) {
  return isFrontMatterDocumentSectionTitle(title);
}

export function stripLeadingDuplicateHeading(content: string, sectionTitle: string) {
  const normalized = normalizeStoredContent(content);
  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n");
  while (lines[0]?.trim() === "") {
    lines.shift();
  }

  const firstLine = lines[0]?.trim();
  if (firstLine) {
    const cleanFirstLine = firstLine.replace(/^#+\s*/, "").trim();
    const normalizedSection = normalizeHeadingForComparison(sectionTitle);
    const firstLineMatches = normalizeHeadingForComparison(cleanFirstLine) === normalizedSection;

    if (firstLineMatches) {
      lines.shift();
      while (lines[0]?.trim() === "") {
        lines.shift();
      }
      return lines.join("\n").trim();
    }
  }

  return normalized;
}

interface InlineMarkdownSegment {
  text: string;
  bold?: boolean;
  italics?: boolean;
}

function sanitizeInlinePlainText(value: string) {
  return value.replace(/\*\*|__|\*|_/g, "");
}

function parseInlineMarkdownSegments(text: string): InlineMarkdownSegment[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  const segments: InlineMarkdownSegment[] = [];
  let lastIndex = 0;

  for (const match of normalized.matchAll(pattern)) {
    const token = match[0];
    const tokenIndex = match.index ?? 0;

    if (tokenIndex > lastIndex) {
      const plainText = sanitizeInlinePlainText(normalized.slice(lastIndex, tokenIndex));
      if (plainText) {
        segments.push({ text: plainText });
      }
    }

    const innerText = token.slice(token.startsWith("**") || token.startsWith("__") ? 2 : 1, token.endsWith("**") || token.endsWith("__") ? -2 : -1);
    if (innerText) {
      const isBoldToken = token.startsWith("**") || token.startsWith("__");
      segments.push({
        text: innerText,
        bold: isBoldToken,
        italics: !isBoldToken && (token.startsWith("*") || token.startsWith("_")),
      });
    }
    lastIndex = tokenIndex + token.length;
  }

  if (lastIndex < normalized.length) {
    const trailingText = sanitizeInlinePlainText(normalized.slice(lastIndex));
    if (trailingText) {
      segments.push({ text: trailingText });
    }
  }

  if (segments.length === 0) {
    return [{ text: sanitizeInlinePlainText(normalized) }];
  }

  return segments;
}

function buildInlineTextRuns(
  text: string,
  options: { size: number; font: string; bold?: boolean; italics?: boolean },
) {
  return parseInlineMarkdownSegments(text).map(
    (segment) =>
      new TextRun({
        text: segment.text,
        size: options.size,
        font: options.font,
        bold: options.bold || segment.bold || false,
        italics: options.italics || segment.italics || false,
      }),
  );
}

function renderPdfCover(model: ExportDocument) {
  const template = model.brief?.coverTemplate || "ABNT_GENERIC";
  const institution = model.brief?.institutionName || "Instituição";
  const author = model.brief?.studentName || "Autor";
  const cityYear = [model.brief?.city || "Maputo", model.brief?.academicYear].filter(Boolean).join(", ");
  const courseLine = model.brief?.courseName || model.brief?.subjectName || model.type;

  const lines =
    template === "SCHOOL_MOZ"
      ? [
          "República de Moçambique",
          institution,
          [model.brief?.className, model.brief?.turma ? `Turma ${model.brief.turma}` : null].filter(Boolean).join(" - "),
          courseLine,
          model.title,
          author,
          model.brief?.advisorName ? `${model.profile.coverFieldPolicy.advisorLabel}: ${model.brief.advisorName}` : "",
          cityYear,
        ]
      : template === "UEM_STANDARD"
        ? ["Universidade Eduardo Mondlane", model.brief?.facultyName || institution, courseLine, author, model.title, cityYear]
        : template === "UP"
          ? ["Universidade Pedagógica", courseLine, author, model.title, cityYear]
          : template === "UDM"
            ? ["Universidade de Moçambique", model.brief?.facultyName || courseLine, model.brief?.departmentName || "", author, model.title, cityYear]
            : template === "DISCIPLINARY_MOZ"
              ? [
                  institution,
                  model.brief?.departmentName || courseLine,
                  model.brief?.subjectName || "",
                  model.title,
                  model.type,
                  author,
                  model.brief?.advisorName ? `${model.profile.coverFieldPolicy.advisorLabel}: ${model.brief.advisorName}` : "",
                  cityYear,
                ]
              : [institution, courseLine, author, model.title, cityYear];

  return lines
    .filter(Boolean)
    .map((line, index) => (
      <Text key={`${template}-${index}`} style={index === lines.filter(Boolean).length - 2 ? pdfStyles.title : pdfStyles.coverMeta}>
        {line}
      </Text>
    ));
}

function toDisplayText(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeAuthor(value?: string) {
  return toDisplayText(value).replace(/\s+/g, " ");
}

export function formatReferenceEntry(reference: Partial<ReferenceData>) {
  const authors = normalizeAuthor(reference.authors) || "Autor não informado";
  const title = toDisplayText(reference.title) || "Título não informado";
  const year = toDisplayText(reference.year) || "s.d.";

  switch (reference.type) {
    case "article":
      return [
        `${authors}. ${title}.`,
        reference.journal ? `${reference.journal}.` : "",
        reference.volume ? `v. ${reference.volume}.` : "",
        reference.pages ? `p. ${reference.pages}.` : "",
        year + ".",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    case "website":
      return [
        `${authors}. ${title}.`,
        reference.url ? `Disponível em: ${reference.url}.` : "",
        reference.accessDate ? `Acesso em: ${reference.accessDate}.` : "",
        year + ".",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    case "thesis":
      return [
        `${authors}. ${title}.`,
        year + ".",
        reference.publisher ? `${reference.publisher}.` : "Tese/Dissertação.",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    case "book":
    default:
      return [
        `${authors}. ${title}.`,
        reference.publisher ? `${reference.publisher}.` : "",
        year + ".",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
  }
}

export function parseReferenceEntries(content: string) {
  const normalized = normalizeStoredContent(content);
  if (!normalized || isReferenceReviewNotice(normalized)) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized) as ReferenceData[];
    if (Array.isArray(parsed)) {
      return parsed
        .map(formatReferenceEntry)
        .sort((left, right) => left.localeCompare(right, "pt"));
    }
  } catch {
    // fall through to plain-text parsing
  }

  return normalized
    .split(/\n+/)
    .map((entry) => entry.replace(/^[-*+]\s*/, "").trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt"));
}

function getMarkdownHeadingLevel(blockLevel?: number, title?: string): 2 | 3 | null {
  if (blockLevel && blockLevel >= 3) {
    return 3;
  }

  if (blockLevel === 2) {
    return 2;
  }

  if (title && /^\d+\.\d+\.\d+/.test(title)) {
    return 3;
  }

  if (title && /^\d+\.\d+/.test(title)) {
    return 2;
  }

  return null;
}

export function buildStaticSummaryEntries(model: Pick<ExportDocument, "frontMatterSections" | "sections">) {
  const entries: StaticSummaryEntry[] = [];

  for (const section of model.frontMatterSections) {
    entries.push({ title: section.title, level: 1 });
  }

  for (const section of model.sections) {
    entries.push({ title: section.title, level: 1 });

    for (const block of parseMarkdownBlocks(section.content)) {
      if (block.type !== "heading" || !block.text) {
        continue;
      }

      if (normalizeHeadingForComparison(block.text) === normalizeHeadingForComparison(section.title)) {
        continue;
      }

      const level = getMarkdownHeadingLevel(block.level, block.text);
      if (!level) {
        continue;
      }

      entries.push({ title: block.text, level });
    }
  }

  return entries;
}

function buildCoverParagraphs(model: ExportDocument) {
  const template = model.profile.coverTemplate;
  const institution = resolveDocumentInstitutionName(model.profile, model.brief);
  const author = model.brief?.studentName || "Nome do Autor";
  const courseLine = resolveDocumentCourseLabel(model.profile, model.brief);
  const cityYear = [model.brief?.city || "Maputo", model.brief?.academicYear].filter(Boolean).join(", ");
  const typeLabel = formatProjectType(model.profile.projectType);

  if (template === "UEM_STANDARD") {
    return [
      new Paragraph({
        children: [new TextRun({ text: institution.toUpperCase(), size: 24, font: "Arial", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.facultyName || courseLine, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: courseLine, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: author, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.title.toUpperCase(), bold: true, size: 28, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: typeLabel, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.advisorName ? `${model.profile.coverFieldPolicy.advisorLabel}: ${model.brief.advisorName}` : "", size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1600, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: cityYear, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 200 },
      }),
    ];
  }

  if (template === "UP") {
    return [
      new Paragraph({
        children: [new TextRun({ text: "UNIVERSIDADE PEDAGÓGICA", size: 24, font: "Arial", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: courseLine, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1800 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.title.toUpperCase(), bold: true, size: 28, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: author, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1800, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.advisorName ? `Supervisor: ${model.brief.advisorName}` : "", size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: cityYear, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 4400, after: 200 },
      }),
    ];
  }

  if (template === "UDM") {
    return [
      new Paragraph({
        children: [new TextRun({ text: "UNIVERSIDADE DE MOÇAMBIQUE", size: 24, font: "Arial", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.facultyName || courseLine, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.departmentName || "", size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: author, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.title.toUpperCase(), bold: true, size: 28, font: "Arial" })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.advisorName ? `Orientador: ${model.brief.advisorName}` : "", size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1800 },
      }),
      new Paragraph({
        children: [new TextRun({ text: cityYear, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 4200, after: 200 },
      }),
    ];
  }

  if (template === "SCHOOL_MOZ") {
    return [
      new Paragraph({
        children: [new TextRun({ text: "República de Moçambique", size: 24, font: "Arial", bold: true })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: institution, size: 24, font: "Arial", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: [model.brief?.className, model.brief?.turma ? `Turma ${model.brief?.turma}` : null]
              .filter(Boolean)
              .join(" - "),
            size: 24,
            font: "Arial",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.title.toUpperCase(), bold: true, size: 28, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [new TextRun({ text: courseLine, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: author, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: model.brief?.advisorName
              ? `${model.profile.coverFieldPolicy.advisorLabel}: ${model.brief.advisorName}`
              : "",
            size: 24,
            font: "Arial",
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: cityYear, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 4200, after: 200 },
      }),
    ];
  }

  if (template === "DISCIPLINARY_MOZ") {
    return [
      new Paragraph({
        children: [new TextRun({ text: institution, size: 24, font: "Arial", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.departmentName || courseLine, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.brief?.subjectName || "Disciplina técnica", size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.title.toUpperCase(), bold: true, size: 28, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: model.type, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: author, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: model.brief?.advisorName
              ? `${model.profile.coverFieldPolicy.advisorLabel}: ${model.brief.advisorName}`
              : "",
            size: 24,
            font: "Arial",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: cityYear, size: 24, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 4200, after: 200 },
      }),
    ];
  }

  return [
    new Paragraph({
      children: [new TextRun({ text: institution, size: 24, font: "Arial", bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: courseLine, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: author, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: model.title.toUpperCase(), bold: true, size: 28, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: model.type, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: model.brief?.advisorName ? `Orientador: ${model.brief.advisorName}` : "", size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: cityYear, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 4200, after: 200 },
    }),
  ];
}

function buildTitlePageParagraphs(model: ExportDocument) {
  const institution = resolveDocumentInstitutionName(model.profile, model.brief).toUpperCase();
  const title = model.title.toUpperCase();
  const subtitle = resolveDocumentCourseLabel(model.profile, model.brief);
  const student = model.brief?.studentName || "Nome do Autor";
  const advisor = model.brief?.advisorName;
  const cityYear = [model.brief?.city || "Maputo", model.brief?.academicYear].filter(Boolean).join(", ");
  const typeLabel = formatProjectType(model.profile.projectType);

  return [
    new Paragraph({
      children: [new TextRun({ text: institution, size: 24, font: "Arial", bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: subtitle, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1800 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, size: 28, font: "Arial", bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: typeLabel, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1800 },
    }),
    new Paragraph({
      children: [new TextRun({ text: student, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: advisor ? `${model.profile.coverFieldPolicy.advisorLabel}: ${advisor}` : "", size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: cityYear, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 4200, after: 200 },
    }),
  ];
}

export class DocumentExportService {
  static createModel(project: {
    title: string;
    description?: string | null;
    type: string;
    brief?: {
      institutionName?: string | null;
      studentName?: string | null;
      advisorName?: string | null;
      courseName?: string | null;
      subjectName?: string | null;
      facultyName?: string | null;
      departmentName?: string | null;
      className?: string | null;
      turma?: string | null;
      coverTemplate?: string | null;
      city?: string | null;
      academicYear?: number | null;
      educationLevel?: string | null;
      studentNumber?: string | null;
      semester?: string | null;
    } | null;
    sections: { id: string; title: string; content: string | null; order: number }[];
  }): ExportDocument {
    const profile = resolveDocumentProfile({
      type: project.type,
      educationLevel: project.brief?.educationLevel,
      institutionName: project.brief?.institutionName,
      coverTemplate: project.brief?.coverTemplate,
    });
    const frontMatterSections = project.sections
      .filter(
        (section) =>
          isFrontMatterSectionTitle(section.title) &&
          !["Capa", "Folha de Rosto", "Índice", "Sumário"].includes(section.title),
      )
      .map((section) => ({
        id: section.id,
        title: section.title,
        content: stripLeadingDuplicateHeading(section.content ?? "", section.title),
        order: section.order,
        level: 1 as const,
      }));

    return {
      title: project.title,
      description: project.description,
      type: formatProjectType(profile.projectType),
      profile,
      brief: {
        ...project.brief,
        coverTemplate: profile.coverTemplate,
      },
      frontMatterSections,
      sections: project.sections
        .filter((section) => !isFrontMatterSectionTitle(section.title))
        .map((section) => ({
          id: section.id,
          title: section.title,
          content: stripLeadingDuplicateHeading(section.content ?? "", section.title),
          order: section.order,
          level: /^\d+\./.test(section.title) ? 1 : 2,
        })),
      references: (() => {
        const referenceSection = project.sections.find((section) => /refer[eê]ncias/i.test(section.title));
        const referenceContent = stripLeadingDuplicateHeading(
          referenceSection?.content ?? "",
          referenceSection?.title ?? "Referências",
        );

        if (!referenceContent) {
          return {
            status: "EMPTY" as const,
            content: "",
          };
        }

        if (isReferenceReviewNotice(referenceContent)) {
          return {
            status: "NEEDS_REVIEW" as const,
            content: referenceContent,
          };
        }

        return {
          status: "USER_PROVIDED" as const,
          content: referenceContent,
        };
      })(),
    };
  }

  static async generateDocx(model: ExportDocument) {
    const coverChildren = [...buildCoverParagraphs(model)];
    if (model.profile.frontMatterPolicy.includeTitlePage) {
      coverChildren.push(new Paragraph({ children: [new PageBreak()] }));
      coverChildren.push(...buildTitlePageParagraphs(model));
    }
    coverChildren.push(new Paragraph({ children: [new PageBreak()] }));

    const bodyChildren: Paragraph[] = [];
    let isFirstFrontMatter = true;

    for (const section of model.frontMatterSections) {
      bodyChildren.push(
        new Paragraph({
          children: buildInlineTextRuns(section.title, {
            bold: true,
            size: 28,
            font: "Arial",
          }),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: isFirstFrontMatter ? 0 : 720, after: 160 },
        }),
      );
      isFirstFrontMatter = false;

      for (const block of parseMarkdownBlocks(section.content)) {
        if (block.type === "paragraph" && block.text) {
          bodyChildren.push(
            new Paragraph({
              children: buildInlineTextRuns(block.text, { size: 24, font: "Arial" }),
              spacing: { after: 200, line: 360 },
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 709 },
            }),
          );
        }
      }

      bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (model.profile.frontMatterPolicy.includeAutomaticTableOfContents) {
      bodyChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "ÍNDICE", bold: true, size: 28, font: "Arial" })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 0, after: 200 },
        })
      );

      for (const entry of buildStaticSummaryEntries(model)) {
        bodyChildren.push(
          new Paragraph({
            children: buildInlineTextRuns(entry.title, { size: 24, font: "Arial" }),
            spacing: { after: 120, line: 280 },
            indent: entry.level === 1 ? undefined : { left: entry.level === 2 ? 360 : 720 },
          })
        );
      }

      bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    for (const section of model.sections) {
      const isReferenceSection = /refer[eê]ncias/i.test(section.title);

      bodyChildren.push(
        new Paragraph({
          children: buildInlineTextRuns(section.title, {
            bold: true,
            size: section.level === 1 ? 28 : 24,
            font: "Arial",
          }),
          heading: section.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 160 },
        })
      );

      if (isReferenceSection) {
        if (model.references.status === "NEEDS_REVIEW") {
          for (const block of parseMarkdownBlocks(model.references.content)) {
            if (!block.text) {
              continue;
            }

            bodyChildren.push(
              new Paragraph({
                children: buildInlineTextRuns(block.text, { size: 24, font: "Arial" }),
                spacing: { after: 200, line: 360 },
                alignment: AlignmentType.LEFT,
              }),
            );
          }
        } else {
          const entries = parseReferenceEntries(section.content);
          for (const entry of entries) {
            bodyChildren.push(
              new Paragraph({
                children: buildInlineTextRuns(entry, { size: 24, font: "Arial" }),
                spacing: { after: 120, line: 280 },
                alignment: AlignmentType.LEFT,
              }),
            );
          }
        }
        continue;
      }

      for (const block of parseMarkdownBlocks(section.content)) {
        if (block.type === "heading" && block.text) {
          // Detect hierarchical numbering: 1.1.1 (HEADING_3), 1.1 (HEADING_2), other (HEADING_2 fallback)
          const isSubSubheading = /^\d+\.\d+\.\d+/.test(block.text);
          const isSubheading = /^\d+\.\d+/.test(block.text);

          let headingLevel: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3;
          let fontSize: number;

          if (isSubSubheading) {
            headingLevel = HeadingLevel.HEADING_3;
            fontSize = 24; // 12pt
          } else if (isSubheading) {
            headingLevel = HeadingLevel.HEADING_2;
            fontSize = 24; // 12pt
          } else {
            headingLevel = HeadingLevel.HEADING_1;
            fontSize = 28; // 14pt
          }

          bodyChildren.push(
            new Paragraph({
              children: buildInlineTextRuns(block.text, {
                bold: true,
                size: fontSize,
                font: "Arial",
              }),
              heading: headingLevel,
              spacing: { before: isSubheading ? 220 : 120, after: 120 },
            })
          );
        }

        if (block.type === "paragraph" && block.text) {
          bodyChildren.push(
            new Paragraph({
              children: buildInlineTextRuns(block.text, { size: 24, font: "Arial" }),
              spacing: { after: 200, line: 360 },
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 709 },
            })
          );
        }

        if (block.type === "quote" && block.text) {
          bodyChildren.push(
            new Paragraph({
              children: buildInlineTextRuns(block.text, {
                size: 20,
                font: "Arial",
                italics: true,
              }),
              spacing: { after: 180, line: 240 },
              indent: { left: 2268 },
            })
          );
        }

        if (block.type === "list" && block.items) {
          for (const item of block.items) {
            bodyChildren.push(
              new Paragraph({
                children: buildInlineTextRuns(item, { size: 24, font: "Arial" }),
                bullet: { level: 0 },
                spacing: { after: 120, line: 320 },
                indent: { firstLine: 709 },
              })
            );
          }
        }
      }
    }

    const pageMargins = {
      top: 1701,
      right: 1134,
      bottom: 1134,
      left: 1701,
    };

    const doc = new Document({
      sections: [
        // Section 1: Cover page (no page number, titlePage resets counter)
        {
          properties: {
            type: SectionType.CONTINUOUS,
            page: { margin: pageMargins },
          },
          headers: {
            default: new Header({ children: [] }),
          },
          footers: {
            default: new Footer({ children: [] }),
          },
          children: coverChildren,
        },
        // Section 2: Main content with page numbers at bottom-right
        {
          properties: {
            page: {
              margin: pageMargins,
            },
          },
          headers: {
            default: new Header({ children: [] }),
            first: new Header({ children: [] }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: 20 })],
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 0 },
                }),
              ],
            }),
            first: new Footer({ children: [] }),
          },
          children: bodyChildren,
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  static createPdfComponent(model: ExportDocument) {
    return (
      <PdfDocument>
        <Page size="A4" style={pdfStyles.page}>
          {renderPdfCover(model)}
          {model.description ? <Text style={pdfStyles.paragraph}>{model.description}</Text> : null}
          {model.frontMatterSections.map((section) => (
            <View key={`front-${section.id}`}>
              <Text style={pdfStyles.sectionTitle}>{section.title}</Text>
              {parseMarkdownBlocks(section.content).map((block, index) =>
                block.text ? (
                  <Text key={`front-${section.id}-${index}`} style={pdfStyles.paragraph}>
                    {block.text}
                  </Text>
                ) : null,
              )}
            </View>
          ))}
          {model.sections.map((section) => {
            return (
            <View key={section.id}>
              <Text style={pdfStyles.sectionTitle}>{section.title}</Text>
              {/refer[eê]ncias/i.test(section.title)
                ? parseReferenceEntries(section.content).map((entry, index) => (
                    <Text key={`${section.id}-${index}`} style={pdfStyles.reference}>
                      {entry}
                    </Text>
                  ))
                : null}
              {/refer[eê]ncias/i.test(section.title)
                ? null
                : parseMarkdownBlocks(section.content).map((block, index) => {
                if (block.type === "heading" && block.text) {
                  const isSubSubheading = /^\d+\.\d+\.\d+/.test(block.text);
                  const isSubheading = /^\d+\.\d+/.test(block.text);
                  const fontSize = isSubheading ? 11 : 13;
                  const marginLeft = isSubSubheading ? 16 : isSubheading ? 8 : 0;
                  return (
                    <Text key={`${section.id}-${index}`} style={[pdfStyles.paragraph, { fontSize, fontWeight: 700, marginLeft }]}>
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
            );
          })}
          {/* Page number at bottom-right, hidden on cover and folha de rosto */}
          <Text
            style={{
              position: "absolute",
              bottom: 30,
              right: 48,
              fontSize: 10,
              fontFamily: "Times New Roman",
            }}
            render={({ pageNumber }) => (pageNumber > 2 ? String(pageNumber - 2) : "")}
          />
        </Page>
      </PdfDocument>
    );
  }
}
