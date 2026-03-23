# appto-grad

`appto-grad` is an academic writing assistant built on `Next.js App Router` with authentication, projects, editor, AI generation, credits, exports, and file storage.

## Current operating model

- Official app surface: `/app/...`
- Real features: authentication, project/section CRUD, AI generation, credits, DOCX/PDF export, public outline demo, 2FA/reset password, simulated payments, and file storage
- Recommended production stack: `Neon Postgres` + `Cloudflare R2`
- Recommended local/dev stack: `Postgres` + `LOCAL` storage in `.storage/`

## Stack

- `Next.js 16`
- `React 19`
- `Prisma`
- `NextAuth`
- `Bun`
- `Cloudflare R2` via the S3-compatible API

## Scripts

```bash
bun install
bun run dev
bun run lint
bun run typecheck
bun run build
bun run test:unit
bun run test:e2e
bun run db:generate
bun run db:push
bun run db:migrate
bun run db:migrate:deploy
```

## Required environment variables

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
ZAI_API_KEY="replace-me"
STORAGE_PROVIDER="LOCAL"
STORAGE_LOCAL_ROOT=".storage"
PAYMENT_DEFAULT_PROVIDER="SIMULATED"
```

## Optional environment variables

```env
DATABASE_URL_DIRECT="postgresql://..."
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
ZAI_BASE_URL="https://api.z.ai/api/paas/v4"
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""
SENTRY_DSN=""

R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
R2_PUBLIC_BASE_URL=""
```

## Storage model

- Canonical project content stays in Postgres (`Project` + `DocumentSection`).
- Binary files are tracked through `StoredFile` and `ProjectExport`.
- `LOCAL` storage writes uploads and persisted exports into `.storage/`.
- `R2` storage uses signed upload/download URLs.
- Avatars now use the file pipeline instead of base64 demo data.
- Direct exports can still be downloaded without persistence.
- Persisted exports are attached to the project through `ProjectExport`.

### File endpoints

- `POST /api/files/upload-url`
- `PUT /api/files/upload-local/:id`
- `POST /api/files/complete`
- `GET /api/files/:id`
- `GET /api/files/:id/content`
- `DELETE /api/files/:id`
- `GET /api/projects/:id/exports`
- `POST /api/projects/:id/export/save`

### R2 bucket configuration

- Private bucket by default
- CORS allowing the app origin plus `PUT`, `GET`, and `HEAD`
- Signed URLs for upload and reads
- Never use the original filename as the primary object key

## Main structure

- `src/app/page.tsx`: landing page
- `src/app/app/*`: authenticated app
- `src/app/api/*`: API routes
- `src/components/editor/*`: editor and export flows
- `src/components/settings/*`: profile, security, and account
- `src/lib/*`: auth, env, prisma, credits, storage, features
- `prisma/schema.prisma`: current Postgres schema

## Operational rules

- Do not reintroduce public claims for hidden features without implementation and tests.
- Do not use `.z-ai-config`; AI provider configuration must come from environment variables.
- `.storage/`, local DB dumps, and temp files must stay out of version control.
- Prefer `Neon` for Postgres and `Cloudflare R2` for file storage in production.
