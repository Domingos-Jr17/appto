# TODO Posterior — Features Deferred

Items que foram mantidos no código agora mas precisam de implementação real posterior.

---

## 1. Planos mensais (subscrições)

Implementar modelo real de planos mensais end-to-end.

- [ ] Definir catálogo de planos com preço, features, e limites
- [ ] Implementar checkout real para planos mensais
- [ ] Implementar renovação automática/manual
- [ ] Estado real da assinatura no backend (prorrogacao, cancelamento)
- [ ] Regras de consumo/créditos por plano
- [ ] UI de conta alinhada com estado real da assinatura
- [ ] Pricing page com narrativa de planos funcional
- [ ] Tests unitários e E2E

**Arquivos afetados:**
- `src/components/landing/data.ts`
- `src/components/landing/PricingCards.tsx`
- `src/components/settings/AccountSection.tsx`
- `src/lib/credits.ts`
- `src/lib/payments.ts`

---

## 2. PDF como feature pública

Implementar PDF como exportação pública e cobrada.

- [ ] Política de cobrança definida para PDF (download e guardar)
- [ ] Exposição do PDF na UI pública (landing, workspace, credits)
- [ ] Fluxo de exportar/guardar PDF consistente
- [ ] Mensagens e feedback do estado de exportação PDF
- [ ] Tests E2E para exportação PDF

**Arquivos afetados:**
- `src/app/api/export/pdf/route.ts`
- `src/app/api/projects/[id]/export/save/route.ts`
- `src/lib/credits.ts`
- `src/components/landing/data.ts`

---

## 3. Providers de pagamento reais

- [ ] M-Pesa integration (produção)
- [ ] e-Mola integration (produção)
- [ ] Webhooks/callbacks reais
- [ ] Fluxo de pagamento no UI com estados reais

---

## 4. Páginas legais

- [ ] Termos de Uso reais
- [ ] Política de Privacidade real
- [ ] Referências nos formulários de registo

---

## 5. Verificação de email

- [ ] Envio de email de verificação
- [ ] Endpoint de confirmação
- [ ] Estado real de verificação no UI (ProfileSection)

---

## 6. Eliminar página `/app/sessoes` e mover gestão para o sidebar

Remover a página dedicada de sessões e concentrar toda a gestão no sidebar global.
O sidebar mostra apenas as últimas `10` sessões.
Sessões anteriores ficam acessíveis apenas via pesquisa no sidebar.

### Objetivo
- Sidebar passa a ser o ÚNICO ponto de gestão de sessões
- Eliminar rota wrapper `/app/sessoes/page.tsx`
- Eliminar componente `src/components/sessions/SessionsLibraryPage.tsx`
- Eliminar componente `src/components/projects/ProjectGrid.tsx`
- Eliminar componente `src/components/projects/ProjectFilters.tsx`
- Eliminar componente `src/components/skeletons/SessionsLibrarySkeleton.tsx`

### Passos
- [ ] Remover item "Sessões" do `src/components/app-shell/app-nav.ts`
- [ ] Atualizar botão "Nova sessão" no sidebar/header para abrir dialog local (não depender de `/app/sessoes?new=1`)
- [ ] Adicionar menu de ações no sidebar para cada sessão:
  - Abrir
  - Renomear/editar
  - Arquivar/restaurar
  - Eliminar
- [ ] Reutilizar lógica de criação/eliminação/arquivar de `SessionsLibraryPage.tsx` dentro do sidebar
- [ ] A pesquisa no sidebar deve ser capaz de encontrar qualquer sessão (até `10` resultados)
- [ ] Sessões fora das últimas `10` só aparecem quando pesquisadas
- [ ] Atualizar redirecionamento: links antigos de `/app/sessoes` redirecionam para `/app`
- [ ] Remover rota wrapper `src/app/app/sessoes/page.tsx`
- [ ] Remover componentes:
  - `src/components/sessions/SessionsLibraryPage.tsx`
  - `src/components/projects/ProjectGrid.tsx`
  - `src/components/projects/ProjectFilters.tsx`
  - `src/components/skeletons/SessionsLibrarySkeleton.tsx`
- [ ] Limpar quaisquer imports restantes que referenciem componentes removidos

### Nota
Sessões com mais de `10` de antiguidade não terão acesso visual normal.
Aparecem apenas quando pesquisadas via campo de pesquisa do sidebar.

**Arquivos afetados:**
- `src/components/app-shell/AppSidebar.tsx`
- `src/components/app-shell/app-nav.ts`
- `src/app/app/layout.tsx`
- `src/app/app/sessoes/page.tsx` (remover)
- `src/components/sessions/SessionsLibraryPage.tsx` (remover)
- `src/components/projects/ProjectGrid.tsx` (remover)
- `src/components/projects/ProjectFilters.tsx` (remover)
- `src/components/skeletons/SessionsLibrarySkeleton.tsx` (remover)
- `src/lib/workspace-ui.ts` (verificar se ainda é necessário)
- `src/app/app/page.tsx` (link redirecionado)
