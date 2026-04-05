# Plano de Simplificação Visual — Appto

**Versão:** 2.0 | **Data:** 2026-04-05
**Regra fixa:** O arredondamento NÃO se toca. É assinatura da marca.

---

# Regra de ouro

> **O arredondamento mantém-se. Tudo o resto recua.**

O `rounded-[28px]`, `rounded-2xl`, `rounded-xl` — todos ficam.
O que muda é o que está DENTRO dessas formas.

---

# Auditoria completa de glass — componente a componente

## Resumo numérico

| Categoria | Instâncias | Decisão |
|---|---|---|
| **Manter glass** | 3 | Onde há conteúdo por trás para desfocar |
| **Remover glass** | 15 | Fundo sólido por trás = blur desperdiçado |
| **Total auditado** | 18 | |

---

## 1. LANDING PAGE — ✅ MANTER GLASS

### `src/components/landing/Header.tsx:121`

```tsx
// ATUAL
className="glass-header relative border border-border/60 rounded-2xl md:rounded-3xl"
```

**Decisão:** ✅ **MANTER** `.glass-header`

**Porquê:** Header flutuante sobre conteúdo da landing (gradientes, grid patterns, secções coloridas). Quando o utilizador faz scroll, o conteúdo passa por baixo — o blur é visível e intencional.

**Ação:** Nenhuma. Este é o uso mais legítimo de glass em toda a app.

---

### `src/components/landing/HeroSection.tsx` e outras secções

**Decisão:** ✅ **MANTER** efeitos decorativos (gradients, grid patterns, dot patterns)

**Porquê:** A landing page É o palco do glassmorphism. É aqui que a identidade visual se mostra.

---

## 2. AUTH PAGES — ⚠️ REDUZIR

### `src/app/(auth)/login/page.tsx:112, 123`

```tsx
// ATUAL
className="glass glass-border rounded-[28px] p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
```

**Decisão:** ⚠️ **REDUZIR** → remover glass, manter radius e animação

**Porquê:** As páginas de auth têm fundo sólido `bg-background`. Não há nada para desfocar. O glass aqui é só um card semi-transparente sobre cor uniforme — o blur é desperdiçado.

**Ação:**
```tsx
// NOVO
className="rounded-[28px] bg-card border border-border/40 p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
```

### `src/app/(auth)/register/page.tsx:107`

**Mesmo caso que login.**

**Ação:**
```tsx
// NOVO
className="rounded-[28px] bg-card border border-border/40 p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
```

### `src/app/(auth)/forgot-password/page.tsx:47, 81`

```tsx
// ATUAL
className="glass glass-border rounded-2xl p-8 shadow-2xl shadow-primary/5 gradient-glow-subtle"
```

**Decisão:** ⚠️ **REDUZIR** → remover glass, manter glow e radius

**Ação:**
```tsx
// NOVO
className="rounded-2xl bg-card border border-border/40 p-8 shadow-2xl shadow-primary/5 gradient-glow-subtle"
```

### `src/app/(auth)/reset-password/page.tsx:77, 95`

**Mesmo caso que forgot-password.**

**Ação:**
```tsx
// NOVO
className="rounded-2xl bg-card border border-border/40 p-8 shadow-2xl shadow-primary/5 gradient-glow-subtle"
```

---

## 3. APP SHELL — ⚠️ MISTO

### `src/components/app-shell/AppSidebar.tsx:40`

```tsx
// ATUAL
className="glass-premium sticky top-0 z-[var(--z-sidebar)] ... rounded-[28px]"
```

**Decisão:** ⚠️ **REDUZIR** → remover glass-premium, manter radius

**Porquê:** A sidebar fica ao lado do conteúdo principal num fundo sólido `bg-background`. O `glass-premium` tem `backdrop-filter: blur(24px)` mas não há nada interessante por trás — só o fundo da app.

**Ação:**
```tsx
// NOVO
className="sticky top-0 z-[var(--z-sidebar)] flex h-full w-[240px] shrink-0 flex-col rounded-[28px] bg-sidebar text-sidebar-foreground border border-border/40"
```

