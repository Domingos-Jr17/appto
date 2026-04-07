import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildDatabaseUrl() {
  const base = env.DATABASE_URL;
  const params = new URLSearchParams();

  params.set("connection_limit", "10");
  params.set("pool_timeout", "20");
  params.set("connect_timeout", "10");

  if (base.includes("?")) {
    const [baseUrl, existingQuery] = base.split("?");
    const existingParams = new URLSearchParams(existingQuery);
    for (const [key, value] of existingParams.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
    return `${baseUrl}?${params.toString()}`;
  }

  return `${base}?${params.toString()}`;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    log: env.isDevelopment ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (env.isDevelopment) {
  globalForPrisma.prisma = db;
}
