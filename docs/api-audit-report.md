# Relatório de Auditoria de APIs — aptto

**Data:** Abril 2026  
**Base de código:** 51 rotas API em `src/app/api/`  
**Stack:** Next.js 16 App Router, Prisma, Zod, NextAuth, TypeScript

---

## 1. Resumo Executivo

A base de APIs do `aptto` está **arquitecturalmente sólida** e segue padrões modernos de desenvolvimento com Next.js App Router. A maioria das rotas implementa autenticação, validação de input, serialização consistente e tratamento de erros. Contudo, existem **12 problemas identificados** que variam de críticos a informativos, com impacto em segurança, consistência, performance e aderência a padrões REST modernos.

**Pontuação global: 7.5/10**

---

## 2. Inventário Completo de Rotas

### 2.1 Autenticação e Utilizador
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/auth/register` | POST | Público | ✅ Bom |
| `/api/auth/forgot-password` | POST | Público | ✅ Bom |
| `/api/auth/reset-password` | POST | Público | ✅ Bom |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth | ✅ Padrão |
| `/api/user` | GET, PATCH | Sessão | ⚠️ 1 problema |
| `/api/user/password` | PATCH | Sessão | ✅ Bom |
| `/api/user/delete` | DELETE | Sessão | ✅ Bom |
| `/api/user/sessions` | GET, DELETE | Sessão | ✅ Bom |
| `/api/user/sessions/[id]` | DELETE | Sessão | ✅ Bom |
| `/api/user/2fa/setup` | POST | Sessão | ✅ Bom |
| `/api/user/2fa/verify` | POST | Sessão | ✅ Bom |
| `/api/user/2fa/disable` | POST | Sessão | ✅ Bom |

### 2.2 Projectos e Documentos
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/projects` | GET, POST | Sessão | ⚠️ 2 problemas |
| `/api/projects/[id]` | GET, PUT, DELETE | Sessão | ⚠️ 3 problemas |
| `/api/projects/[id]/regenerate` | POST | Sessão | ✅ Bom |
| `/api/projects/[id]/exports` | GET | Sessão | ✅ Bom |
| `/api/projects/[id]/export/save` | POST | Sessão | ✅ Bom |
| `/api/documents` | GET, POST | Sessão | ⚠️ 1 problema |
| `/api/documents/[id]` | PUT, DELETE | Sessão | ✅ Bom |
| `/api/documents/reorder` | POST | Sessão | ✅ Bom |

### 2.3 Geração e IA
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/ai` | POST, GET | Sessão | ✅ Bom |
| `/api/ai/stream` | POST | Sessão | ✅ Bom |
| `/api/generate/work` | POST | Sessão | ✅ Bom |
| `/api/generate/work/[id]` | GET | Sessão | ✅ Bom |
| `/api/generate/work/[id]/stream` | GET | Sessão | ✅ Bom |

### 2.4 Pagamentos e Billing
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/subscription` | GET, POST, DELETE | Sessão | ✅ Bom |
| `/api/credits` | GET, POST | Sessão | ⚠️ 1 problema |
| `/api/payments/checkout` | POST | Sessão | ⚠️ 1 problema |
| `/api/payments/callback/[provider]` | POST | Webhook | ✅ Bom |
| `/api/payments/[id]` | GET | Sessão | ✅ Bom |

### 2.5 Exportação
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/export` | POST | Sessão | ✅ Bom |
| `/api/export/pdf` | POST | Sessão | ✅ Bom |
| `/api/user/export` | GET | Sessão | ✅ Bom |

### 2.6 Ficheiros
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/files/[id]` | GET, DELETE | Sessão | ✅ Bom |
| `/api/files/[id]/content` | GET | Sessão | ✅ Bom |
| `/api/files/upload-url` | POST | Sessão | ✅ Bom |
| `/api/files/upload-local/[id]` | POST | Sessão | ✅ Bom |
| `/api/files/complete` | POST | Sessão | ✅ Bom |