**Nota:** Manter `rounded-[28px]`. Substituir `glass-premium` por `bg-sidebar` sólido + borda subtil.

---

### `src/components/app-shell/AppHeader.tsx:25`

```tsx
// ATUAL
className="glass-premium shrink-0 rounded-[24px] px-4 py-2 text-sidebar-foreground lg:px-6 lg:py-3"
```

**Decisão:** ⚠️ **REDUZIR** → remover glass-premium, manter radius

**Porquê:** O header fica dentro do AppShell sobre fundo sólido. Não scroll sobre conteúdo. O glass-premium aqui é decorativo, não funcional.

**Ação:**
```tsx
// NOVO
className="shrink-0 rounded-[24px] px-4 py-2 lg:px-6 lg:py-3 bg-card border border-border/40"
```

---

### `src/components/app-shell/AppShell.tsx:264` — Mobile menu header

```tsx
// ATUAL
className="fixed top-0 left-0 right-0 z-[70] flex items-center gap-2 bg-background/95 backdrop-blur-sm px-4 py-3 lg:hidden"
```

**Decisão:** ✅ **MANTER** `backdrop-blur-sm`

**Porquê:** Este header aparece SOBRE o conteúdo da app quando o menu mobile abre. Há conteúdo por trás para desfocar. Uso legítimo e com `blur-sm` (leve, não 24px).

**Ação:** Nenhuma.

---

### `src/components/app-shell/AppShell.tsx:295` — Mobile menu backdrop

```tsx
// ATUAL
className="absolute inset-0 bg-background/14 backdrop-blur-[2px]"
```

**Decisão:** ✅ **MANTER** `backdrop-blur-[2px]`

**Porquê:** É um backdrop/overlay. O blur de 2px é subtil e intencional — suaviza o conteúdo por trás sem custo de performance significativo.

**Ação:** Nenhuma.

---

### `src/components/app-shell/AppShell.tsx:328` — Mobile menu "novo trabalho" button

```tsx
// ATUAL
className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-md transition hover:bg-white/24"
```

**Decisão:** ⚠️ **REDUZIR** → remover backdrop-blur-md

**Porquê:** Button sobre o painel do menu mobile que tem fundo sólido/degradê. O `backdrop-blur-md` não tem efeito visível útil aqui.

**Ação:**
```tsx
// NOVO
className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-white transition hover:bg-white/24"
```

---

### `src/components/app-shell/AppShell.tsx:379` — Mobile menu UserMenu container

```tsx
// ATUAL
className="mt-auto rounded-[28px] border border-white/12 bg-black/10 p-3 backdrop-blur-xl"
```

**Decisão:** ⚠️ **REDUZIR** → remover backdrop-blur-xl

**Porquê:** Container no fundo do menu mobile sobre fundo sólido. O `backdrop-blur-xl` (o mais pesado de todos) não tem conteúdo por trás para desfocar.

**Ação:**
```tsx
// NOVO
className="mt-auto rounded-[28px] border border-white/12 bg-black/10 p-3"
```

---

## 4. INLINE WORK CREATOR — ❌ REMOVER GLASS

### `src/components/work-creation/InlineWorkCreator.tsx:105` — Generating card

```tsx
// ATUAL
className="rounded-[28px] glass glass-border p-6 lg:p-8"
```

**Decisão:** ❌ **REMOVER** glass

**Porquê:** Card sobre fundo sólido do dashboard. Zero conteúdo por trás para desfocar.

**Ação:**
```tsx
// NOVO
className="rounded-[28px] bg-card border border-border/40 p-6 lg:p-8"
```

---

### `src/components/work-creation/InlineWorkCreator.tsx:484` — Recent works card

```tsx
// ATUAL
className="glass glass-border rounded-[28px] bg-background/80"
```

**Decisão:** ❌ **REMOVER** glass

**Porquê:** Mesmo caso — fundo sólido por trás.

**Ação:**
```tsx
// NOVO
className="rounded-[28px] bg-card border border-border/40"
```

---

## 5. WORKS LIBRARY — ❌ REMOVER GLASS

