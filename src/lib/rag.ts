import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface RagResult {
  sourceName: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  score?: number;
}

function getRagRetrievalMode() {
  return process.env.RAG_RETRIEVAL_MODE === "VECTOR" ? "VECTOR" : "TEXT";
}

function getEmbeddingDimensions() {
  const value = Number(process.env.RAG_EMBEDDING_DIMENSIONS ?? 128);
  return Number.isFinite(value) && value > 0 ? value : 128;
}

function extractSearchTerms(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 4),
    ),
  ).slice(0, 6);
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

function hashToken(token: string) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function computeHashedEmbedding(text: string, dimensions = getEmbeddingDimensions()) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  if (!tokens.length) {
    return vector;
  }

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = hash % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

function serializeEmbedding(vector: number[]) {
  return JSON.stringify(vector);
}

function toPgVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
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

    if (getRagRetrievalMode() === "VECTOR") {
      try {
        const results = await this.searchByVector(normalizedQuery, userId, limit);
        if (results.length) {
          return results;
        }
      } catch (error) {
        logger.warn("RAG vector search failed, falling back to text mode", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return this.searchByText(normalizedQuery, userId, limit);
  }

  private async searchByText(query: string, userId?: string, limit = 4): Promise<RagResult[]> {
    const terms = extractSearchTerms(query);
    if (!terms.length) {
      return [];
    }

    const chunks = await this.dbClient.knowledgeChunk.findMany({
      where: {
        OR: terms.map((term) => ({
          content: {
            contains: term,
            mode: "insensitive",
          },
        })),
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

  private async searchByVector(query: string, userId?: string, limit = 4): Promise<RagResult[]> {
    const vector = computeHashedEmbedding(query);
    const vectorLiteral = toPgVectorLiteral(vector);

    const rows = await this.dbClient.$queryRawUnsafe<Array<{
      source_name: string;
      document_title: string;
      chunk_index: number;
      content: string;
      score: number;
    }>>(
      `
        SELECT
          ks.name AS source_name,
          kd.title AS document_title,
          kc.chunk_index,
          kc.content,
          1 - (kc.embedding_vector <=> $1::vector) AS score
        FROM knowledge_chunks kc
        INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
        INNER JOIN knowledge_sources ks ON ks.id = kd.source_id
        WHERE ks.is_active = true
          AND kc.embedding_vector IS NOT NULL
          AND ($2::text IS NULL OR ks.user_id IS NULL OR ks.user_id = $2)
        ORDER BY kc.embedding_vector <=> $1::vector ASC
        LIMIT $3
      `,
      vectorLiteral,
      userId ?? null,
      limit,
    );

    return rows.map((row) => ({
      sourceName: row.source_name,
      documentTitle: row.document_title,
      chunkIndex: Number(row.chunk_index),
      content: row.content,
      score: Number(row.score),
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
    if (!chunks.length) {
      return document;
    }

    if (getRagRetrievalMode() === "VECTOR") {
      await this.dbClient.$transaction(async (tx) => {
        for (let index = 0; index < chunks.length; index += 1) {
          const content = chunks[index]!;
          const vector = computeHashedEmbedding(content);

          await tx.$executeRawUnsafe(
            `
              INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, embedding_json, embedding_vector, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6::vector, NOW(), NOW())
            `,
            crypto.randomUUID(),
            document.id,
            index,
            content,
            serializeEmbedding(vector),
            toPgVectorLiteral(vector),
          );
        }
      });

      return document;
    }

    await this.dbClient.knowledgeChunk.createMany({
      data: chunks.map((content, index) => ({
        documentId: document.id,
        chunkIndex: index,
        content,
        embeddingJson: serializeEmbedding(computeHashedEmbedding(content)),
      })),
    });

    return document;
  }
}
