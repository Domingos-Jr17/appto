import { describe, expect, test } from "bun:test";

import { resolveStorageTopology } from "@/lib/storage-topology";

describe("storage topology", () => {
  test("prefers Supabase Storage as primary and R2 as fallback", () => {
    const topology = resolveStorageTopology({
      STORAGE_PROVIDER: "R2",
      STORAGE_FAILOVER_MODE: "write-fallback",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      SUPABASE_STORAGE_BUCKET: "appto-files",
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "fallback-bucket",
    });

    expect(topology.primary.provider).toBe("SUPABASE");
    expect(topology.primary.bucket).toBe("appto-files");
    expect(topology.fallback?.provider).toBe("R2");
    expect(topology.failoverMode).toBe("write-fallback");
  });

  test("falls back to local storage when Supabase is not configured", () => {
    const topology = resolveStorageTopology({
      STORAGE_PROVIDER: "LOCAL",
      STORAGE_LOCAL_ROOT: ".storage",
    });

    expect(topology.primary.provider).toBe("LOCAL");
    expect(topology.fallback).toBeNull();
  });
});
