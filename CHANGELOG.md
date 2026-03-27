# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-03

### Added
- Workspace v2 with three-pane layout (project sidebar, document panel, chat pane)
- Knowledge base system (RAG) with `KnowledgeSource`, `KnowledgeDocument`, `KnowledgeChunk` models
- File storage pipeline with `StoredFile` and `ProjectExport` models
- Cloudflare R2 storage support via S3-compatible API
- Two-factor authentication (TOTP) with recovery codes
- Auth session audit logging
- Payment system with SIMULATED, MPESA, and EMOLA providers
- Health check endpoint (`/api/health`)
- Rate limiting middleware
- Structured logging
- Input validation with Zod (`src/lib/validators.ts`)
- User data export endpoint
- Account deletion endpoint
- Email service integration via Resend
- Demo outline endpoint for landing page
- `next-intl` internationalization (default: pt-MZ)
- Zustand stores for editor, project, assistant, and workspace conversations
- TanStack React Query for server state management
- TanStack React Table for data tables
- MDXEditor for rich text editing
- Framer Motion animations on landing page
- E2E tests with Playwright (auth flow, landing smoke, project CRUD)

### Changed
- Migrated database from SQLite to PostgreSQL
- Migrated from base64 avatar storage to file pipeline
- Updated to Next.js 16 with standalone output
- Updated to React 19
- Updated to Tailwind CSS v4
- Routes under `/app/projects` now redirect to `/app/sessoes`

### Fixed
- Environment variable validation with Zod schema
- Auth secret handling (supports both `AUTH_SECRET` and `NEXTAUTH_SECRET`)

## [0.1.0] - 2026-01

### Added
- Initial project setup with Next.js App Router
- Basic authentication with NextAuth (credentials + Google OAuth)
- Project and document section CRUD
- AI text generation
- Credits system
- DOCX/PDF export
- Landing page with demo outline
- User settings (profile, security)
- Prisma schema with PostgreSQL
