# Backlog priorizado da auditoria técnica — branch `dev`

> **Status (2026-03-27):** Este documento foi gerado durante a auditoria inicial. Vários itens já foram parcial ou totalmente resolvidos:
>
> | Issue | Status | Notas |
> |-------|--------|-------|
> | 1 (Git hygiene) | **Parcial** | `.gitignore` atualizado, mas `db/custom.db` ainda presente |
> | 2 (TypeScript/lint) | **Parcial** | `noImplicitAny: false` ainda ativo; `ignoreBuildErrors` removido do `next.config.ts` |
> | 3 (Consolidar estrutura) | **Parcial** | `workspace-v2/` existe como alternativa ao `workspace/`; `projects/` redireciona para `sessoes/` |
> | 4 (Claims vs realidade) | **Pendente** | |
> | 5 (Validação API) | **Parcial** | `zod` adicionado; validação em `env.ts` e `validators.ts` |
> | 6 (Autosave editor) | **Pendente** | |
> | 7 (Editor robusto) | **Parcial** | `MDXEditor` integrado |
> | 8 (Créditos/billing) | **Parcial** | `credit-ledger.ts` e `payments.ts` implementados |
> | 9 (SQLite → PostgreSQL) | **Concluído** | PostgreSQL com Prisma; schema completo com 17 modelos |
> | 10 (Rate limiting/observabilidade) | **Parcial** | `rate-limit.ts`, `logger.ts`, `/api/health` implementados |
> | 11 (Documentação) | **Parcial** | README e CHANGELOG atualizados |
> | 12 (Demo landing) | **Pendente** | |

Este documento converte a auditoria técnica em issues executáveis, prontas para serem copiadas para o GitHub Issues.

---

## ISSUE 1 — Remover ficheiros temporários/sensíveis do repositório e endurecer higiene do git

**Tipo:** Segurança / DevEx  
**Prioridade:** P0  
**Labels sugeridas:** `security`, `devops`, `cleanup`, `high-priority`

### Contexto
A branch `dev` contém artefactos temporários/sensíveis versionados, incluindo ficheiros de cookies, login e CSRF. Isto é um risco de segurança e um sinal de processo frágil.

### Objetivo
Garantir que nenhum ficheiro temporário, credencial, log sensível ou artefacto local volte a ser commitado.

### Escopo
- remover do versionamento ficheiros temporários e sensíveis já presentes;
- rever e endurecer `.gitignore`;
- criar convenções para logs, cookies, dumps e ficheiros locais;
- validar que não existem segredos ou tokens expostos no histórico recente.

### Critérios de aceitação
- ficheiros temporários/sensíveis removidos da branch `dev`;
- `.gitignore` actualizado com padrões adequados;
- repositório validado sem artefactos locais indevidos;
- documentação curta adicionada ao repo sobre o que nunca deve ser commitado.

### Notas técnicas
Incluir padrões como: `.tmp-*`, `*.log`, `.env*`, cookies, dumps locais, artefactos de sessão e bases locais temporárias.

---

## ISSUE 2 — Reativar guardrails de qualidade: TypeScript, lint e build confiável

**Tipo:** Engenharia / Qualidade  
**Prioridade:** P0  
**Labels sugeridas:** `tech-debt`, `typescript`, `lint`, `quality`

### Contexto
O projecto está configurado para deixar passar erros relevantes, incluindo `ignoreBuildErrors: true` e várias regras críticas de ESLint desligadas.

### Objetivo
Fazer com que a build falhe quando existir erro real, restaurando confiança no pipeline.

### Escopo
- remover `typescript.ignoreBuildErrors`;
- rever `eslint.config.mjs` e reactivar regras essenciais;
- corrigir os erros reais que surgirem;
- reavaliar `reactStrictMode`;
- reduzir o uso de `any` em áreas críticas.

### Critérios de aceitação
- build falha em caso de erro real de TypeScript;
- lint cobre pelo menos regras críticas de hooks, variáveis não usadas e tipos explícitos inseguros;
- branch `dev` compila sem ignorar erros;
- criado comando/documentação clara para validação local antes de commit.

### Dependências
Pode gerar subtarefas por domínio: auth, editor, rotas API, dashboard.

---

## ISSUE 3 — Consolidar a estrutura da app e remover duplicação entre `src/app/(app)` e `src/app/app`

**Tipo:** Arquitetura / Refactor  
**Prioridade:** P0  
**Labels sugeridas:** `architecture`, `refactor`, `frontend`, `backend`

### Contexto
Hoje coexistem duas estruturas de páginas, uma antiga com mocks e outra nova com integração real. Isso aumenta ambiguidade e dívida técnica.

### Objetivo
Definir uma única árvore de aplicação como fonte de verdade.