### 2.7 Admin e Operacional
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/admin/rag/sources` | GET, POST | Admin | ✅ Bom |
| `/api/admin/rag/ingest` | POST | Admin | ✅ Bom |
| `/api/admin/rag/ingest-file` | POST | Admin | ✅ Bom |
| `/api/admin/rag/search` | POST | Admin | ✅ Bom |
| `/api/admin/metrics/summary` | GET | Admin | ✅ Bom |
| `/api/internal/workers/run` | POST | Secret/Admin | ✅ Bom |

### 2.8 Utilidades
| Rota | Métodos | Auth | Status |
|------|---------|------|--------|
| `/api/` | GET | Público | ⚠️ 1 problema |
| `/api/health` | GET | Público | ✅ Bom |
| `/api/demo/outline` | POST | Público | ✅ Bom |
| `/api/cover-templates` | GET, POST | Sessão | ✅ Bom |
| `/api/works/[id]/cover-template` | GET | Sessão | ✅ Bom |
| `/api/settings` | GET, PATCH | Sessão | ✅ Bom |
| `/api/debug/session` | GET | Admin | ✅ Bom |

---

## 3. Análise Detalhada por Critério

### 3.1 Segurança e Autenticação

**Pontos fortes:**
- Todas as rotas protegidas verificam sessão com `getServerSession(authOptions)`
- Webhook de pagamento implementa verificação HMAC com `timingSafeEqual`
- Rate limiting aplicado em rotas sensíveis (auth, subscription, demo, callbacks)
- Distributed locks em operações críticas (pagamentos, exportação, regeneração)
- Admin routes verificam `session.user.role === "ADMIN"`
- Internal worker route aceita tanto `x-worker-secret` como sessão admin

**Problemas identificados:**

| # | Severidade | Rota | Descrição |
|---|-----------|------|-----------|
| S1 | **Médio** | `/api/user` (GET) | Expõe `credits` e `usedCredits` no response mesmo após migração para modelo de pacotes. Campo legado que já não representa a verdade comercial. |
| S2 | **Baixo** | `/api/payments/callback/[provider]` | O callback retorna `apiError` com 401/400/404 antes de verificar lock. Em produção, um atacante pode enumerar payment IDs válidos vs inválidos pelo código de erro diferente. |

### 3.2 Validação de Input

**Pontos fortes:**
- Uso consistente de Zod schemas em `src/lib/validators.ts`
- `parseBody()` helper com tipagem genérica
- `handleApiError()` centraliza erros de validação
- Schemas bem definidos: `createProjectSchema`, `updateProjectSchema`, `createDocumentSchema`, `aiRequestSchema`, etc.

**Problemas identificados:**

| # | Severidade | Rota | Descrição |
|---|-----------|------|-----------|
| V1 | **Médio** | `/api/documents` (POST) | Usa `safeParse` manualmente em vez de `parseBody()`, inconsistente com o padrão do projecto. |
| V2 | **Baixo** | `/api/projects` (GET) | `where: any` — tipo `any` permite query injection acidental. Deveria usar tipo tipado do Prisma. |

### 3.3 Consistência de Respostas

**Pontos fortes:**
- Helper `apiSuccess()` e `apiError()` centralizados em `src/lib/api.ts`
- Formato de erro consistente: `{ error, code?, details? }`
- Status codes apropriados: 201 para criação, 401 para auth, 403 para limites, 404 para não encontrado, 429 para rate limit, 500 para erros internos

**Problemas identificados:**

| # | Severidade | Rota | Descrição |
|---|-----------|------|-----------|
| C1 | **Baixo** | `/api/projects` (GET, POST) | Não usa `apiSuccess()`/`apiError()` — usa `NextResponse.json()` directamente, inconsistente com o resto do projecto. |
| C2 | **Baixo** | `/api/documents` (GET, POST) | Mesmo problema: não usa os helpers centralizados. |
| C3 | **Baixo** | `/api/projects/[id]` (GET, PUT, DELETE) | Mesmo problema: não usa os helpers centralizados. |
| C4 | **Médio** | `/api/` (GET) | Retorna `{ message: "Hello, world!" }` — endpoint de desenvolvimento que não deveria existir em produção. |

### 3.4 Design REST e Convenções

**Pontos fortes:**
- Recursos bem organizados: `/api/projects`, `/api/documents`, `/api/files`
- Sub-recursos correctamente aninhados: `/api/projects/[id]/exports`
- Métodos HTTP semanticamente correctos: GET para leitura, POST para criação, PUT para update, DELETE para remoção
- Query params para filtros: `?status=`, `?type=`, `?search=`, `?sortBy=`, `?sortOrder=`

**Problemas identificados:**

| # | Severidade | Rota | Descrição |
|---|-----------|------|-----------|
| R1 | **Médio** | `/api/export` e `/api/export/pdf` | Deveriam ser `/api/projects/[id]/export` como sub-recurso. Actualmente são endpoints soltos que não seguem hierarquia REST. |
| R2 | **Médio** | `/api/credits` e `/api/payments/checkout` | Endpoints legados que deveriam estar desactivados ou marcados como deprecated. `/api/payments/checkout` retorna 410 mas ainda existe. |
| R3 | **Baixo** | `/api/documents` | Deveria ser `/api/projects/[id]/sections` para seguir a hierarquia do domínio. |

### 3.5 Performance e N+1

**Pontos fortes:**
- Uso correcto de `include` e `select` para evitar over-fetching
- `Promise.all` para serialização paralela de projectos
- Transacções atómicas para operações compostas (`db.$transaction`)
- Rate limiting em rotas de alto custo

**Problemas identificados:**

| # | Severidade | Rota | Descrição |
|---|-----------|------|-----------|
| P1 | **Médio** | `/api/projects` (GET) | `serializeProject` chama `getWorkGenerationStatusAsync` para cada projecto. Se o utilizador tem 50 projectos, são 50 chamadas adicionais à DB. Deveria ser batch. |
| P2 | **Baixo** | `/api/projects/[id]/regenerate` (POST) | `getWorkGenerationStatusAsync` é chamado antes do lock, depois novamente dentro do worker. Redundante. |

### 3.6 Observabilidade e Logging

**Pontos fortes:**
- `logger` centralizado em `src/lib/logger.ts` com JSON estruturado
- Audit logging em callbacks de pagamento
- `trackProductEvent` para métricas de produto
- `logOperationalEvent` para rate limits, locks e fallback de IA

**Problemas identificados:**

| # | Severidade | Rota | Descrição |
|---|-----------|------|-----------|
| O1 | **Médio** | `/api/projects`, `/api/projects/[id]`, `/api/documents` | Usam `console.error()` em vez de `logger.error()`. Inconsistente e não gera logs estruturados. |
| O2 | **Baixo** | `/api/user` (GET) | Nenhum logging de acesso a dados sensíveis do utilizador. |

### 3.7 Tratamento de Erros

**Pontos fortes:**
- `handleApiError()` centraliza ZodError, RateLimitError e erros genéricos
- Mensagens de erro em português moçambicano
- Códigos de erro específicos: `VALIDATION_ERROR`, `RATE_LIMITED`, `LIMIT_REACHED`

**Problemas identificados:**

| # | Severidade | Rota | Descrição |
|---|-----------|------|-----------|
| E1 | **Médio** | `/api/projects` (POST) | Em caso de erro na transacção, o trabalho já foi consumido mas o projecto pode não ter sido criado. Falta rollback explícito do `consumeWork`. |
| E2 | **Baixo** | Múltiplas rotas | `handleApiError()` retorna `400` para qualquer `Error`, mesmo erros de servidor. Deveria distinguir entre 4xx e 5xx. |

---

## 4. Problemas por Severidade

### Críticos (0)
Nenhum problema crítico identificado.

### Altos (0)
Nenhum problema de alta severidade identificado.

### Médios (8)
| ID | Descrição | Rota(s) |
|----|-----------|---------|
| S1 | Campos legados de créditos expostos no response | `/api/user` |
| V1 | Validação inconsistente (safeParse vs parseBody) | `/api/documents` |
| V2 | Tipo `any` em query builder | `/api/projects` |
| C4 | Endpoint de desenvolvimento em produção | `/api/` |
| R1 | Endpoints de export fora da hierarquia REST | `/api/export`, `/api/export/pdf` |
| R2 | Endpoints legados ainda activos | `/api/credits`, `/api/payments/checkout` |
| P1 | N+1 queries na listagem de projectos | `/api/projects` (GET) |
| O1 | Logging inconsistente (console vs logger) | `/api/projects`, `/api/documents` |
| E1 | Falta rollback de consumeWork em erro | `/api/projects` (POST) |
| E2 | handleApiError retorna 400 para erros 5xx | Múltiplas rotas |

### Baixos (5)
| ID | Descrição | Rota(s) |
|----|-----------|---------|
| S2 | Enumeração de payment IDs por código de erro | `/api/payments/callback/[provider]` |
| C1-C3 | Inconsistência no uso de apiSuccess/apiError | `/api/projects`, `/api/documents` |
| R3 | Naming de recursos não ideal | `/api/documents` |
| P2 | Chamada redundante de status | `/api/projects/[id]/regenerate` |
| O2 | Falta logging de acesso a dados sensíveis | `/api/user` |

---

## 5. Comparação com Padrões da Indústria

### O que está acima da média ✅
- **Validação de input:** Zod com schemas tipados é o padrão moderno e está bem implementado.
- **Autenticação:** NextAuth com session-based auth é sólido e bem integrado.
- **Rate limiting:** Implementação com adapter por ambiente (MEMORY/UPSTASH) é avançada.
- **Distributed locks:** Implementação com fallback memory/Redis é excelente para produção.
- **Webhook security:** HMAC verification com timing-safe comparison é correcto.
- **Idempotência:** Callbacks de pagamento com verificação de duplicados.
- **Observabilidade:** Product events, operational events, audit logging.

### O que está na média ⚠️
- **REST resource hierarchy:** Geralmente bom, mas com algumas excepções (export, documents).
- **Error handling:** Centralizado mas com gaps na distinção 4xx/5xx.
- **Serialization:** Consistente mas com duplicação de código entre rotas.

### O que está abaixo da média ❌
- **N+1 queries:** A listagem de projectos com serialização individual não escala.
- **Endpoint de desenvolvimento:** `/api/` com "Hello, world!" não deveria existir.
- **Campos legados expostos:** Créditos no response do user endpoint.
- **Logging inconsistente:** Mistura de `console.error()` e `logger.error()`.

---

## 6. Recomendações Priorizadas

### P0 — Corrigir agora
1. **Remover `/api/`** ou transformar em health check com versão da API
2. **Remover campos de créditos legados** do response de `/api/user`
3. **Corrigir N+1** em `/api/projects` (GET) com batch query
4. **Unificar logging** — substituir todos os `console.error()` por `logger.error()`

### P1 — Corrigir na próxima sprint
5. **Unificar error handling** — todas as rotas devem usar `apiSuccess()`/`apiError()`
6. **Mover exportação para hierarquia REST** — `/api/projects/[id]/export`
7. **Desactivar endpoints legados** — `/api/credits`, `/api/payments/checkout`
8. **Corrigir rollback de consumeWork** em caso de erro na criação do projecto

### P2 — Melhorias de qualidade
9. **Tipar queries** — remover `any` de `where` clauses
10. **Adicionar correlation ID** a todas as respostas via header `X-Request-ID`
11. **Adicionar paginação** a `/api/projects` (GET) com `?limit=` e `?cursor=`
12. **Adicionar versioning** de API via header ou URL prefix (`/api/v1/`)

---

## 7. Conclusão

A base de APIs do `aptto` está **bem desenhada e funcional**. A maioria dos problemas identificados são de **consistência e maturidade operacional**, não de arquitectura fundamental. O projecto já implementa padrões avançados (distributed locks, rate limiting adaptativo, webhook security, observabilidade) que muitos produtos em produção não têm.

Os 8 problemas de severidade média são **correctáveis em 1-2 dias de trabalho** e elevariam a qualidade geral de 7.5/10 para **9/10**.

---

*Relatório gerado com base na análise de 51 rotas API, 12 ficheiros de suporte e padrões da indústria para Next.js App Router, REST API design e segurança de aplicações web.*
