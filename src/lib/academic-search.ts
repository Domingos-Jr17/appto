/**
 * Pesquisa fontes académicas reais via Semantic Scholar
 * para enriquecer a secção de referências.
 */

import type { ReferenceData } from "@/types/editor";

const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1";
const DEFAULT_TIMEOUT_MS = 4000;
const MAX_RETRIES = 1;
const GENERIC_THEME_WORDS = new Set([
  "tema",
  "trabalho",
  "secção",
  "seccao",
  "estudo",
  "análise",
  "analise",
  "introdução",
  "introducao",
  "desenvolvimento",
  "conclusão",
  "conclusao",
  "contexto",
  "conceito",
  "conceitos",
  "importância",
  "importancia",
  "características",
  "caracteristicas",
]);
const PORTUGUESE_STOPWORDS = new Set([
  "a", "o", "os", "as", "de", "do", "da", "dos", "das", "e", "em", "no", "na", "nos", "nas",
  "por", "para", "com", "sem", "um", "uma", "uns", "umas", "que", "como", "sobre", "entre",
  "mais", "menos", "muito", "muita", "muitos", "muitas", "ser", "estar", "foi", "são", "sao",
  "ao", "aos", "à", "às", "ou", "se", "sua", "seu", "suas", "seus", "lhe", "lhes", "dos",
]);

export interface ScholarResult {
  title: string;
  authors: string;
  year: number | null;
  citationCount: number;
  url: string | null;
  abstract: string | null;
  doi: string | null;
  venue: string | null;
  paperId: string | null;
}

function tokenizeRelevantTerms(value: string, minLength = 5) {
  return normalizeTitleKey(value)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength)
    .filter((token) => !PORTUGUESE_STOPWORDS.has(token))
    .filter((token) => !GENERIC_THEME_WORDS.has(token));
}

