# appto-grad

`appto-grad` is an academic writing assistant built on `Next.js App Router` with authentication, projects, editor, AI generation, credits, exports, and file storage.

**Version:** 0.2.0

## Current operating model

- Official app surface: `/app/...`
- Real features: authentication, project/section CRUD, AI generation, credits, DOCX/PDF export, public outline demo, 2FA/reset password, simulated payments, file storage, knowledge base (RAG), and user settings
- Recommended production stack: `Supabase Postgres` + `Supabase Storage`, with `Neon Postgres` and `Cloudflare R2` prepared as fallbacks
- Recommended local/dev stack: `Postgres` + `LOCAL` storage in `.storage/`

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | `Next.js 16` (App Router, standalone output) |
| UI | `React 19`, `shadcn/ui` (new-york), `Radix UI`, `Tailwind CSS v4`, `Framer Motion`, `Lucide` icons |
| Editor | `MDXEditor`, `react-markdown`, `Turndown` |
| State | `Zustand`, `TanStack React Query`, `TanStack React Table` |
| Database | `PostgreSQL` via `Prisma` |
| Auth | `NextAuth` (credentials + Google OAuth), `bcryptjs`, `otplib` (2FA TOTP) |
| Storage | `Supabase Storage` primary, `Cloudflare R2` fallback, or `LOCAL` for dev |
| Email | `Resend` |
| Payments | `SIMULATED`, `MPESA`, `EMOLA` |
| Exports | `docx` (DOCX), `@react-pdf/renderer` (PDF) |
| AI | `z-ai-web-dev-sdk` |
| i18n | `next-intl` |
| Runtime | `Bun` |
| Testing | `Playwright` (E2E), `bun test` (unit) |
| Proxy | `Caddy` (see `Caddyfile`) |

## Scripts

```bash
bun install              # Install dependencies
bun run dev              # Start dev server (default port 3000)
bun run build            # Production build (standalone)
bun run start            # Start production server
bun run lint             # ESLint
bun run typecheck        # TypeScript type checking
bun run test             # Run all tests (unit + e2e)
bun run test:unit        # Unit tests (bun test)
bun run test:e2e         # E2E tests (Playwright, port 3005)
bun run db:generate      # Prisma client generation
bun run db:push          # Push schema to database
bun run db:migrate       # Create/apply migrations (dev)
bun run db:migrate:deploy # Apply migrations (production)
bun run db:reset         # Reset database
bun run db:seed          # Seed database
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

### Required

```env
DATABASE_URL="postgresql://..."
SUPABASE_DATABASE_URL="postgresql://..." # preferred primary in production
AUTH_SECRET="replace-me"           # or NEXTAUTH_SECRET
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
ZAI_API_KEY="replace-me"
STORAGE_PROVIDER="LOCAL"           # LOCAL, SUPABASE, or R2
STORAGE_FAILOVER_MODE="manual"     # manual or write-fallback
STORAGE_LOCAL_ROOT=".storage"
PAYMENT_DEFAULT_PROVIDER="SIMULATED" # SIMULATED, MPESA, or EMOLA
```

### Optional

```env
DATABASE_URL_DIRECT="postgresql://..."  # Direct DB connection (e.g. Neon)
SUPABASE_DATABASE_URL_DIRECT="postgresql://..."
NEON_DATABASE_URL="postgresql://..."    # fallback / contingency target
NEON_DATABASE_URL_DIRECT="postgresql://..."
DATABASE_FAILOVER_MODE="manual"         # manual or read-only
GOOGLE_CLIENT_ID=""                     # Google OAuth
GOOGLE_CLIENT_SECRET=""
ZAI_BASE_URL="https://api.z.ai/api/paas/v4"
RESEND_API_KEY=""                       # Email service
RESEND_FROM_EMAIL=""
SENTRY_DSN=""                           # Error monitoring

R2_ACCOUNT_ID=""                        # Cloudflare R2 storage
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
R2_PUBLIC_BASE_URL=""

SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_STORAGE_BUCKET="appto-files"
```

## Storage model

- Canonical project content stays in Postgres (`Project` + `DocumentSection`).
- Binary files are tracked through `StoredFile` and `ProjectExport`.
- `Supabase Storage` is the production primary for uploads, exports, and generated files.
- `Cloudflare R2` is an explicit fallback target for new writes only when `STORAGE_FAILOVER_MODE=write-fallback`.
- Reads always follow the persisted `StoredFile.provider`; there is no hidden dual-write or active-active mode.
- `LOCAL` storage writes uploads and persisted exports into `.storage/` in development.
- Avatars use the file pipeline.
- Direct exports can still be downloaded without persistence.
- Persisted exports are attached to the project through `ProjectExport`.

### File endpoints

- `POST /api/files/upload-url` — get signed upload URL (R2) or local upload path
- `PUT /api/files/upload-local/:id` — upload file to local storage
- `POST /api/files/complete` — mark upload as complete
- `GET /api/files/:id` — get file metadata
- `GET /api/files/:id/content` — download file content
- `DELETE /api/files/:id` — delete file

### Project export endpoints

- `GET /api/export` — export project (DOCX/PDF)
- `POST /api/export/pdf` — export as PDF

### Storage failover rules

- Primary writes target `Supabase Storage` whenever it is configured.
- If `STORAGE_FAILOVER_MODE=manual`, a primary write failure returns an error and operators decide whether to switch.
- If `STORAGE_FAILOVER_MODE=write-fallback`, only the failing write is redirected to `Cloudflare R2`, and the resulting `StoredFile` metadata is updated to `provider=R2`.
- Reads never guess across providers; they use the persisted provider to avoid metadata drift.
- Reconciliation back to `Supabase Storage` is an explicit operator task, not an automatic background dual-write.

### R2 bucket configuration

- Private bucket by default
- CORS allowing the app origin plus `PUT`, `GET`, and `HEAD`
- Signed URLs for upload and reads
- Never use the original filename as the primary object key

## Database topology

- `Supabase` is the operational source of truth when `SUPABASE_DATABASE_URL` is configured.
- `Neon` is prepared as fallback and exposed in `/api/health`, but automatic write failover is intentionally not enabled.
- `DATABASE_FAILOVER_MODE=manual` is the default and safest mode for production.
- Prisma migrations should always run against the primary database to avoid schema drift.
- If contingency is needed, switch `DATABASE_URL`/`SUPABASE_DATABASE_URL` at deploy time after validating migration parity.

## Main structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── (auth)/                   # Auth pages (login, register, forgot/reset password)
│   ├── app/                      # Authenticated app
│   │   ├── page.tsx              # Dashboard
│   │   ├── sessoes/              # Sessions/projects workspace
│   │   ├── projects/             # Projects (redirects to sessoes)
│   │   ├── credits/              # Credits management
│   │   └── settings/             # User settings
│   └── api/                      # API routes
│       ├── auth/                 # NextAuth + register, password reset
│       ├── projects/             # Project CRUD
│       ├── documents/            # Document section CRUD + reorder
│       ├── credits/              # Credits ledger
│       ├── files/                # File upload/download/delete
│       ├── export/               # DOCX/PDF export
│       ├── ai/                   # AI generation (streaming)
│       ├── generate/             # Generation workers
│       ├── payments/             # Payment checkout + callbacks
│       ├── user/                 # User profile, 2FA, sessions, export data
│       ├── settings/             # User settings API
│       ├── demo/                 # Demo outline endpoint
│       └── health/               # Health check
├── components/
│   ├── editor/                   # Document tree + preview pane
│   ├── landing/                  # Landing page sections (hero, pricing, FAQ, etc.)
│   ├── workspace/                # Workspace v1 (shell, sidebar, header)
│   ├── workspace-v2/             # Workspace v2 (three-pane layout, chat)
│   ├── sessions/                 # Session components
│   ├── projects/                 # Project components
│   ├── credits/                  # Credits components
│   ├── settings/                 # Settings components
│   ├── providers/                # Context providers
│   ├── ui/                       # shadcn/ui components
│   └── ui-aptto/                 # Custom UI components
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores (editor, project, assistant, conversations)
├── lib/                          # Core utilities
│   ├── auth.ts                   # NextAuth configuration
│   ├── auth-security.ts         # Auth security helpers
│   ├── db.ts                     # Prisma client
│   ├── env.ts                    # Validated environment variables
│   ├── credits.ts                # Credit system logic
│   ├── credit-ledger.ts          # Credit transaction ledger
│   ├── storage.ts                # File storage abstraction
│   ├── files.ts                  # File management
│   ├── payments.ts               # Payment providers
│   ├── zai.ts                    # AI integration
│   ├── ai-cache.ts               # AI response caching
│   ├── knowledge.ts              # Knowledge base (RAG)
│   ├── content.ts                # Content utilities
│   ├── document-export.tsx       # Document export logic
│   ├── email.ts                  # Email service (Resend)
│   ├── crypto.ts                 # Cryptographic utilities
│   ├── rate-limit.ts             # Rate limiting
│   ├── logger.ts                 # Structured logging
│   ├── features.ts               # Feature flags
│   ├── validators.ts             # Input validators
│   ├── workspace.ts              # Workspace utilities
│   ├── request.ts                # Request helpers
│   ├── utils.ts                  # General utilities
│   ├── api.ts                    # API client helpers
│   ├── app-data.ts               # App data helpers
│   ├── demo-outline.ts           # Demo outline data
│   └── project-type-styles.ts    # Project type styling
├── types/
│   └── editor.ts                 # Editor type definitions
└── proxy.ts                      # Middleware/proxy
prisma/
├── schema.prisma                 # Database schema
├── seed.ts                       # Database seed script
└── migrations/                   # Prisma migrations
tests/
└── e2e/                          # Playwright E2E tests
```

## Data model (Prisma)

| Domain | Models |
|--------|--------|
| Auth | `User`, `Account`, `Session`, `VerificationToken`, `PasswordResetToken`, `AuthSessionAudit`, `TotpCredential`, `RecoveryCode` |
| Projects | `Project`, `DocumentSection` |
| Credits | `Credit`, `CreditTransaction` |
| Payments | `PaymentTransaction`, `Subscription` |
| Storage | `StoredFile`, `ProjectExport` |
| Knowledge | `KnowledgeSource`, `KnowledgeDocument`, `KnowledgeChunk` |
| Settings | `UserSettings` |

## Internationalization

The app uses `next-intl` for internationalization. Default locale is `pt-MZ` (Portuguese - Mozambique).

## Operational rules

- Do not reintroduce public claims for hidden features without implementation and tests.
- Do not use `.z-ai-config`; AI provider configuration must come from environment variables.
- `.storage/`, local DB dumps, and temp files must stay out of version control.
- Prefer `Supabase` as the primary Postgres runtime, keep `Neon` warm as fallback.
- Prefer `Supabase Storage` as the primary file storage runtime, keep `Cloudflare R2` warm as fallback.
- Run `bun run typecheck && bun run lint` before committing.