### Escopo
- identificar páginas activas e páginas legadas;
- remover ou arquivar a estrutura antiga;
- alinhar imports, rotas e navegação;
- validar que nenhuma rota consumida em produção depende da versão mockada.

### Critérios de aceitação
- existe apenas uma estrutura oficial da app para dashboard/editor/credits/settings;
- rotas mockadas removidas ou explicitamente arquivadas;
- navegação interna consistente;
- documentação curta sobre a nova estrutura adicionada ao repo.

---

## ISSUE 4 — Alinhar claims de produto com a implementação real

**Tipo:** Produto / Conteúdo / Credibilidade  
**Prioridade:** P0  
**Labels sugeridas:** `product`, `content`, `marketing`, `high-priority`

### Contexto
A landing, pricing e FAQ hoje fazem claims acima do que o backend implementa de facto, especialmente em pagamentos, RAG local e algumas promessas operacionais.

### Objetivo
Eliminar desalinhamento entre marketing e realidade técnica.

### Escopo
- rever homepage, pricing, FAQ e páginas internas;
- remover ou reformular claims como pagamento seguro/redireccionamento real quando ainda for simulado;
- reformular menções a RAG local se a feature não existir de forma operacional;
- explicitar claramente o que é demo, beta, simulado ou roadmap.

### Critérios de aceitação
- nenhuma secção do site promete uma feature inexistente;
- FAQ e pricing batem certo com o backend actual;
- demo simulada é identificada como demo, ou substituída por fluxo real;
- copy final revista para manter credibilidade do produto.

---

## ISSUE 5 — Implementar validação forte nas rotas API com contratos consistentes

**Tipo:** Backend / Segurança  
**Prioridade:** P1  
**Labels sugeridas:** `backend`, `api`, `validation`, `security`

### Contexto
As rotas aceitam payloads com validação fraca, uso de `any` e contratos pouco explícitos.

### Objetivo
Padronizar entradas e saídas das APIs com validação forte.

### Escopo
- introduzir `zod` nas rotas principais (`auth/register`, `projects`, `documents`, `credits`, `ai`, `export`);
- normalizar mensagens de erro e status HTTP;
- validar enums, limites numéricos, strings vazias e payloads inválidos;
- evitar `sortBy` e parâmetros dinâmicos sem whitelist.

### Critérios de aceitação
- todas as rotas críticas validam request body e query params;
- respostas de erro seguem padrão consistente;
- inputs inválidos retornam erro claro sem stack ou comportamento inesperado;
- tipos compartilhados reutilizáveis criados quando fizer sentido.

---

## ISSUE 6 — Corrigir autosave e persistência do editor

**Tipo:** Frontend / Editor  
**Prioridade:** P1  
**Labels sugeridas:** `editor`, `frontend`, `bug`, `ux`

### Contexto
O autosave actual usa debounce frágil e pode gerar saves concorrentes. Além disso, a persistência do título e de alguns estados do editor não está clara.

### Objetivo
Tornar a edição confiável e previsível.

### Escopo
- corrigir debounce/autosave com cleanup real;
- persistir título de secção de forma explícita;
- impedir race conditions entre seleção de secção e save pendente;
- actualizar word count e estado salvo/erro de modo consistente;
- melhorar feedback visual de salvamento.

### Critérios de aceitação
- editar conteúdo não gera múltiplos requests desnecessários;
- trocar de secção preserva alterações correctamente;
- título e conteúdo persistem com fiabilidade;
- estado de autosave comunica claramente `saving`, `saved` e `error`.

---

## ISSUE 7 — Substituir editor baseado em `contentEditable`/`execCommand` por base mais robusta

**Tipo:** Frontend / Arquitetura  
**Prioridade:** P1  
**Labels sugeridas:** `editor`, `architecture`, `frontend`, `improvement`

### Contexto
O núcleo do produto depende de edição académica, mas o editor actual usa abordagem frágil para formatação rica.

### Objetivo
Adoptar uma base editor robusta e extensível.

### Escopo
- avaliar opções já compatíveis com o stack;
- suportar headings, listas, citações, alinhamento, shortcuts e futura integração de sugestões de IA;
- definir estratégia de serialização persistente;
- preparar terreno para comentários, sugestões, referências e revisão.

### Critérios de aceitação
- editor suporta operações básicas de formatação de forma estável;
- serialização e re-hidratação do conteúdo são confiáveis;
- toolbar reflecte o estado real do texto;
- preparado para expansão futura sem hacks locais.

---

## ISSUE 8 — Refactorizar domínio de créditos, billing e transações

**Tipo:** Backend / Produto  
**Prioridade:** P1  
**Labels sugeridas:** `billing`, `backend`, `domain`, `tech-debt`