### `src/components/works/WorksLibraryPage.tsx:209` — Header da biblioteca

```tsx
// ATUAL
className="flex flex-col gap-4 rounded-[28px] glass glass-border p-5 lg:flex-row lg:items-end lg:justify-between"
```

**Decisão:** ❌ **REMOVER** glass

**Ação:**
```tsx
// NOVO
className="flex flex-col gap-4 rounded-[28px] bg-card border border-border/40 p-5 lg:flex-row lg:items-end lg:justify-between"
```

---

### `src/components/works/WorksLibraryPage.tsx:233` — Container dos filtros

```tsx
// ATUAL
className="glass glass-border rounded-[28px] p-4 lg:p-5"
```

**Decisão:** ❌ **REMOVER** glass

**Ação:**
```tsx
// NOVO
className="rounded-[28px] bg-card border border-border/40 p-4 lg:p-5"
```

---

## 6. PROJECT GRID — ❌ REMOVER GLASS

### `src/components/projects/ProjectGrid.tsx:110` — Project card (grid view)

```tsx
// ATUAL
"glass glass-border card-hover group relative cursor-pointer overflow-hidden rounded-2xl bg-card/80"
```

**Decisão:** ❌ **REMOVER** glass, manter card-hover

**Porquê:** Cards sobre fundo sólido. O `bg-card/80` + glass cria transparência desnecessária.

**Ação:**
```tsx
// NOVO
"card-hover group relative cursor-pointer overflow-hidden rounded-2xl bg-card border border-border/40"
```

---

### `src/components/projects/ProjectGrid.tsx:249` — Project card (list view)

```tsx
// ATUAL
"glass glass-border card-hover group cursor-pointer rounded-2xl bg-card/80"
```

**Decisão:** ❌ **REMOVER** glass

**Ação:**
```tsx
// NOVO
"card-hover group cursor-pointer rounded-2xl bg-card border border-border/40"
```

---

## 7. SETTINGS — ❌ REMOVER GLASS

### `src/app/app/settings/page.tsx:26` — Header de settings

```tsx
// ATUAL
className="flex flex-col gap-4 rounded-[28px] glass glass-border p-5 lg:flex-row lg:items-end lg:justify-between"
```

**Decisão:** ❌ **REMOVER** glass

**Ação:**
```tsx
// NOVO
className="flex flex-col gap-4 rounded-[28px] bg-card border border-border/40 p-5 lg:flex-row lg:items-end lg:justify-between"
```

---

### `src/app/app/settings/page.tsx:52` — TabsList

```tsx
// ATUAL
className="glass glass-border flex h-auto w-full flex-wrap justify-start gap-2 rounded-[28px] p-2"
```

**Decisão:** ❌ **REMOVER** glass

**Ação:**
```tsx
// NOVO
className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-[28px] bg-muted/40 border border-border/40 p-2"
```

---

### `src/app/app/settings/page.tsx:70` — Card de conteúdo

```tsx
// ATUAL
className="glass glass-border rounded-[28px] bg-background/80"
```

**Decisão:** ❌ **REMOVER** glass

**Ação:**
```tsx
// NOVO
className="rounded-[28px] bg-card border border-border/40"
```

---

## Mapa final de decisões

