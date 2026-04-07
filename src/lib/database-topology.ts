export type DatabaseProviderName = "SUPABASE" | "NEON" | "GENERIC";
export type DatabaseFailoverMode = "manual" | "read-only";

export interface DatabaseTarget {
  provider: DatabaseProviderName;
  role: "primary" | "fallback";
  url: string;
  directUrl?: string;
  label: string;
}

export interface DatabaseTopology {
  primary: DatabaseTarget;
  fallback: DatabaseTarget | null;
  failoverMode: DatabaseFailoverMode;
}

type DatabaseTopologyInput = {
  DATABASE_URL: string;
  DATABASE_URL_DIRECT?: string;
  SUPABASE_DATABASE_URL?: string;
  SUPABASE_DATABASE_URL_DIRECT?: string;
  NEON_DATABASE_URL?: string;
  NEON_DATABASE_URL_DIRECT?: string;
  DATABASE_FALLBACK_URL?: string;
  DATABASE_FALLBACK_URL_DIRECT?: string;
  DATABASE_FAILOVER_MODE?: string;
};

function resolveFailoverMode(value?: string): DatabaseFailoverMode {
  return value === "read-only" ? "read-only" : "manual";
}

function buildTarget(input: {
  provider: DatabaseProviderName;
  role: "primary" | "fallback";
  url: string;
  directUrl?: string;
}): DatabaseTarget {
  return {
    ...input,
    label: `${input.provider.toLowerCase()}-${input.role}`,
  };
}

export function resolveDatabaseTopology(input: DatabaseTopologyInput): DatabaseTopology {
  const supabaseUrl = input.SUPABASE_DATABASE_URL?.trim();
  const supabaseDirectUrl = input.SUPABASE_DATABASE_URL_DIRECT?.trim();
  const neonUrl = input.NEON_DATABASE_URL?.trim();
  const neonDirectUrl = input.NEON_DATABASE_URL_DIRECT?.trim();
  const fallbackUrl = input.DATABASE_FALLBACK_URL?.trim();
  const fallbackDirectUrl = input.DATABASE_FALLBACK_URL_DIRECT?.trim();
  const defaultUrl = input.DATABASE_URL?.trim() || supabaseUrl || neonUrl || "postgresql://placeholder/placeholder";
  const defaultDirectUrl = input.DATABASE_URL_DIRECT?.trim();

  const primary = supabaseUrl
    ? buildTarget({
        provider: "SUPABASE",
        role: "primary",
        url: supabaseUrl,
        directUrl: supabaseDirectUrl ?? defaultDirectUrl,
      })
    : buildTarget({
        provider: "GENERIC",
        role: "primary",
        url: defaultUrl,
        directUrl: defaultDirectUrl,
      });

  const fallback = neonUrl
    ? buildTarget({
        provider: "NEON",
        role: "fallback",
        url: neonUrl,
        directUrl: neonDirectUrl,
      })
    : fallbackUrl
      ? buildTarget({
          provider: "GENERIC",
          role: "fallback",
          url: fallbackUrl,
          directUrl: fallbackDirectUrl,
        })
      : null;

  return {
    primary,
    fallback,
    failoverMode: resolveFailoverMode(input.DATABASE_FAILOVER_MODE),
  };
}

export function buildPrismaConnectionUrl(baseUrl: string) {
  const params = new URLSearchParams();
  params.set("connection_limit", "10");
  params.set("pool_timeout", "20");
  params.set("connect_timeout", "10");

  if (baseUrl.includes("?")) {
    const [origin, queryString] = baseUrl.split("?");
    const current = new URLSearchParams(queryString);

    for (const [key, value] of current.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }

    return `${origin}?${params.toString()}`;
  }

  return `${baseUrl}?${params.toString()}`;
}
