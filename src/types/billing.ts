import type { PackageType } from "@prisma/client";

export type UnifiedPackageKey = "FREE" | "STARTER" | "PRO";

export const PACKAGE_KEY_MAP: Record<string, UnifiedPackageKey> = {
  "FREE": "FREE",
  "STARTER": "STARTER",
  "PRO": "PRO",
  // Legacy mappings (for backwards compatibility)
  "starter": "STARTER",
  "basic": "STARTER",
  "pro": "PRO",
  "academic": "PRO",
};

export function normalizePackageKey(key: string): UnifiedPackageKey {
  return PACKAGE_KEY_MAP[key] ?? "FREE";
}