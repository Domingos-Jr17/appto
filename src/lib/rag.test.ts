import { describe, expect, test } from "bun:test";

import { buildRagContext, computeHashedEmbedding, splitKnowledgeContent } from "@/lib/rag";

describe("rag helpers", () => {
  test("splits large content into overlapping chunks", () => {
    const content = Array.from({ length: 120 }, (_, index) => `Parágrafo ${index + 1}`).join(" ");
    const chunks = splitKnowledgeContent(content, 120, 20);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.length).toBeLessThanOrEqual(120);
  });

  test("formats retrieval context with sources", () => {
    const context = buildRagContext([
      {
        sourceName: "Boletim da República",
        documentTitle: "Lei do Ensino Superior",
        chunkIndex: 0,
        content: "O ensino superior deve promover investigação e extensão.",
      },
      {
        sourceName: "Repositório UEM",
        documentTitle: "Tese sobre educação",
        chunkIndex: 2,
        content: "A qualidade da escrita académica depende de revisão e método.",
      },
    ]);

    expect(context).toContain("Contexto RAG inicial");
    expect(context).toContain("Boletim da República");
    expect(context).toContain("Tese sobre educação");
  });

  test("builds normalized deterministic embeddings", () => {
    const first = computeHashedEmbedding("ensino superior em moçambique", 16);
    const second = computeHashedEmbedding("ensino superior em moçambique", 16);

    expect(first).toEqual(second);
    expect(first).toHaveLength(16);
    expect(first.some((value) => value !== 0)).toBe(true);
  });
});
