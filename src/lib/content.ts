import TurndownService from "turndown";

const turndown = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  headingStyle: "atx",
  strongDelimiter: "**",
});

export interface MarkdownBlock {
  type: "heading" | "paragraph" | "list" | "quote" | "table";
  text?: string;
  level?: number;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export function isHtmlContent(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function normalizeMarkdown(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeStoredContent(value?: string | null) {
  if (!value) return "";
  const nextValue = isHtmlContent(value) ? turndown.turndown(value) : value;
  return normalizeMarkdown(nextValue);
}

export function markdownToPlainText(markdown: string) {
  return normalizeStoredContent(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~>#]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWordsInMarkdown(markdown?: string | null) {
  const plainText = markdownToPlainText(markdown || "");
  return plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = normalizeStoredContent(markdown).split("\n");
  const blocks: MarkdownBlock[] = [];

  let paragraphBuffer: string[] = [];
  let quoteBuffer: string[] = [];
  let listBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push({
      type: "paragraph",
      text: paragraphBuffer.join(" ").trim(),
    });
    paragraphBuffer = [];
  };

  const flushQuote = () => {
    if (quoteBuffer.length === 0) return;
    blocks.push({
      type: "quote",
      text: quoteBuffer.join(" ").trim(),
    });
    quoteBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push({
      type: "list",
      items: [...listBuffer],
    });
    listBuffer = [];
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.filter((r) => !/^\|?[\s-:|]+\|?[\s-:|]*$/.test(r.trim()));
    if (rows.length >= 2) {
      const parseRow = (row: string) =>
        row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      blocks.push({
        type: "table",
        headers: parseRow(rows[0]),
        rows: rows.slice(1).map(parseRow),
      });
    }
    tableBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushQuote();
      flushList();
      flushTable();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushQuote();
      flushList();
      flushTable();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    if (line.startsWith("|")) {
      flushParagraph();
      flushQuote();
      flushList();
      tableBuffer.push(line);
      continue;
    }

    const listMatch = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      flushQuote();
      flushTable();
      listBuffer.push(listMatch[1].trim());
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      flushTable();
      quoteBuffer.push(quoteMatch[1].trim());
      continue;
    }

    flushQuote();
    flushList();
    flushTable();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushQuote();
  flushList();
  flushTable();

  return blocks;
}
