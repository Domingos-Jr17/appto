import type { AcademicEducationLevel } from "@/types/editor";

export type ReferenceSectionStatus =
  | "AUTO_FILLED"
  | "USER_PROVIDED"
  | "NEEDS_REVIEW"
  | "EMPTY";

export interface ResolvedReferenceSectionData {
  content: string;
  status: ReferenceSectionStatus;
  message: string | null;
  entries: string[];
}

const REFERENCE_REVIEW_NOTICE_PREFIX = "Pendência de revisão manual:";
const PARENTHETICAL_CITATION_PATTERN = /\(([^()]*?(?:19|20)\d{2}[a-z]?[^()]*)\)/giu;
const NARRATIVE_CITATION_PATTERN = /\b([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+)*)\s*\(((?:19|20)\d{2}[a-z]?)\)/gu;

function normalizeReferenceKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function extractInlineCitationKeys(sections?: Array<{ title: string; content: string }>) {
  if (!sections || sections.length === 0) {
    return [];
  }

  const citations = new Set<string>();

  for (const section of sections) {
    for (const match of section.content.matchAll(PARENTHETICAL_CITATION_PATTERN)) {
      const candidate = match[1]?.replace(/\s+/g, " ").trim();
      if (candidate && /(?:19|20)\d{2}/.test(candidate) && /\p{L}/u.test(candidate)) {
        citations.add(candidate);
      }
    }

    for (const match of section.content.matchAll(NARRATIVE_CITATION_PATTERN)) {
      const author = match[1]?.replace(/\s+/g, " ").trim();
      const year = match[2]?.trim();
      if (author && year) {
        citations.add(`${author}, ${year}`);
      }
    }
  }

  return [...citations].sort((left, right) => left.localeCompare(right, "pt"));
}

export function buildReferenceReviewNotice(hasFactualSignals = false, detectedCitations: string[] = []) {
  const baseMessage = hasFactualSignals
    ? `${REFERENCE_REVIEW_NOTICE_PREFIX} o conteúdo gerado contém afirmações factuais e não foi possível confirmar referências verificáveis automaticamente. Adicione e valide fontes reais antes da submissão.`
    : `${REFERENCE_REVIEW_NOTICE_PREFIX} não foi possível confirmar referências verificáveis automaticamente. Adicione e valide fontes reais antes da submissão.`;

  if (detectedCitations.length === 0) {
    return baseMessage;
  }

  return `${baseMessage}\nCitações detectadas no texto:\n${detectedCitations.map((citation) => `- ${citation}`).join("\n")}`;
}

export function isReferenceReviewNotice(content?: string | null) {
  return (content || "").trim().startsWith(REFERENCE_REVIEW_NOTICE_PREFIX);
}

function normalizeReferenceEntry(line: string) {
  return line
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
    .trim();
}

function looksLikeJsonReferencePayload(content: string) {
  const trimmed = content.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]");
}

export function hasReferenceSensitiveSignals(content: string) {
  if (!content.trim()) {
    return false;
  }

  const patterns = [
    /\b(?:19|20)\d{2}\b/u,
    /\b\d+(?:[.,]\d+)?\s*(?:mil|milh(?:a|o)es?|mil milh(?:a|o)es?)\b/iu,
    /\b(?:segundo|de acordo com|conforme)\b/iu,
    /\b(?:teoria|experi[êe]ncia|estudo|cientistas?|pesquisadores?)\b/iu,
    /\([^)]+(?:19|20)\d{2}[^)]*\)/u,
  ];

  const matches = patterns.reduce(
    (count, pattern) => count + (pattern.test(content) ? 1 : 0),
    0,
  );

  return matches >= 2;
}

export function normalizeReferenceEntries(content?: string | null) {
  const trimmed = (content || "").trim();
  if (!trimmed || isReferenceReviewNotice(trimmed) || looksLikeJsonReferencePayload(trimmed)) {
    return [];
  }

  const entries: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of trimmed.split(/\r?\n+/)) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) {
      continue;
    }

    if (normalizeReferenceKey(trimmedLine) === "fontes academicas encontradas automaticamente:") {
      continue;
    }

    const entry = normalizeReferenceEntry(trimmedLine);
    if (!entry) {
      continue;
    }

    const key = normalizeReferenceKey(entry);
    if (!seen.has(key)) {
      seen.add(key);
      entries.push(entry);
    }
  }

  return entries;
}

export function resolveReferenceSectionData(input: {
  educationLevel?: AcademicEducationLevel | null;
  userReferences?: string | null;
  assistedReferences?: string | null;
  generatedSections?: Array<{ title: string; content: string }>;
}): ResolvedReferenceSectionData {
  const userReferences = input.userReferences?.trim() || "";
  const assistedReferences = input.assistedReferences?.trim() || "";

  if (looksLikeJsonReferencePayload(userReferences)) {
    return {
      content: userReferences,
      status: "USER_PROVIDED",
      message: null,
      entries: [],
    };
  }

  const userEntries = normalizeReferenceEntries(userReferences);
  const assistedEntries = normalizeReferenceEntries(assistedReferences);

  if (userEntries.length > 0) {
    const mergedEntries = [...userEntries];
    const seen = new Set(userEntries.map((entry) => normalizeReferenceKey(entry)));

    for (const entry of assistedEntries) {
      const key = normalizeReferenceKey(entry);
      if (!seen.has(key)) {
        seen.add(key);
        mergedEntries.push(entry);
      }
    }

    return {
      content: mergedEntries.join("\n"),
      status: "USER_PROVIDED",
      message: null,
      entries: mergedEntries,
    };
  }

  if (assistedEntries.length > 0) {
    return {
      content: assistedEntries.join("\n"),
      status: "AUTO_FILLED",
      message: null,
      entries: assistedEntries,
    };
  }

  const hasFactualSignals = (input.generatedSections ?? []).some((section) =>
    hasReferenceSensitiveSignals(section.content),
  );
  const detectedCitations = extractInlineCitationKeys(input.generatedSections);
  const message = buildReferenceReviewNotice(hasFactualSignals, detectedCitations);

  return {
    content: message,
    status: "NEEDS_REVIEW",
    message,
    entries: [],
  };
}
