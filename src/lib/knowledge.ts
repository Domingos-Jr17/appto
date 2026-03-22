import { type PrismaClient, type Prisma } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class KnowledgeIngestionService {
  constructor(private readonly db: DbClient) {}

  chunkContent(content: string, chunkSize = 1200) {
    const normalized = content.replace(/\s+/g, " ").trim();
    const chunks: string[] = [];

    for (let index = 0; index < normalized.length; index += chunkSize) {
      chunks.push(normalized.slice(index, index + chunkSize));
    }

    return chunks;
  }

  async ingestDocument(input: {
    sourceId: string;
    title: string;
    content: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const document = await this.db.knowledgeDocument.create({
      data: {
        sourceId: input.sourceId,
        title: input.title,
        content: input.content,
        metadata: input.metadata,
        isIndexed: true,
      },
    });

    const chunks = this.chunkContent(input.content);
    await this.db.knowledgeChunk.createMany({
      data: chunks.map((chunk, chunkIndex) => ({
        documentId: document.id,
        chunkIndex,
        content: chunk,
        metadata: { tokenCount: chunk.split(/\s+/).length },
      })),
    });

    return document;
  }
}

export class KnowledgeRetrievalService {
  constructor(private readonly db: DbClient) {}

  async search(query: string, limit = 4) {
    const chunks = await this.db.knowledgeChunk.findMany({
      where: {
        content: {
          contains: query,
        },
      },
      take: limit,
      include: {
        document: {
          include: {
            source: true,
          },
        },
      },
    });

    return chunks.map((chunk) => ({
      content: chunk.content,
      documentTitle: chunk.document.title,
      sourceName: chunk.document.source.name,
      sourceType: chunk.document.source.type,
    }));
  }
}
