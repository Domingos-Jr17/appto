# Architecture

## Overview

appto-grad is a Next.js 16 App Router application for academic writing assistance. It uses a server-first architecture with React Server Components, API routes for mutations, and PostgreSQL for persistence.

## High-level architecture

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Landing  │  │  Auth    │  │  App (auth'd) │  │
│  │  Page    │  │  Pages   │  │  /app/*       │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │              API Routes /api/*           │    │
│  │  auth | projects | docs | credits | ai  │    │
│  │  files | export | payments | user | ... │    │
│  └──────────────────────────────────────────┘    │
│                     │                            │
│  ┌──────────────────┼──────────────────────┐     │
│  │                  │   Lib Layer          │     │
│  │  auth.ts │ db.ts │ credits │ storage    │     │
│  │  env.ts  │ zai.ts│ payments│ files      │     │
│  └──────────────────┼──────────────────────┘     │
│                     │                            │
└─────────────────────┼────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │PostgreSQL│  │  AI API  │  │  R2 /    │
  │ (Prisma) │  │  (Z-AI)  │  │  LOCAL   │
  └──────────┘  └──────────┘  └──────────┘
```

## Key domains

### Authentication & Users
- **NextAuth** with credentials provider (email/password) and Google OAuth
- **2FA** via TOTP (otplib) with recovery codes
- Password reset flow with hashed tokens
- Session audit logging
- Files: `src/lib/auth.ts`, `src/lib/auth-security.ts`, `src/app/api/auth/`

### Projects & Documents
- `Project` contains metadata (title, type, education level, status)
- `DocumentSection` is a tree structure (parent/children) with content and ordering
- Project types: Monography, Dissertation, Thesis, Article, Essay, Report, School Work, Research Project, Internship Report, Practical Work, TCC
- Files: `src/app/api/projects/`, `src/app/api/documents/`, `src/components/workspace-v2/`

### Editor
- MDXEditor for rich text editing
- Document tree for section navigation
- Autosave with debounce
- Preview pane
- Files: `src/components/editor/`, `src/stores/editor-store.ts`

### AI Generation
- Z-AI SDK integration with streaming support
- AI response caching
- Knowledge base (RAG) for contextual generation
- Credit cost per generation
- Files: `src/lib/zai.ts`, `src/lib/ai-cache.ts`, `src/lib/knowledge.ts`, `src/app/api/ai/`

### Credits & Payments
- Canonical billing model: FREE, STARTER, PRO plus extra works
- Subscription tracks monthly work allowance and resets
- WorkPurchase stores paid extra works with expiry
- PaymentTransaction stores checkout state, callbacks and audit trail
- Payment methods: SIMULATED (dev/beta), MPESA, EMOLA via gateway configuration
- Files: `src/lib/credits.ts`, `src/lib/credit-ledger.ts`, `src/lib/payments.ts`

### File Storage
- Storage abstraction supporting Supabase Storage as primary, Cloudflare R2 as fallback, and LOCAL for dev
- `StoredFile` tracks metadata (kind, provider, bucket, object key, status)
- `ProjectExport` links exports to projects
- File kinds: AVATAR, EXPORT, UPLOAD, KNOWLEDGE_SOURCE, ATTACHMENT
- Files: `src/lib/storage.ts`, `src/lib/files.ts`, `src/app/api/files/`

### Exports
- DOCX generation via `docx` library
- PDF generation via `@react-pdf/renderer`
- Exports can be persisted (attached to project) or downloaded directly
- Files: `src/lib/document-export.tsx`, `src/app/api/export/`

### Knowledge Base (RAG)
- `KnowledgeSource` → `KnowledgeDocument` → `KnowledgeChunk` hierarchy
- Supports PUBLIC, INSTITUTIONAL, PRIVATE source types
- Chunks store embedding JSON for vector search
- Files: `src/lib/knowledge.ts`

## State management

| Store | Purpose | File |
|-------|---------|------|
| `editor-store` | Editor state, active section, content | `src/stores/editor-store.ts` |
| `project-store` | Project list, active project | `src/stores/project-store.ts` |
| `assistant-store` | AI assistant chat state | `src/stores/assistant-store.ts` |
| `workspace-conversations-store` | Workspace chat conversations | `src/stores/workspace-conversations-store.ts` |

Server state is managed via **TanStack React Query**.

## Workspace versions

Two workspace implementations coexist:

1. **workspace/** (v1) — Shell-based layout with sidebar and header
2. **workspace-v2/** — Three-pane layout (sidebar, document panel, chat pane)

The v2 workspace is the active implementation for `/app/sessoes/[id]`.

## Routing

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth pages |
| `/app` | Dashboard |
| `/app/sessoes` | Sessions/projects list |
| `/app/sessoes/:id` | Project workspace |
| `/app/projects` | Redirects to `/app/sessoes` |
| `/app/projects/:id` | Redirects to `/app/sessoes/:id` |
| `/app/credits` | Credits management |
| `/app/settings` | User settings |

## Environment validation

All environment variables are validated at startup via Zod in `src/lib/env.ts`. The app will not start with invalid configuration.

## Production deployment

- **Database:** Supabase PostgreSQL as primary, Neon PostgreSQL as operational fallback
- **File storage:** Supabase Storage as primary, Cloudflare R2 as controlled fallback
- **Runtime:** Bun with standalone Next.js output
- **Proxy:** Caddy (see `Caddyfile`)
- **Email:** Resend
