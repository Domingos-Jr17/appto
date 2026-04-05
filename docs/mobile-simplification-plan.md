# Plano Realista de Simplificação Mobile — Appto

**Versão:** 3.0 | **Data:** 2026-04-05
**Base:** Codebase actual auditada componente a componente
**Regra fixa:** Arredondamento intocável. Glass já removido (v3.0).

---

# Estado actual (pós-glass removal)

## O que já está bom

| Componente | Estado | Porquê |
|---|---|---|
| `InlineWorkCreator` fluxo principal | ✅ Limpo | Greeting → Tema → Nível → Gerar, sem ruído |
| Opcionais colapsáveis | ✅ Já implementado | `showCoverData` e `showAdvanced` começam fechados |
| Níveis em grid responsivo | ✅ Funcional | `grid-cols-1 sm:grid-cols-3` adapta bem |
| `DocumentPreview` com `.doc-page` | ✅ Documento-first | Folha A4 com sombras realistas |
| Workspace layout | ✅ Simples | Header + preview + cover sheet |
| Glass removido | ✅ Feito | Só resta na landing page |

## O que precisa de trabalho

| Componente | Problema real | Impacto mobile |
|---|---|---|
| `InlineWorkCreator` — secções avançadas | 2 sub-grupos com 8 campos, cada um com label + helper text + input | Alto — scroll excessivo |
| `InlineWorkCreator` — microcopy | Textos explicativos longos nos placeholders e helpers | Médio — fadiga de leitura |
| `WorkspaceHeader` | 3 linhas de informação (título+badge, progresso+subscription, 3 botões) | Alto — pouco espaço para documento |
| `CoverFields` | Muitos campos seguidos com labels longas | Médio — denso no mobile |
| `CoverModal` | Todos os campos visíveis de uma vez (300+ linhas) | Alto — scroll infinito |

---

# Plano: 4 fases, impacto decrescente

## Fase 1 — Compactar secções avançadas do InlineWorkCreator

**Ficheiro:** `src/components/work-creation/InlineWorkCreator.tsx`
**Risco:** Baixo
**Esforço:** ~30 min

### Problema actual

Quando o utilizador abre "Detalhes avançados", vê:

```
┌─ Conteúdo do trabalho ──────────────────┐
│ Ajusta o foco académico antes de gerar  │  ← helper genérico
│                                         │
│ Objetivo                                │
│ "Ajuda a IA a manter o foco..."         │  ← placeholder redundante
│ [textarea]                              │
│                                         │
│ Metodologia ou orientação               │
│ "Descreve a abordagem a seguir."        │  ← helper genérico
│ [textarea]                              │
│                                         │
│ Pergunta de investigação                │
│ "A pergunta central que o trabalho..."  │  ← helper genérico
│ [textarea]                              │
│                                         │
│ Subtítulo                               │
│ [input]                                 │
└─────────────────────────────────────────┘

┌─ Referências e formatação ──────────────┐
│ Define as pistas editoriais que vão...  │  ← helper genérico
│                                         │
│ Palavras-chave                          │
│ [input]                                 │
│                                         │
│ Referências iniciais                    │
│ [textarea]                              │
│                                         │
│ Norma de citação                        │
│ [select]                                │
│                                         │
│ Notas adicionais                        │
│ [textarea]                              │
└─────────────────────────────────────────┘
```

**8 campos + 5 textos helper + 2 títulos de secção = scroll pesado no mobile.**

### Mudanças

#### 1.1 — Reduzir space-y-4 para space-y-3

```tsx
// ATUAL
className="space-y-4 rounded-2xl border border-border/50 bg-background/60 p-4"

// NOVO
className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-3"
```

- `space-y-4` → `space-y-3` (reduz 25% do espaço entre campos)
- `p-4` → `p-3` (reduz padding interno)
- `bg-background/60` → `bg-muted/20` (mais subtil)
- `border-border/50` → `border-border/40` (borda mais leve)

#### 1.2 — Remover helper texts genéricos dos blocos

Remover os parágrafos descritivos de cada sub-grupo:

```tsx
// REMOVER
<p className="mt-1 text-xs text-muted-foreground">
  Ajusta o foco académico antes de gerar o documento.
</p>

<p className="mt-1 text-xs text-muted-foreground">
  Define as pistas editoriais que vão orientar a estrutura final.
</p>
```

O utilizador que abre "avançados" já sabe o que quer. Estes textos não acrescentam.

#### 1.3 — Encurtar placeholders para microcopy funcional

| Campo | Placeholder actual | Novo placeholder |
|---|---|---|
| Objetivo | "Ajuda a IA a manter o foco ao gerar o conteúdo." | "Ex.: analisar o impacto da IA no ensino superior" |
| Metodologia | "Descreve a abordagem a seguir." | "Ex.: revisão bibliográfica" |
| Pergunta de investigação | "A pergunta central que o trabalho vai responder." | "Ex.: como a IA afecta o ensino?" |
| Palavras-chave | "Ex.: digitalização, sector bancário, Moçambique" | (manter — já é bom) |
| Referências iniciais | "Autores, livros, artigos ou links que devem orientar o trabalho." | "Ex.: Silva (2023), WHO (2024)" |
| Notas adicionais | "Ex.: incluir exemplos de Moçambique." | (manter — já é bom) |

