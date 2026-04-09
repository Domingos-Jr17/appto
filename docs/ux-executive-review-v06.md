# Parecer Executivo de UX - V.06

**Data:** 2026-04-09  
**Audiência:** Design/UX  
**Base:** fluxo autenticado e workspace auditados no código atual

## Tese

O V.06 já converge para os princípios certos de produto. A estrutura principal está alinhada com o que funciona em interfaces de IA maduras: entrada simples, geração visível, histórico persistente e ações colocadas no contexto do trabalho.

O problema não está na direção. Está na disciplina de interface. Ainda existem quebras de hierarquia, consistência e linguagem no caminho crítico que reduzem a percepção de maturidade do produto.

Claude e ChatGPT servem aqui como referência de clareza estrutural, não como meta de clonagem. O aptto não compete por conversa. Compete por resultado académico pronto para uso. Esse é o seu diferencial real, e a UX atual já aponta nessa direção.

## O que está certo

- A home autenticada está focada em input e evita wizard obrigatório. O fluxo entra direto em criação em `src/app/app/page.tsx` e `src/components/work-creation/InlineWorkCreator.tsx`.
- A geração é tratada como estado visível do produto, não como processo invisível. Isso aparece no criador inline e no workspace, com progresso e continuidade em `src/components/workspace/WorkspaceHeader.tsx`.
- O histórico já funciona como memória operacional do utilizador. A sidebar resolve retomada de contexto e reentrada rápida em `src/components/app-shell/AppSidebar.tsx`.
- As ações principais já vivem perto do artefacto real. O workspace organiza geração, edição de capa e exportação junto do documento em `src/components/workspace/WorkspaceLayout.tsx`.

## Onde a UX ainda falha

### 1. O header global compete com o contexto real da tarefa

O texto fixo `APPTO: Gerador de Trabalhos Académicos` no header principal não ajuda o utilizador a orientar-se. Pelo contrário: ocupa o espaço de maior saliência com branding redundante, enquanto o contexto útil já existe mais abaixo no workspace.

Isto cria uma hierarquia errada. O sistema enfatiza o nome da aplicação quando devia enfatizar a página atual, o nome do trabalho ou a secção ativa.

Referências: `src/components/app-shell/AppHeader.tsx`, `src/components/app-shell/AppShell.tsx`

### 2. O export dilui a ação de maior valor

O export está tratado como um dropdown com quatro opções do mesmo peso: descarregar DOCX, descarregar PDF, guardar DOCX e guardar PDF.

Isso é uma má decisão de hierarquia. O output principal do aptto é o documento utilizável, e o DOCX é a ação de maior valor e menor ambiguidade. Ao escondê-la dentro de um menu genérico, a interface atrasa o momento de recompensa.

O desenho atual trata alternativas como equivalentes ao fluxo principal. Não são.

Referência: `src/components/workspace/ExportActionsButton.tsx`

### 3. O onboarding/auth ainda quebra confiança por detalhe evitável

Os três formulários críticos de autenticação ainda usam `seu@email.com`. Esta microcopy está desalinhada com o resto da interface e introduz ruído de localização precisamente no ponto em que o produto precisa de parecer mais limpo e mais confiável.

Isto não é só detalhe textual. É uma falha de acabamento no caminho de entrada.

Referências: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`

## Prioridade recomendada

### P1. Promover DOCX a CTA primário

O botão principal deve executar exportação DOCX diretamente. As restantes opções devem ficar num chevron adjacente. A interface deve declarar sem hesitação qual é o output principal do produto.

### P2. Substituir branding fixo por contexto dinâmico

O header superior deve refletir o estado real da navegação: nome do trabalho, área atual ou secção ativa. Branding fixo em caps não deve ocupar o ponto de maior atenção.

### P3. Corrigir a microcopy dos três formulários de auth

Os placeholders de email devem ser localizados para o padrão linguístico da app e removidos da zona de inconsistência visível no onboarding.

## Conclusão

A base de UX do V.06 está correta. O produto já se organiza como uma ferramenta de geração com memória, continuidade e output real, não como uma interface genérica de chat.

O que ainda impede uma percepção premium não são falhas estruturais. São incoerências de hierarquia e acabamento no fluxo principal. Resolver exportação, header e microcopy não muda a estratégia do produto. Apenas remove o ruído que ainda o faz parecer menos maduro do que já é.