| # | Ficheiro | Linha | Classe atual | Decisão | Nova classe |
|---|---|---|---|---|---|
| 1 | `landing/Header.tsx` | 121 | `glass-header` | ✅ Manter | Nenhuma mudança |
| 2 | `app-shell/AppShell.tsx` | 264 | `backdrop-blur-sm` | ✅ Manter | Nenhuma mudança |
| 3 | `app-shell/AppShell.tsx` | 295 | `backdrop-blur-[2px]` | ✅ Manter | Nenhuma mudança |
| 4 | `app-shell/AppShell.tsx` | 328 | `backdrop-blur-md` | ⚠️ Remover | Remover `backdrop-blur-md` |
| 5 | `app-shell/AppShell.tsx` | 379 | `backdrop-blur-xl` | ⚠️ Remover | Remover `backdrop-blur-xl` |
| 6 | `app-shell/AppSidebar.tsx` | 40 | `glass-premium` | ⚠️ Reduzir | `bg-sidebar border border-border/40` |
| 7 | `app-shell/AppHeader.tsx` | 25 | `glass-premium` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 8 | `auth/login/page.tsx` | 112 | `glass glass-border` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 9 | `auth/login/page.tsx` | 123 | `glass glass-border` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 10 | `auth/register/page.tsx` | 107 | `glass glass-border` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 11 | `auth/forgot-password/page.tsx` | 47 | `glass glass-border` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 12 | `auth/forgot-password/page.tsx` | 81 | `glass glass-border` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 13 | `auth/reset-password/page.tsx` | 77 | `glass glass-border` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 14 | `auth/reset-password/page.tsx` | 95 | `glass glass-border` | ⚠️ Reduzir | `bg-card border border-border/40` |
| 15 | `work-creation/InlineWorkCreator.tsx` | 105 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |
| 16 | `work-creation/InlineWorkCreator.tsx` | 484 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |
| 17 | `works/WorksLibraryPage.tsx` | 209 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |
| 18 | `works/WorksLibraryPage.tsx` | 233 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |
| 19 | `projects/ProjectGrid.tsx` | 110 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |
| 20 | `projects/ProjectGrid.tsx` | 249 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |
| 21 | `app/settings/page.tsx` | 26 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |
| 22 | `app/settings/page.tsx` | 52 | `glass glass-border` | ❌ Remover | `bg-muted/40 border border-border/40` |
| 23 | `app/settings/page.tsx` | 70 | `glass glass-border` | ❌ Remover | `bg-card border border-border/40` |

---

# Resultados esperados

## Antes → Depois

| Métrica | Antes | Depois |
|---|---|---|
| Instâncias de `backdrop-filter: blur()` | 23+ | 2 (header landing + mobile menu header) |
| Componentes com glass | 12 | 2 |
| Redução de render GPU em mobile | — | ~85% menos blur |
| Arredondamento | Intocado | Intocado |
| Identidade visual | Mantida | Reforçada (o radius respira) |

---

# Plano de execução por fases

## Fase 1 — Auth pages (menor risco)

**Ficheiros:** 4 ficheiros, 6 instâncias
**Impacto visual:** Mínimo — auth pages são transitórias
**Risco:** Zero

## Fase 2 — Settings + Works Library + ProjectGrid

**Ficheiros:** 4 ficheiros, 7 instâncias
**Impacto visual:** Moderado — páginas de conteúdo
**Risco:** Baixo

## Fase 3 — AppShell (sidebar + header)

**Ficheiros:** 2 ficheiros, 2 instâncias
**Impacto visual:** Alto — muda a cara da app
**Risco:** Médio — requer validação visual

## Fase 4 — InlineWorkCreator

**Ficheiros:** 1 ficheiro, 2 instâncias
**Impacto visual:** Alto — é a página principal
**Risco:** Médio — requer validação visual

## Fase 5 — Limpeza do CSS

**Ficheiro:** `globals.css`
**Ação:** Remover variantes de glass não usadas (`.glass`, `.glass-subtle`, `.glass-premium`)
**Manter:** `.glass-header` (landing) + `.glass-border` (pode ser útil como utilitária)

---

# O que NÃO muda

- ✅ Todos os `rounded-[28px]`, `rounded-2xl`, `rounded-xl` — intocados
- ✅ `card-hover` utility — mantida
- ✅ `gradient-glow-subtle` nas auth pages — mantida
- ✅ Animações de entrada nas auth pages — mantidas
- ✅ Landing page glass — mantida e intocada
- ✅ Mobile menu backdrop blur subtil — mantido

---

# O que muda

- ❌ `.glass` sobre fundos sólidos → `bg-card border border-border/40`
- ❌ `.glass-premium` sobre fundos sólidos → `bg-card border border-border/40`
- ❌ `backdrop-blur-md/xl` em elementos sobre fundos sólidos → removido
- ✅ O arredondamento fica como protagonista
