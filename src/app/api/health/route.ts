import { NextResponse } from "next/server";
import { databaseTopology, getDatabaseHealthSummary } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorageHealthSummary } from "@/lib/storage";

export async function GET() {
  const [database, storage] = await Promise.all([
    getDatabaseHealthSummary(),
    getStorageHealthSummary(),
  ]);
  const status = database.primary.reachable && storage.primary.reachable ? "ok" : "error";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database,
      storage,
      architecture: {
        primarySourceOfTruth: databaseTopology.primary.provider,
        fallbackProvider: databaseTopology.fallback?.provider ?? null,
        failoverMode: databaseTopology.failoverMode,
        primaryFileStorage: storage.primary.provider,
        fallbackFileStorage: storage.fallback?.provider ?? null,
        storageFailoverMode: storage.failoverMode,
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
