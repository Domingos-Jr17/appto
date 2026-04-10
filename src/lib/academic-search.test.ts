import { describe, expect, test } from "bun:test";

import {
  resolveAcademicReferences,
  type ScholarResult,
} from "@/lib/academic-search";

describe("academic reference resolution", () => {
  test("rejects off-topic references that only match an ambiguous theme word", async () => {
    const offTopicSources: ScholarResult[] = [
      {
        title: "O que Define um Turista? Da teoria à compreensão dos gestores de destinos",
        authors: "João José dos Santos Junior",
        year: 2024,
        citationCount: 4,
        url: "https://example.com/turismo",
        abstract: "Estudo sobre turismo e gestão de destinos turísticos.",
        doi: null,
        venue: "Revista Turismo em Análise",
        paperId: "tourism-1",
      },
      {
        title: "Impacto ambiental causado pelo descarte de óleo: estudo do destino do óleo usado",
        authors: "Lívia Pita Corrêa",
        year: 2018,
        citationCount: 2,
        url: "https://example.com/oleo",
        abstract: "Pesquisa sobre descarte de óleo de cozinha e impactos ambientais.",
        doi: null,
        venue: "Revista Brasileira de Planejamento",
        paperId: "oil-1",
      },
    ];

    const resolved = await resolveAcademicReferences({
      theme: "O que é o destino",
      generatedSections: [
        {
          title: "2. Desenvolvimento",
          content:
            "O trabalho discute estudantes, escolhas, autonomia, responsabilidade individual e pensamento filosófico no contexto escolar moçambicano.",
        },
      ],
      maxSources: 4,
      searchAcademicSourcesFn: async () => offTopicSources,
    });

    expect(resolved).toEqual([]);
  });

  test("keeps references whose topic aligns with the generated sections", async () => {
    const relevantSources: ScholarResult[] = [
      {
        title: "Projectos de vida, juventude e escolhas escolares",
        authors: "Paula Cossa, Nelson Tembe",
        year: 2021,
        citationCount: 8,
        url: "https://example.com/projetos-de-vida",
        abstract: "Analisa autonomia, estudantes, escola e construção do futuro em contexto africano.",
        doi: null,
        venue: "Revista Moçambicana de Educação",
        paperId: "edu-1",
      },
    ];

    const resolved = await resolveAcademicReferences({
      theme: "O que é o destino",
      generatedSections: [
        {
          title: "2. Desenvolvimento",
          content:
            "O texto analisa o destino como construção do futuro, escolhas dos estudantes e responsabilidade individual na escola.",
        },
      ],
      maxSources: 4,
      searchAcademicSourcesFn: async () => relevantSources,
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.title).toContain("Projectos de vida");
  });
});
