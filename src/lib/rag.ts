import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface RagResult {
  sourceName: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
}

export function splitKnowledgeContent(content: string, maxLength = 1200, overlap = 160) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const next = normalized.slice(cursor, cursor + maxLength).trim();
    if (!next) {
      break;
    }

    chunks.push(next);
    if (cursor + maxLength >= normalized.length) {
      break;
    }

    cursor += Math.max(maxLength - overlap, 1);
  }

  return chunks;
}

export function buildRagContext(results: RagResult[]) {
  if (!results.length) {
    return "";
  }

  return [
    "Contexto RAG inicial (use apenas como apoio factual quando for relevante):",
    ...results.map(
      (result, index) =>
        `[Fonte ${index + 1}] ${result.sourceName} — ${result.documentTitle} (trecho ${result.chunkIndex + 1})\n${result.content}`,
    ),
  ].join("\n\n");
}

export class RagService {
  constructor(private readonly dbClient: typeof db = db) {}

  async search(query: string, userId?: string, limit = 4): Promise<RagResult[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    const chunks = await this.dbClient.knowledgeChunk.findMany({
      where: {
        content: {
          contains: normalizedQuery.slice(0, 120),
          mode: "insensitive",
        },
        document: {
          source: {
            isActive: true,
            OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
          },
        },
      },
      include: {
        document: {
          include: {
            source: true,
          },
        },
      },
      take: limit,
      orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }],
    });

    return chunks.map((chunk) => ({
      sourceName: chunk.document.source.name,
      documentTitle: chunk.document.title,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
    }));
  }

  async ingestDocument(input: {
    sourceId: string;
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
  }) {
    const metadata = input.metadata
      ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue)
      : undefined;

    const document = await this.dbClient.knowledgeDocument.create({
      data: {
        sourceId: input.sourceId,
        title: input.title,
        content: input.content,
        metadata,
        isIndexed: true,
      },
    });

    const chunks = splitKnowledgeContent(input.content);
    if (chunks.length) {
      await this.dbClient.knowledgeChunk.createMany({
        data: chunks.map((content, index) => ({
          documentId: document.id,
          chunkIndex: index,
          content,
        })),
      });
    }

    return document;
  }
}