### Contexto
A lógica de créditos está espalhada e já apresenta inconsistências entre backend, UI e FAQ.

### Objetivo
Centralizar regras de créditos e preparar base para billing real.

### Escopo
- criar camada de serviço para créditos e transações;
- centralizar tabela oficial de custos por ação;
- alinhar pricing, FAQ e consumo real;
- rever criação de créditos iniciais, compras, consumo, reembolsos e exportações;
- preparar estrutura para integração futura com pagamentos reais.

### Critérios de aceitação
- custo de cada ação definido num único lugar;
- UI e backend usam a mesma fonte de verdade;
- inconsistências de custo removidas;
- transações registram metadata útil e consistente.

---

## ISSUE 9 — Migrar de SQLite para PostgreSQL e preparar persistência de produção

**Tipo:** Infraestrutura / Base de dados  
**Prioridade:** P1  
**Labels sugeridas:** `database`, `infra`, `production`, `prisma`

### Contexto
SQLite é aceitável para desenvolvimento inicial, mas não sustenta bem um produto multiutilizador sério em produção.

### Objetivo
Preparar a aplicação para ambiente real com base de dados apropriada.

### Escopo
- adaptar Prisma para PostgreSQL;
- criar estratégia de migração de dados local/dev;
- rever índices e constraints principais;
- validar compatibilidade das rotas e seed;
- documentar setup de desenvolvimento e produção.

### Critérios de aceitação
- app funciona com PostgreSQL em ambiente de desenvolvimento/produção;
- migrations e seed executam com previsibilidade;
- documentação de setup actualizada;
- sem regressões nos fluxos de auth, projectos, documentos e créditos.

---

## ISSUE 10 — Introduzir rate limiting, observabilidade e hardening mínimo de produção

**Tipo:** Segurança / Operações  
**Prioridade:** P1  
**Labels sugeridas:** `security`, `observability`, `production`, `ops`

### Contexto
Não há sinais claros de rate limiting, health checks, métricas ou observabilidade básica nas rotas mais sensíveis.

### Objetivo
Adicionar proteções mínimas e visibilidade operacional.

### Escopo
- rate limiting para rotas de auth, IA, créditos e registo;
- logs estruturados e menos verbosos em produção;
- remover logs de query Prisma em produção;
- adicionar health endpoint ou mecanismo equivalente;
- preparar monitorização básica de erros e latência.

### Critérios de aceitação
- rotas críticas protegidas contra abuso básico;
- logs sensíveis reduzidos em produção;
- existe forma clara de verificar saúde da app;
- erros relevantes podem ser rastreados sem expor dados sensíveis.

---

## ISSUE 11 — Implementar documentação mínima do projeto e onboarding técnico

**Tipo:** DevEx / Documentação  
**Prioridade:** P2  
**Labels sugeridas:** `documentation`, `devex`, `onboarding`

### Contexto
O repositório não oferece onboarding claro nem documentação técnica mínima.

### Objetivo
Tornar o projeto compreensível para manutenção e colaboração.

### Escopo
- criar `README.md` com visão geral, stack, setup, comandos e envs;
- documentar arquitetura de alto nível;
- listar fluxos principais do produto;
- explicar seed, dados de teste e limites conhecidos.

### Critérios de aceitação
- novo dev consegue levantar o projeto seguindo a documentação;
- comandos principais documentados;
- envs e dependências listados claramente;
- backlog técnico principal referenciado.

---

## ISSUE 12 — Revisar a demo da landing para usar fluxo real ou sinalização honesta de simulação

**Tipo:** Produto / Frontend  
**Prioridade:** P2  
**Labels sugeridas:** `frontend`, `product`, `landing`, `ux`

### Contexto
A demo principal da homepage é simulada com mock local, mas transmite sensação de geração real.

### Objetivo
Aumentar confiança na experiência da landing.

### Escopo
- substituir a demo por um endpoint real controlado, ou;
- manter demo simulada com sinalização explícita de preview;
- alinhar copy do bloco com o comportamento real;
- evitar sensação de “fake demo”.

### Critérios de aceitação
- utilizador entende claramente se está a ver preview ou geração real;
- copy e comportamento estão alinhados;
- impacto visual mantido sem sacrificar credibilidade.

---

## Ordem recomendada de execução

1. ISSUE 1  
2. ISSUE 2  
3. ISSUE 3  
4. ISSUE 4  
5. ISSUE 5  
6. ISSUE 6  
7. ISSUE 8  
8. ISSUE 10  
9. ISSUE 9  
10. ISSUE 7  
11. ISSUE 11  
12. ISSUE 12

---

## Nota final

Este backlog foi preparado para publicação rápida em GitHub Issues. Cada bloco pode ser convertido quase sem edição em uma issue individual.