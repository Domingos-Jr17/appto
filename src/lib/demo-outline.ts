export interface DemoOutlineSection {
  number: string;
  title: string;
  subsections: string[];
}

export interface DemoOutline {
  title: string;
  sections: DemoOutlineSection[];
  stats: {
    pages: string;
    references?: string;
    time?: string;
  };
}

function normalizeTopic(topic: string) {
  return topic.trim().replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildFallbackSections(topic: string): DemoOutlineSection[] {
  const cleanTopic = normalizeTopic(topic);
  const shortTopic = toTitleCase(cleanTopic).slice(0, 80);

  return [
    {
      number: "1",
      title: "Introdução",
      subsections: [
        `1.1 Contextualização de ${shortTopic}`,
        "1.2 Problema de investigação",
        "1.3 Objectivos e perguntas do estudo",
      ],
    },
    {
      number: "2",
      title: "Enquadramento Teórico",
      subsections: [
        `2.1 Conceitos centrais sobre ${cleanTopic}`,
        "2.2 Perspectivas teóricas relevantes",
        "2.3 Estado da arte e lacunas",
      ],
    },
    {
      number: "3",
      title: "Metodologia",
      subsections: [
        "3.1 Tipo e abordagem da pesquisa",
        "3.2 Técnicas de recolha de dados",
        "3.3 Estratégia de análise",
      ],
    },
    {
      number: "4",
      title: "Análise e Discussão",
      subsections: [
        `4.1 Evidências observadas sobre ${cleanTopic}`,
        "4.2 Interpretação dos resultados",
        "4.3 Implicações práticas e académicas",
      ],
    },
    {
      number: "5",
      title: "Conclusões e Recomendações",
      subsections: [
        "5.1 Síntese dos achados",
        "5.2 Recomendações",
        "5.3 Limitações e pesquisas futuras",
      ],
    },
  ];
}

export function buildFallbackOutline(topic: string): DemoOutline {
  const cleanTopic = normalizeTopic(topic);

  return {
    title: `Sumário demonstrativo para: ${toTitleCase(cleanTopic)}`,
    sections: buildFallbackSections(cleanTopic),
    stats: {
      pages: "12-18",
      references: "8-12 fontes para revisão inicial",
      time: "Estrutura inicial pronta em menos de 1 minuto",
    },
  };
}

function tryExtractJsonBlock(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export function parseDemoOutlineResponse(content: string): DemoOutline | null {
  const jsonBlock = tryExtractJsonBlock(content);
  if (!jsonBlock) return null;

  try {
    const parsed = JSON.parse(jsonBlock) as DemoOutline;
    if (
      !parsed ||
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.sections) ||
      !parsed.stats ||
      typeof parsed.stats.pages !== "string"
    ) {
      return null;
    }

    return {
      title: parsed.title,
      sections: parsed.sections
        .filter(
          (section) =>
            section &&
            typeof section.number === "string" &&
            typeof section.title === "string" &&
            Array.isArray(section.subsections)
        )
        .map((section) => ({
          number: section.number,
          title: section.title,
          subsections: section.subsections.filter((item) => typeof item === "string"),
        })),
      stats: {
        pages: parsed.stats.pages,
        references: parsed.stats.references,
        time: parsed.stats.time,
      },
    };
  } catch {
    return null;
  }
}
