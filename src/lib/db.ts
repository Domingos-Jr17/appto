import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (env.isDevelopment) {
  globalForPrisma.prisma = db;
}
