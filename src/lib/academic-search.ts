/**
 * Pesquisa fontes académicas reais via Google Scholar / Semantic Scholar
 * para usar como referências na geração de trabalhos
 *
 * Uso interno: chamado antes da geração de conteúdo para enriquecer
 * o referencesSeed com fontes reais encontradas automaticamente.
 */

const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1";

interface ScholarResult {
  title: string;
  authors: string;
  year: number | null;
  citationCount: number;
  url: string;
  abstract: string | null;
}

export async function searchAcademicSources(
  query: string,
  limit = 8,
): Promise<ScholarResult[]> {
  try {
    const url = `${SEMANTIC_SCHOLAR_API}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,citationCount,abstract,externalIds`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "aptto-academic-generator/1.0",
      },
    });

    if (response.status === 429) {
      console.warn("[academic-search] Rate limited - using existing references");
      return [];
    }

    if (!response.ok) {
      console.error(`[academic-search] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data
      .filter((paper: any) => paper.title && paper.authors)
      .slice(0, limit)
      .map((paper: any) => ({
        title: paper.title,
        authors: paper.authors
          .slice(0, 3)
          .map((a: any) => a.name)
          .join(", "),
        year: paper.year,
        citationCount: paper.citationCount || 0,
        url: paper.externalIds?.DOI
          ? `https://doi.org/${paper.externalIds.DOI}`
          : paper.externalIds?.URL || null,
        abstract: paper.abstract || null,
      }));
  } catch (error) {
    console.error(`[academic-search] Failed: ${error}`);
    return [];
  }
}

export function formatReferencesForPrompt(sources: ScholarResult[]): string {
  if (sources.length === 0) return "";

  const formatted = sources.map((s, i) => {
    const authors = s.authors.split(",")[0]?.split(" ").pop() || "AUTOR";
    const year = s.year || "s.d.";
    const title = s.title;
    const url = s.url ? ` Disponível em: ${s.url}.` : "";
    return `${i + 1}. ${authors.toUpperCase()}, ${year}. ${title}.${url}`;
  });

  return `Fontes académicas encontradas automaticamente:\n${formatted.join("\n")}`;
}

export async function enrichReferencesWithAcademicSources(
  theme: string,
  existingReferences: string = "",
  maxSources = 6,
): Promise<string> {
  const sources = await searchAcademicSources(theme, maxSources);

  if (sources.length === 0) {
    return existingReferences;
  }

  const newRefs = formatReferencesForPrompt(sources);

  if (existingReferences) {
    return `${existingReferences}\n\n${newRefs}`;
  }

  return newRefs;
}
