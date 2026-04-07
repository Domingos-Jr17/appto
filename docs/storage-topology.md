# Storage topology

## Runtime decision

- Primary source of file truth: `Supabase Storage`
- Fallback target: `Cloudflare R2`
- Dev/local mode: `LOCAL` filesystem only when Supabase Storage is not configured
- Failover mode: `manual` by default, optional `write-fallback`

## Write strategy

- New uploads and persisted exports are created with the primary provider selected by `src/lib/storage.ts`.
- When `STORAGE_FAILOVER_MODE=manual`, a failed primary write stops immediately and returns an error.
- When `STORAGE_FAILOVER_MODE=write-fallback`, only that failing write is retried against `Cloudflare R2`.
- The `stored_files` row is updated to the provider that actually accepted the write.

## Read strategy

- Reads use `StoredFile.provider` as the single routing key.
- No read-time guessing across providers.
- No automatic active-active or dual-write behavior.

## Consistency model

- Metadata and object location stay aligned because the record is only marked `READY` after the upload/export succeeds.
- Fallback writes persist `provider=R2`, `bucket`, and `objectKey` explicitly.
- Reconciliation back to `Supabase Storage` is a controlled operator action, not a silent background copy.

## Operational notes

- `/api/health` reports both primary and fallback storage reachability.
- `Supabase Storage` stays the production default.
- `Cloudflare R2` exists for controlled contingency only.
