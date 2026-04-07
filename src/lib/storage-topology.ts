export type StorageProviderName = "SUPABASE" | "R2" | "LOCAL";
export type StorageFailoverMode = "manual" | "write-fallback";

export interface StorageTarget {
  provider: StorageProviderName;
  role: "primary" | "fallback";
  bucket: string;
  configured: boolean;
  label: string;
}

export interface StorageTopology {
  primary: StorageTarget;
  fallback: StorageTarget | null;
  failoverMode: StorageFailoverMode;
}

type StorageTopologyInput = {
  STORAGE_PROVIDER?: string;
  STORAGE_FAILOVER_MODE?: string;
  STORAGE_LOCAL_ROOT?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
};

function resolveFailoverMode(value?: string): StorageFailoverMode {
  return value === "write-fallback" ? "write-fallback" : "manual";
}

function hasSupabaseStorageConfig(input: StorageTopologyInput) {
  return Boolean(
    input.SUPABASE_URL?.trim() &&
      input.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      input.SUPABASE_STORAGE_BUCKET?.trim(),
  );
}

function hasR2Config(input: StorageTopologyInput) {
  return Boolean(
    input.R2_ACCOUNT_ID?.trim() &&
      input.R2_ACCESS_KEY_ID?.trim() &&
      input.R2_SECRET_ACCESS_KEY?.trim() &&
      input.R2_BUCKET?.trim(),
  );
}

function buildTarget(input: {
  provider: StorageProviderName;
  role: "primary" | "fallback";
  bucket: string;
  configured: boolean;
}): StorageTarget {
  return {
    ...input,
    label: `${input.provider.toLowerCase()}-${input.role}`,
  };
}

export function resolveStorageTopology(input: StorageTopologyInput): StorageTopology {
  const supabaseConfigured = hasSupabaseStorageConfig(input);
  const r2Configured = hasR2Config(input);
  const storageProvider = input.STORAGE_PROVIDER?.trim();

  const primary = supabaseConfigured
    ? buildTarget({
        provider: "SUPABASE",
        role: "primary",
        bucket: input.SUPABASE_STORAGE_BUCKET!.trim(),
        configured: true,
      })
    : storageProvider === "R2" && r2Configured
      ? buildTarget({
          provider: "R2",
          role: "primary",
          bucket: input.R2_BUCKET!.trim(),
          configured: true,
        })
      : buildTarget({
          provider: "LOCAL",
          role: "primary",
          bucket: input.STORAGE_LOCAL_ROOT?.trim() || ".storage",
          configured: true,
        });

  const fallback = primary.provider !== "R2" && r2Configured
    ? buildTarget({
        provider: "R2",
        role: "fallback",
        bucket: input.R2_BUCKET!.trim(),
        configured: true,
      })
    : null;

  return {
    primary,
    fallback,
    failoverMode: resolveFailoverMode(input.STORAGE_FAILOVER_MODE),
  };
}
