# appto-grad

`appto-grad` é um assistente académico em `Next.js App Router` com autenticação, projetos, editor, geração por IA, créditos, exportação e storage de ficheiros.

## Estado atual

- Superfície oficial da aplicação: `/app/...`
- Funcionalidades reais: autenticação, CRUD de projetos/secções, geração via IA, créditos, exportação DOCX/PDF, demo pública de outline, 2FA/reset password, pagamentos simulados e storage de ficheiros
- Produção recomendada: `Neon Postgres` + `Cloudflare R2`
- Desenvolvimento local: `SQLite` + storage local em `.storage/`

## Stack

- `Next.js 16`
- `React 19`
- `Prisma`
- `NextAuth`
- `Bun`
- `Cloudflare R2` via API S3 compatível

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
```

## Variáveis de ambiente mínimas

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
ZAI_API_KEY="replace-me"
STORAGE_PROVIDER="LOCAL"
STORAGE_LOCAL_ROOT=".storage"
```

## Variáveis opcionais

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
ZAI_BASE_URL="https://api.z.ai/api/paas/v4"
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""
PAYMENT_DEFAULT_PROVIDER="SIMULATED"

R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
R2_PUBLIC_BASE_URL=""
```

## Storage

- O conteúdo canónico do trabalho continua na base de dados (`Project` + `DocumentSection`).
- Ficheiros binários usam `StoredFile` e `ProjectExport`.
- Em `LOCAL`, uploads e exportações persistidas vão para `.storage/`.
- Em `R2`, a app usa URLs assinadas para upload/download.
- Avatar deixa de usar base64 demo e passa a usar o pipeline de ficheiros.
- Exportações diretas continuam a ser descarregadas sem persistência obrigatória.
- Exportações guardadas ficam ligadas ao projeto via `ProjectExport`.

### Endpoints de ficheiros

- `POST /api/files/upload-url`
- `PUT /api/files/upload-local/:id`
- `POST /api/files/complete`
- `GET /api/files/:id`
- `GET /api/files/:id/content`
- `DELETE /api/files/:id`
- `GET /api/projects/:id/exports`
- `POST /api/projects/:id/export/save`

### Configuração recomendada do bucket R2

- Bucket privado por defeito
- CORS a permitir o origin da app, `PUT`, `GET` e `HEAD`
- Uso de URLs assinadas para upload e leitura
- Não usar nomes originais como chave principal do objeto

## Estrutura principal

- `src/app/page.tsx`: landing page
- `src/app/app/*`: app autenticada oficial
- `src/app/api/*`: rotas API
- `src/components/editor/*`: editor e exportação
- `src/components/settings/*`: perfil, segurança e conta
- `src/lib/*`: auth, env, prisma, créditos, storage e features
- `prisma/schema.prisma`: schema atual

## Regras operacionais

- Não reintroduzir claims públicas para features ocultas sem implementação e testes.
- Não usar `.z-ai-config`; a configuração do provider de IA deve vir de variáveis de ambiente.
- `.storage/`, bases locais e ficheiros temporários não devem voltar ao versionamento.
- Em produção, preferir `Neon` para Postgres e `Cloudflare R2` para storage.
