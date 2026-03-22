# appto-grad

`appto-grad` é um assistente académico em `Next.js App Router` com autenticação, projetos, editor, geração por IA, créditos e exportação DOCX.

## Estado atual

- Superfície oficial da aplicação: `/app/...`
- Funcionalidades públicas reais: autenticação, CRUD básico de projetos/secções, geração via IA, créditos, exportação DOCX
- Funcionalidades ainda ocultas/planeadas: RAG local, PDF, streaming real, pagamentos móveis, 2FA e reset de password

## Stack

- `Next.js 16`
- `React 19`
- `Prisma`
- `NextAuth`
- `Bun`
- `SQLite` para desenvolvimento local

## Scripts

```bash
bun install
bun run dev
bun run lint
bun run typecheck
bun run build
bun run test:unit
bun run test:e2e
```

## Variáveis de ambiente mínimas

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
ZAI_API_KEY="replace-me"
```

Opcionalmente:

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
ZAI_BASE_URL="https://api.z.ai/api/paas/v4"
```

## Estrutura principal

- `src/app/page.tsx`: landing page
- `src/app/app/*`: app autenticada oficial
- `src/app/api/*`: rotas API
- `src/components/editor/*`: editor e painel IA
- `src/components/landing/*`: landing pública
- `src/lib/*`: auth, env, prisma, créditos e flags de features
- `prisma/schema.prisma`: schema atual

## Regras operacionais

- Não reintroduzir claims públicas para features ocultas sem implementação e testes.
- Não usar `.z-ai-config`; a configuração do provider de IA deve vir de variáveis de ambiente.
- `db/custom.db` e ficheiros temporários locais não devem voltar ao versionamento.