**Princípio:** placeholders com exemplos concretos > placeholders que explicam o campo.

#### 1.4 — Encurtar labels

| Label actual | Nova label |
|---|---|
| "Metodologia ou orientação" | "Metodologia" |
| "Pergunta de investigação" | "Pergunta de pesquisa" |
| "Referências e formatação" | "Referências" |
| "Notas adicionais" | "Notas" |

#### 1.5 — Remover helper text condicional por nível

Nos campos de metodologia e pesquisa de investigação, há texto condicional:

```tsx
// ATUAL
<p className="text-xs text-muted-foreground">
  {workForm.educationLevel === "SECONDARY"
    ? "Preenche apenas se o professor pediu."
    : "Descreve a abordagem a seguir."}
</p>
```

**Remover.** O placeholder já dá contexto suficiente. O `(opcional)` na label do toggle já indica que não é obrigatório.

### Resultado esperado

- ~30% menos altura vertical nas secções avançadas
- Menos texto decorativo, mais exemplos práticos
- Labels mais curtas = menos wrapping no mobile

---

## Fase 2 — Simplificar WorkspaceHeader mobile

**Ficheiro:** `src/components/workspace/WorkspaceHeader.tsx`
**Risco:** Baixo
**Esforço:** ~20 min

### Problema actual

O header do workspace ocupa ~3 linhas de informação antes do documento:

```
┌─────────────────────────────────────────┐
│ [Monografia] Título do trabalho ✏️      │  ← linha 1
│ Progresso · 3/5 trabalhos     75%       │  ← linha 2
│ [████████████░░░░]                      │  ← linha 2b
│                                         │
│ [📷 Capa]  [⚡ Gerar]  [⬇ Download]     │  ← linha 3
└─────────────────────────────────────────┘
```

No mobile isto come ~120px antes do documento começar.

### Mudanças

#### 2.1 — Compactar padding

```tsx
// ATUAL
className="shrink-0 border-b border-border/60 px-4 py-4"

// NOVO
className="shrink-0 border-b border-border/40 px-3 py-3"
```

#### 2.2 — Mover subscription status para tooltip

```tsx
// ATUAL: subscription visível na linha do progresso
<span>{subscriptionStatus.remaining}/{subscriptionStatus.total} trabalhos</span>

// NOVO: só visível quando 0 ou em tooltip no badge
```

No dia-a-dia o utilizador não precisa de ver "3/5 trabalhos" no header do workspace. Só importa quando está no limite.

#### 2.3 — Reduzir tamanho do badge

```tsx
// ATUAL
<Badge variant="outline" className="shrink-0 rounded-full text-[10px]">

// NOVO
<Badge variant="outline" className="shrink-0 rounded-full text-[9px] px-1.5 py-0">
```

#### 2.4 — Título mais compacto

```tsx
// ATUAL
className="group flex-1 text-left line-clamp-2 text-sm font-semibold leading-tight tracking-tight"

// NOVO
className="group flex-1 text-left line-clamp-1 text-[13px] font-semibold leading-tight"
```

`line-clamp-2` → `line-clamp-1` — no mobile, uma linha basta. O título completo pode ser visto no documento.

#### 2.5 — Barra de progresso mais fina

```tsx
// ATUAL
className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/40"

// NOVO
className="mt-1 h-1 overflow-hidden rounded-full bg-muted/30"
```

### Resultado esperado

- Header passa de ~120px para ~80px no mobile
- +40px de documento visível
- Mesma informação, menos espaço

---

## Fase 3 — Compactar CoverFields

**Ficheiro:** `src/components/work-creation/CoverFields.tsx`
**Risco:** Baixo
**Esforço:** ~15 min

### Problema actual

Cada campo tem `space-y-2` + label + input. No mobile, isto cria densidade vertical excessiva.

### Mudanças

#### 3.1 — Reduzir espaçamento

```tsx
// ATUAL
<div className="space-y-3">
  <div className="space-y-2">
    <Label>...</Label>
    <Input ... />
  </div>
</div>

// NOVO
<div className="space-y-2.5">
  <div className="space-y-1.5">
    <Label className="text-xs">...</Label>
    <Input className="h-10 text-sm" ... />
  </div>
</div>
```

- `space-y-3` → `space-y-2.5` (container)
- `space-y-2` → `space-y-1.5` (campo individual)
- Labels: adicionar `text-xs` para consistência mobile

#### 3.2 — Encurtar labels opcionais

```tsx
// ATUAL
<Label htmlFor="cover-class">
  Classe <span className="text-muted-foreground font-normal">(opcional)</span>
</Label>

// NOVO
<Label htmlFor="cover-class" className="flex items-baseline gap-1">
  <span>Classe</span>
  <span className="text-[10px] text-muted-foreground">(opcional)</span>
</Label>
```

O `(opcional)` fica mais pequeno e menos intrusivo.

#### 3.3 — Placeholders mais curtos

