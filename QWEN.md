# appto-grad

> Academic writing assistant built on Next.js App Router with authentication, projects, editor, AI generation, credits, exports, and file storage.

**Version:** 0.2.0

## Project Overview

`appto-grad` is a full-featured academic writing assistant that helps students and researchers create, manage, and export academic works (monographs, dissertations, theses, articles, essays, reports). The application supports AI-assisted content generation, a credits-based usage system, multi-provider file storage, internationalization, and payment integration.

### Core Features

- **Authentication** — NextAuth with credentials + Google OAuth, 2FA (TOTP), password reset, email verification
- **Project Management** — Create, edit, and organize academic projects with hierarchical document sections
- **AI Generation** — Streaming AI content generation with retry logic, progress tracking, and section-level runs
- **Credits System** — Credit-based usage model with ledger tracking, subscriptions, and work purchases
- **File Storage** — Abstraction layer supporting Supabase Storage (primary), Cloudflare R2 (fallback), and local storage (dev)
- **Exports** — DOCX and PDF export with persisted export history
- **Knowledge Base (RAG)** — Retrieval-Augmented Generation with knowledge sources, documents, and chunks
- **Payments** — Simulated, M-Pesa, and Emola payment providers with webhook support
- **i18n** — Multi-language support (pt-MZ, pt-BR, en) via next-intl

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, shadcn/ui (new-york), Radix UI, Tailwind CSS v4, Framer Motion, Lucide icons |
| Editor | MDXEditor, react-markdown, Turndown |
| State | Zustand, TanStack React Query, TanStack React Table |
| Database | PostgreSQL via Prisma |
| Auth | NextAuth (credentials + Google OAuth), bcryptjs, otplib (2FA TOTP) |
| Storage | Supabase Storage (primary), Cloudflare R2 (fallback), LOCAL (dev) |
| Email | Resend |
| Payments | SIMULATED, MPESA, EMOLA |
| Exports | docx (DOCX), @react-pdf/renderer (PDF) |
| AI | z-ai-web-dev-sdk |
| i18n | next-intl |
| Runtime | Bun |
| Testing | Playwright (E2E), bun test (unit) |
| Proxy | Caddy |

## Building and Running

### Prerequisites

- **Bun** (recommended runtime)
- **PostgreSQL** (local or remote: Supabase/Neon)
- **Node.js 20+** (if not using Bun)

### Commands

```bash
# Install dependencies
bun install

# Development
bun run dev              # Start dev server (default port 3000)

# Production
bun run build            # Production build (standalone output)
bun run start            # Start production server

# Database
bun run db:generate      # Generate Prisma client
bun run db:push          # Push schema to database (dev only)
bun run db:migrate       # Create/apply migrations (dev)
bun run db:migrate:deploy # Apply migrations (production)
bun run db:reset         # Reset database
bun run db:seed          # Seed database

# Testing
bun run test             # Run all tests (unit + E2E)
bun run test:unit        # Unit tests (bun test)
bun run test:e2e         # E2E tests (Playwright, port 3005)

# Quality
bun run lint             # ESLint
bun run typecheck        # TypeScript type checking

# Workers (AI generation)
bun run workers:once     # Run workers once
bun run workers:loop     # Run workers in a loop
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```env
# Required
DATABASE_URL="postgresql://..."
AUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
ZAI_API_KEY="replace-me"
STORAGE_PROVIDER="LOCAL"           # LOCAL, SUPABASE, or R2
PAYMENT_DEFAULT_PROVIDER="SIMULATED"

# Optional (production)
SUPABASE_DATABASE_URL="postgresql://..."
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
RESEND_API_KEY=""
SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""
```

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth routes (login, register, forgot/reset)
│   ├── app/                  # Authenticated app surface
│   │   ├── sessoes/          # Sessions/projects workspace
│   │   ├── credits/          # Credits management
│   │   └── settings/         # User settings
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth + register, password reset
│   │   ├── projects/         # Project CRUD
│   │   ├── documents/        # Document section CRUD + reorder
│   │   ├── credits/          # Credits ledger
│   │   ├── files/            # File upload/download/delete
│   │   ├── export/           # DOCX/PDF export
│   │   ├── ai/               # AI generation (streaming)
│   │   ├── generate/         # Generation workers
│   │   ├── payments/         # Payment checkout + callbacks
│   │   ├── user/             # User profile, 2FA, sessions, export data
│   │   └── health/           # Health check
│   └── layout.tsx / page.tsx
├── components/
│   ├── editor/               # Document tree + preview pane
│   ├── workspace-v2/         # Workspace v2 (three-pane layout, chat)
│   ├── ui/                   # shadcn/ui components
│   └── ...
├── hooks/                    # Custom React hooks
├── stores/                   # Zustand stores (editor, project, assistant, conversations)
├── lib/                      # Core utilities
│   ├── auth.ts               # NextAuth configuration
│   ├── db.ts                 # Prisma client
│   ├── env.ts                # Validated environment variables
│   ├── credits.ts            # Credit system logic
│   ├── storage.ts            # File storage abstraction
│   ├── zai.ts                # AI integration
│   ├── knowledge.ts          # Knowledge base (RAG)
│   └── ...
├── types/                    # TypeScript type definitions
└── prompts/                  # AI prompt templates
prisma/
├── schema.prisma             # Database schema
├── seed.ts                   # Database seed script
└── migrations/               # Prisma migrations
tests/
└── e2e/                      # Playwright E2E tests
```

