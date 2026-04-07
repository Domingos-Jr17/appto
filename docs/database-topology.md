# Database topology

## Runtime decision

- Primary source of truth: `Supabase Postgres`
- Fallback target: `Neon Postgres`
- ORM/runtime: `Prisma`
- Failover mode: `manual` by default, optional `read-only` diagnostics mode

## Why this shape

- Prisma remains pointed at a single write target at runtime.
- The app exposes primary and fallback health separately instead of attempting fragile active-active writes.
- Migrations remain linear and must be applied to the primary first to avoid schema drift.
- Contingency is operationally simple: switch environment variables, deploy, verify health, then resume traffic.

## Environment contracts

- `SUPABASE_DATABASE_URL`: preferred production primary
- `SUPABASE_DATABASE_URL_DIRECT`: direct primary connection for migrations/admin flows
- `NEON_DATABASE_URL`: prepared fallback target
- `NEON_DATABASE_URL_DIRECT`: direct fallback connection
- `DATABASE_FAILOVER_MODE`: `manual` or `read-only`

## Operational notes

- `/api/health` now reports both primary and fallback reachability.
- `generation_jobs` remains the compatibility snapshot consumed by the API surface.
- `generation_runs`, `generation_attempts`, and `section_runs` persist the generation lifecycle in a normalized domain model.
