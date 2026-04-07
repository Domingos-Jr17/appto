import { PrismaClient } from "@prisma/client";
import { buildPrismaConnectionUrl, resolveDatabaseTopology } from "@/lib/database-topology";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaFallback: PrismaClient | undefined;
};

export const databaseTopology = resolveDatabaseTopology(env);

function createClient(url: string) {
  return new PrismaClient({
    datasources: {
      db: {
        url: buildPrismaConnectionUrl(url),
      },
    },
    log: env.isDevelopment ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

export const db =
  globalForPrisma.prisma ??
  createClient(databaseTopology.primary.url);

export const dbFallback = databaseTopology.fallback
  ? globalForPrisma.prismaFallback ?? createClient(databaseTopology.fallback.url)
  : null;

export async function runDatabaseHealthcheck(client: PrismaClient) {
  const startedAt = Date.now();

  try {
    await client.$queryRaw`SELECT 1`;
    return {
      reachable: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getDatabaseHealthSummary() {
  const [primary, fallback] = await Promise.all([
    runDatabaseHealthcheck(db),
    dbFallback ? runDatabaseHealthcheck(dbFallback) : Promise.resolve(null),
  ]);

  return {
    primary: {
      provider: databaseTopology.primary.provider,
      role: databaseTopology.primary.role,
      ...primary,
    },
    fallback: databaseTopology.fallback
      ? {
          provider: databaseTopology.fallback.provider,
          role: databaseTopology.fallback.role,
          ...(fallback ?? { reachable: false, latencyMs: 0 }),
        }
      : null,
    failoverMode: databaseTopology.failoverMode,
  };
}

if (env.isDevelopment) {
  globalForPrisma.prisma = db;
  if (dbFallback) {
    globalForPrisma.prismaFallback = dbFallback;
  }
}