## Data Model

Key Prisma models:

| Domain | Models |
|--------|--------|
| Auth | `User`, `Account`, `Session`, `VerificationToken`, `PasswordResetToken`, `TotpCredential`, `RecoveryCode` |
| Projects | `Project`, `ProjectBrief`, `DocumentSection` |
| AI Generation | `GenerationJob`, `GenerationRun`, `GenerationAttempt`, `SectionRun` |
| Credits | `Credit`, `CreditTransaction` |
| Payments | `PaymentTransaction`, `Subscription`, `WorkPurchase` |
| Storage | `StoredFile`, `ProjectExport` |
| Knowledge | `KnowledgeSource`, `KnowledgeDocument`, `KnowledgeChunk` |
| Settings | `UserSettings` |

## Development Conventions

### Workflow

1. **Plan first** — Complex tasks require planning before implementation
2. **TDD** — Write tests before implementation (Red-Green-Refactor)
3. **Review** — Check code quality after changes
4. **Verify** — Run linter, type checker, and tests before committing

### Code Quality

- Run `bun run typecheck && bun run lint` before committing
- Strict TypeScript with `noImplicitAny` enabled
- ESLint with Next.js config
- Path alias: `@/*` maps to `./src/*`

### Security Rules

- Never hardcode secrets — use environment variables
- Validate all inputs at system boundaries
- Use parameterized queries (Prisma handles this)
- Run security audit before committing
- CSRF protection on non-GET API routes
- Middleware enforces auth on `/app/**` and `/api/**` routes

### Storage Model

- Project content stays in Postgres (`Project` + `DocumentSection`)
- Binary files tracked through `StoredFile` and `ProjectExport`
- Supabase Storage is production primary
- Cloudflare R2 is fallback (manual or write-fallback mode)
- LOCAL storage for development in `.storage/`
- `.storage/` must stay out of version control

### Database Topology

- Supabase is operational source of truth when configured
- Neon is prepared as fallback
- Automatic write failover is intentionally NOT enabled
- Prisma migrations should always run against primary database

## Internationalization

- Default locale: `pt-MZ` (Portuguese - Mozambique)
- Supported locales: `pt-MZ`, `pt-BR`, `en`
- Locale detection: disabled (explicit user selection)
- Locale stored in `NEXT_LOCALE` cookie

## Testing

- **Unit tests:** `bun test` — files matching `src/**/*.test.ts`
- **E2E tests:** Playwright — configured in `playwright.config.ts`
- E2E tests run against dev server on port 3005
- TDD workflow enforced: 80%+ coverage target

## Key API Endpoints

### Files

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/files/upload-url` | Get signed upload URL |
| PUT | `/api/files/upload-local/:id` | Upload file to local storage |
| POST | `/api/files/complete` | Mark upload as complete |
| GET | `/api/files/:id` | Get file metadata |
| GET | `/api/files/:id/content` | Download file content |
| DELETE | `/api/files/:id` | Delete file |

### Exports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export` | Export project (DOCX/PDF) |
| POST | `/api/export/pdf` | Export as PDF |

## Middleware

- CSRF protection on non-GET API routes (origin validation)
- Auth enforcement on `/app/**` and protected `/api/**` routes
- Public paths: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/offline`
- Auth exemptions: `/api/auth/**`, `/api/demo/**`, `/api/health/**`, `/api/payments/callback/**`
- Locale handling via `NEXT_LOCALE` cookie

## Operational Notes

- Do not reintroduce public claims for hidden features without implementation and tests
- Do not use `.z-ai-config`; AI provider configuration must come from environment variables
- Prefer Supabase as primary Postgres runtime, keep Neon warm as fallback
- Prefer Supabase Storage as primary file storage, keep R2 warm as fallback
- Storage failover is manual by default; `write-fallback` mode is opt-in