| Campo | Placeholder actual | Novo placeholder |
|---|---|---|
| Escola | "Ex.: Escola Secundária Josina Machel" | (manter — bom exemplo) |
| Aluno | "Ex.: Maria João" | "Nome completo" |
| Professor | "Ex.: Prof. Carlos Bento" | "Nome do professor" |
| Instituição | "Ex.: Universidade Eduardo Mondlane" | "Nome da instituição" |
| Curso | "Ex.: Gestão" | "Nome do curso" |
| Estudante | "Ex.: Maria João" | "Nome completo" |
| Docente | "Ex.: Prof. Doutor João Luís" | "Nome do orientador" |

**Princípio:** no formulário de capa, o utilizador sabe o que preencher. Placeholders descritivos > exemplos longos.

### Resultado esperado

- ~20% menos altura nos campos de capa
- Labels mais compactas
- Placeholders mais directos

---

## Fase 4 — Refinar tipografia e hierarquia

**Ficheiros:** Vários
**Risco:** Baixo
**Esforço:** ~15 min

### 4.1 — InlineWorkCreator: saudação mais contida

```tsx
// ATUAL
<h2 className="text-3xl font-semibold tracking-tight">
  Que tema pode a Aptto criar para ti hoje?
</h2>

// NOVO
<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
  Que tema queres trabalhar hoje?
</h2>
```

- `text-3xl` → `text-2xl sm:text-3xl` (menor no mobile, volta ao normal no desktop)
- Texto mais directo: "Que tema queres trabalhar hoje?" > "Que tema pode a Aptto criar para ti hoje?"

### 4.2 — Textarea do tema: menos proeminente

```tsx
// ATUAL
className="text-lg resize-none leading-relaxed"

// NOVO
className="resize-none leading-relaxed text-base sm:text-lg"
```

No mobile, `text-lg` num textarea ocupa muito espaço visual. `text-base` é suficiente.

### 4.3 — Recent works: label mais discreta

```tsx
// ATUAL
<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
  ou continua onde paraste
</p>

// NOVO
<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
  Trabalhos recentes
</p>
```

- `text-xs` → `text-[10px]`
- `font-semibold` → `font-medium`
- `text-muted-foreground` → `text-muted-foreground/70`
- Texto mais neutro: "Trabalhos recentes" > "ou continua onde paraste"

### 4.4 — Empty state: ícone mais subtil

```tsx
// ATUAL
<FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
<p className="mt-3 text-sm text-muted-foreground">
  Ainda não criaste nenhum trabalho.
</p>

// NOVO
<FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
<p className="mt-2 text-sm text-muted-foreground/70">
  Ainda não tens trabalhos.
</p>
```

---

# Resumo de impacto

| Fase | Ficheiro | Mudança | Impacto visual | Esforço |
|---|---|---|---|---|
| **1** | `InlineWorkCreator.tsx` | Compactar avançados | 🔴 Alto | 30 min |
| **2** | `WorkspaceHeader.tsx` | Header mais compacto | 🔴 Alto | 20 min |
| **3** | `CoverFields.tsx` | Campos mais compactos | 🟡 Médio | 15 min |
| **4** | Vários | Tipografia e hierarquia | 🟢 Subtil | 15 min |

**Total:** ~80 min de trabalho, risco baixo em todas as fases.

---

# O que NÃO mudar

| Elemento | Porquê |
|---|---|
| Arredondamento | Assinatura da marca |
| Glass na landing page | Único uso legítimo de blur |
| Fluxo principal do InlineWorkCreator | Já está limpo e funcional |
| `DocumentPreview` | Já é documento-first |
| Animações framer-motion | Subtis e funcionais |
| Mobile menu | Funcional, não vale a pena reescrever agora |
| Cores e tokens OKLCH | Sistema sólido |

---

# Checklist de execução

- [ ] **Fase 1:** Compactar secções avançadas do InlineWorkCreator
  - [ ] Reduzir spacing (`space-y-4` → `space-y-3`, `p-4` → `p-3`)
  - [ ] Remover helper texts dos blocos
  - [ ] Encurtar placeholders (exemplos concretos)
  - [ ] Encurtar labels
  - [ ] Remover helper condicional por nível

- [ ] **Fase 2:** Simplificar WorkspaceHeader
  - [ ] Compactar padding (`py-4` → `py-3`, `px-4` → `px-3`)
  - [ ] Mover subscription status para tooltip/condicional
  - [ ] Reduzir badge (`text-[9px]`)
  - [ ] Título `line-clamp-1` no mobile
  - [ ] Barra de progresso mais fina

- [ ] **Fase 3:** Compactar CoverFields
  - [ ] Reduzir spacing (`space-y-3` → `space-y-2.5`, `space-y-2` → `space-y-1.5`)
  - [ ] Labels `text-xs`
  - [ ] `(opcional)` mais pequeno (`text-[10px]`)
  - [ ] Placeholders mais directos

- [ ] **Fase 4:** Tipografia e hierarquia
  - [ ] Saudação `text-2xl sm:text-3xl`, texto mais directo
  - [ ] Textarea `text-base sm:text-lg`
  - [ ] Recent works label mais discreta
  - [ ] Empty state mais subtil
