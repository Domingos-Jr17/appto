/**
 * Pesquisa fontes académicas reais via Semantic Scholar
 * para enriquecer a secção de referências.
 */

const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1";
const DEFAULT_TIMEOUT_MS = 4000;
const MAX_RETRIES = 1;

interface ScholarResult {
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
