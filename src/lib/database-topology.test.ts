import { describe, expect, test } from "bun:test";

import { buildPrismaConnectionUrl, resolveDatabaseTopology } from "@/lib/database-topology";

describe("database topology", () => {
  test("prefers Supabase as operational primary and Neon as fallback", () => {
    const topology = resolveDatabaseTopology({
      DATABASE_URL: "postgresql://generic-primary",
      SUPABASE_DATABASE_URL: "postgresql://supabase-primary",
      SUPABASE_DATABASE_URL_DIRECT: "postgresql://supabase-direct",
      NEON_DATABASE_URL: "postgresql://neon-fallback",
      NEON_DATABASE_URL_DIRECT: "postgresql://neon-direct",
      DATABASE_FAILOVER_MODE: "read-only",
    });

    expect(topology.primary.provider).toBe("SUPABASE");
    expect(topology.primary.url).toBe("postgresql://supabase-primary");
    expect(topology.fallback?.provider).toBe("NEON");
    expect(topology.failoverMode).toBe("read-only");
  });

  test("falls back to generic topology when only DATABASE_URL exists", () => {
    const topology = resolveDatabaseTopology({
      DATABASE_URL: "postgresql://generic-primary",
    });

    expect(topology.primary.provider).toBe("GENERIC");
    expect(topology.fallback).toBeNull();
    expect(topology.failoverMode).toBe("manual");
  });

  test("preserves explicit query params while adding Prisma defaults", () => {
    const url = buildPrismaConnectionUrl("postgresql://db.example/app?sslmode=require");

    expect(url).toContain("sslmode=require");
    expect(url).toContain("connection_limit=10");
    expect(url).toContain("pool_timeout=20");
  });
});