function buildSemanticContext(input: {
  theme: string;
  generatedSections?: Array<{ title: string; content: string }>;
}) {
  const themeKeywords = [...new Set(tokenizeRelevantTerms(input.theme, 4))];
  const counts = new Map<string, number>();

  for (const section of input.generatedSections ?? []) {
    for (const token of tokenizeRelevantTerms(`${section.title} ${section.content}`)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  const contextKeywords = [...counts.entries()]
    .filter(([token]) => !themeKeywords.includes(token))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([token]) => token);

  return { themeKeywords, contextKeywords };
}

function scoreSemanticRelevance(
  source: ScholarResult,
  context: ReturnType<typeof buildSemanticContext>,
) {
  const titleText = normalizeTitleKey(source.title);
  const corpus = normalizeTitleKey([source.title, source.venue, source.abstract].filter(Boolean).join(" "));
  const titleMatches = context.themeKeywords.filter((keyword) => titleText.includes(keyword)).length;
  const contextMatches = context.contextKeywords.filter((keyword) => corpus.includes(keyword)).length;

  return {
    titleMatches,
    contextMatches,
    score: titleMatches * 2 + contextMatches * 3,
  };
}

function normalizePersonToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleKey(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeReferenceKey(ref: string): string {
  return ref
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function extractTitleFromReference(ref: string): string | null {
  const parts = ref.split(".").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const potentialTitle = parts[1] || parts[0];
    return potentialTitle.length > 10 ? potentialTitle : null;
  }
  return null;
}

function splitCitationAuthors(value: string) {
  return value
    .split(/[;,]|\be\b/iu)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((author) => normalizePersonToken(author).split(" ").filter(Boolean).pop() || "")
    .filter(Boolean);
}

function parseCitationKey(citationKey: string) {
  const match = citationKey.match(/^(.*?)(?:,\s*((?:19|20)\d{2}[a-z]?))$/i);
  if (!match) {
    return {
      authors: splitCitationAuthors(citationKey),
      year: null,
    };
  }

  return {
    authors: splitCitationAuthors(match[1] || ""),
    year: (match[2] || "").toLowerCase(),
  };
}

function buildScholarResultKey(source: ScholarResult) {
  return source.doi?.toLowerCase()
    || source.paperId?.toLowerCase()
    || normalizeTitleKey(source.title);
}

function scoreScholarResultForCitation(source: ScholarResult, citationKey: string) {
  const citation = parseCitationKey(citationKey);
  const normalizedAuthors = normalizePersonToken(source.authors);
  const year = source.year ? String(source.year).toLowerCase() : null;
  let score = 0;

  if (citation.year && year === citation.year.replace(/[a-z]$/i, "")) {
    score += 3;
  }

  const matchedAuthors = citation.authors.filter((author) => normalizedAuthors.includes(author)).length;
  score += matchedAuthors * 2;

  const titleMatch = normalizeTitleKey(source.title).includes(normalizeTitleKey(citationKey));
  if (titleMatch) {
    score += 1;
  }

  return {
    score,
    matchedAuthors,
    titleMatch,
  };
}

function toReferenceData(source: ScholarResult): ReferenceData {
  return {
    type: source.venue ? "article" : source.url ? "website" : "article",
    authors: source.authors,
    title: source.title,
    year: source.year ? String(source.year) : "s.d.",
    journal: source.venue || undefined,
    publisher: source.venue || undefined,
    url: source.url || undefined,
  };
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "aptto-academic-generator/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function searchAcademicSourcesWithRetry(
  query: string,
  limit: number
): Promise<ScholarResult[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timeoutMs = attempt === 0 ? DEFAULT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS * 1.5;
      const response = await fetchWithTimeout(
        `${SEMANTIC_SCHOLAR_API}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,citationCount,abstract,externalIds,venue,paperId`,
        timeoutMs
      );

      if (response.status === 429) {
        console.warn("[academic-search] Rate limited");
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return [];
      }

      if (!response.ok) {
        console.error(`[academic-search] API error: ${response.status}`);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        return [];
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      const seenDoi = new Set<string>();
      const seenPaperId = new Set<string>();
      const seenTitle = new Set<string>();

      return data.data
        .filter((paper: any) => paper.title && Array.isArray(paper.authors) && paper.authors.length > 0)
        .slice(0, limit)
        .map((paper: any) => ({
          title: paper.title,
          authors: paper.authors
            .slice(0, 3)
            .map((author: any) => author.name)
            .filter(Boolean)
            .join(", "),
          year: typeof paper.year === "number" ? paper.year : null,
          citationCount: paper.citationCount || 0,
          url: paper.externalIds?.DOI
            ? `https://doi.org/${paper.externalIds.DOI}`
            : paper.externalIds?.URL || null,
          abstract: paper.abstract || null,
          doi: paper.externalIds?.DOI || null,
          venue: paper.venue || null,
          paperId: paper.paperId || null,
        }))
        .filter((paper: ScholarResult) => {
          if (paper.doi) {
            const doiKey = paper.doi.toLowerCase();
            if (seenDoi.has(doiKey)) return false;
            seenDoi.add(doiKey);
            return true;
          }

          if (paper.paperId) {
            const pidKey = paper.paperId.toLowerCase();
            if (seenPaperId.has(pidKey)) return false;
            seenPaperId.add(pidKey);
            return true;
          }

          const titleKey = normalizeTitleKey(paper.title);
          if (!titleKey || seenTitle.has(titleKey)) return false;
          seenTitle.add(titleKey);
          return true;
        });

    } catch (error) {
      lastError = error as Error;
      console.warn(`[academic-search] Attempt ${attempt + 1} failed: ${error}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  console.error("[academic-search] All retries exhausted", lastError);
  return [];
}

export async function searchAcademicSources(
  query: string,
  limit = 8,
  _existingReferences: string = ""
): Promise<ScholarResult[]> {
  return searchAcademicSourcesWithRetry(query, limit);
}

export function formatReferencesForPrompt(sources: ScholarResult[]): string {
  if (sources.length === 0) {
    return "";
  }

  return sources
    .map((source) => {
      const firstAuthor = source.authors.split(",")[0]?.split(" ").pop() || "AUTOR";
      const year = source.year || "s.d.";
      const title = source.title;
      const venue = source.venue ? `. ${source.venue}` : "";
      const url = source.url ? ` Disponível em: ${source.url}.` : "";

      return `${firstAuthor.toUpperCase()}, ${year}. ${title}${venue}.${url}`.trim();
    })
    .join("\n");
}

export async function enrichReferencesWithAcademicSources(
  theme: string,
  existingReferences = "",
  maxSources = 6,
): Promise<string> {
  if (existingReferences.trim()) {
    const existingKeys = new Set<string>();
    existingReferences.split("\n").forEach((ref) => {
      const key = normalizeReferenceKey(ref);
      if (key) existingKeys.add(key);
    });

    const sources = await searchAcademicSourcesWithRetry(theme, maxSources);

    const newSources = sources.filter((source) => {
      const title = extractTitleFromReference(source.title);
      if (title) {
        const key = normalizeReferenceKey(title);
        if (existingKeys.has(key)) return false;
      }
      return true;
    });

    if (newSources.length === 0) {
      return existingReferences;
    }

    const newReferences = formatReferencesForPrompt(newSources);
    return `${existingReferences.trim()}\n${newReferences}`.trim();
  }

  const sources = await searchAcademicSourcesWithRetry(theme, maxSources);

  if (sources.length === 0) {
    return existingReferences;
  }

  const newReferences = formatReferencesForPrompt(sources);
  return newReferences;
}

export async function resolveAcademicReferences(input: {
  theme: string;
  citationKeys?: string[];
  maxSources?: number;
  generatedSections?: Array<{ title: string; content: string }>;
  searchAcademicSourcesFn?: (query: string, limit: number) => Promise<ScholarResult[]>;
}) {
  const maxSources = input.maxSources ?? 6;
  const resolved: ScholarResult[] = [];
  const seen = new Set<string>();
  const searchFn = input.searchAcademicSourcesFn ?? searchAcademicSourcesWithRetry;
  const semanticContext = buildSemanticContext({
    theme: input.theme,
    generatedSections: input.generatedSections,
  });

  for (const citationKey of (input.citationKeys ?? []).slice(0, maxSources)) {
    const queries = [`${citationKey} ${input.theme}`.trim(), citationKey].filter(Boolean);
    let bestMatch: ScholarResult | null = null;
    let bestScore = 0;

    for (const query of queries) {
      const candidates = await searchFn(query, 5);
      for (const candidate of candidates) {
        const identity = scoreScholarResultForCitation(candidate, citationKey);
        const semantic = scoreSemanticRelevance(candidate, semanticContext);
        const combinedScore = identity.score + semantic.score;

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMatch = candidate;
        }
      }
    }

    if (bestMatch) {
      const identity = scoreScholarResultForCitation(bestMatch, citationKey);
      const semantic = scoreSemanticRelevance(bestMatch, semanticContext);
      const hasIdentityMatch = identity.matchedAuthors > 0 || identity.titleMatch;
      const hasStrongIdentity = identity.score >= 5;
      const hasSemanticSupport = semanticContext.contextKeywords.length === 0
        || semantic.contextMatches > 0
        || hasStrongIdentity;

      if (bestScore < 3 || !hasIdentityMatch || !hasSemanticSupport) {
        continue;
      }

      const key = buildScholarResultKey(bestMatch);
      if (!seen.has(key)) {
        seen.add(key);
        resolved.push(bestMatch);
      }
    }
  }

  if (resolved.length < maxSources) {
    const themeResults = await searchFn(input.theme, maxSources);
    for (const candidate of themeResults) {
      const semantic = scoreSemanticRelevance(candidate, semanticContext);
      const hasEnoughSemanticSignal = semanticContext.contextKeywords.length > 0
        ? semantic.contextMatches > 0
        : semantic.titleMatches > 0;
      if (!hasEnoughSemanticSignal) {
        continue;
      }

      const key = buildScholarResultKey(candidate);
      if (!seen.has(key)) {
        seen.add(key);
        resolved.push(candidate);
      }
      if (resolved.length >= maxSources) {
        break;
      }
    }
  }

  return resolved.map(toReferenceData);
}
