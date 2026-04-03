import type { AIAction } from "@/lib/subscription";

export const PROMPT_VERSION = "v3.1";

const EDUCATION_PROMPTS = {
  SECONDARY: `PROMPT_VERSION=${PROMPT_VERSION}
Você é um assistente educacional para estudantes do ensino secundário moçambicano.

Regras:
- Responda sempre em Português de Moçambique.
- Explique conceitos de forma clara, correcta e acessível.
- Nunca invente dados, autores, leis ou referências.
- Se faltar contexto, peça precisão ou assuma uma resposta conservadora.`,

  TECHNICAL: `PROMPT_VERSION=${PROMPT_VERSION}
Você é um assistente educacional para estudantes do ensino técnico profissional moçambicano.

Regras:
- Responda sempre em Português de Moçambique.
- Use terminologia técnica apropriada e exemplos aplicáveis.
- Nunca invente dados, autores, leis ou referências.
- Prefira clareza, objectividade e aplicabilidade prática.`,

  HIGHER_EDUCATION: `PROMPT_VERSION=${PROMPT_VERSION}
Você é um assistente académico especializado em apoiar estudantes universitários moçambicanos.

Regras obrigatórias:
- Responda sempre em Português académico de Moçambique.
- Mantenha rigor, clareza e neutralidade académica.
- Nunca invente dados, autores, leis ou referências.
- Quando não houver base factual suficiente, diga explicitamente o que falta.
- Respeite ABNT quando o pedido envolver citações, referências ou estrutura académica.`,
} as const;

const PACKAGE_PROMPTS = {
  FREE: `PROMPT_VERSION=${PROMPT_VERSION}
Você é um assistente educacional básico.
Responda sempre em Português de Moçambique.
Nunca invente dados ou referências.`,

  STARTER: EDUCATION_PROMPTS.HIGHER_EDUCATION,

  PRO: `PROMPT_VERSION=${PROMPT_VERSION}
Você é um assistente académico avançado para escrita e revisão académica de alto nível.

Padrões de qualidade:
- Rigor científico e consistência argumentativa.
- Clareza formal em Português académico de Moçambique.
- Nunca invente dados, autores, leis ou referências.
- Quando a referência exacta não puder ser sustentada, indique a limitação com franqueza.`,
} as const;

interface BuildActionPromptInput {
  action: AIAction;
  text: string;
  mergedContext: string;
  citationStyle: string;
}

export function buildSystemPrompt(packageValue: string, educationLevel?: string) {
  if (educationLevel && educationLevel in EDUCATION_PROMPTS) {
    return EDUCATION_PROMPTS[educationLevel as keyof typeof EDUCATION_PROMPTS];
  }

  return PACKAGE_PROMPTS[packageValue as keyof typeof PACKAGE_PROMPTS] || PACKAGE_PROMPTS.STARTER;
}

export function buildActionPrompt({ action, text, mergedContext, citationStyle }: BuildActionPromptInput) {
  switch (action) {
    case "generate":
      return `Gere conteúdo académico sobre: ${text}

Contexto adicional: ${mergedContext || "Nenhum"}

Escreva em Português académico de Moçambique, com cerca de 200-300 palavras. Inclua estrutura clara, progressão lógica e argumentos fundamentados.`;

    case "improve":
      return `Melhore o seguinte texto académico, mantendo o significado original, mas tornando-o mais formal, claro e bem estruturado:

"${text}"

Contexto: ${mergedContext || "Trabalho académico"}

Forneça apenas o texto melhorado, sem explicações adicionais.`;

    case "suggest":
      return `Com base no seguinte texto, sugira 3-5 continuidades ou desenvolvimentos possíveis. Para cada sugestão, forneça um breve parágrafo:

"${text}"

Formato: lista numerada com cada sugestão.`;

    case "references":
      return `Gere referências bibliográficas no formato ${citationStyle} para o seguinte tema ou fonte:

"${text}"

Use apenas referências que consiga sustentar de forma plausível e prudente. Se não tiver dados suficientes para montar referências fiáveis, explique que o utilizador deve inserir ou confirmar as fontes manualmente.`;

    case "outline":
      return `Crie um esboço estruturado e detalhado para um trabalho académico sobre: "${text}"

Tipo de documento: ${mergedContext || "Monografia"}

Inclua secções principais, subseções e breve descrição do conteúdo de cada uma.`;

    case "summarize":
      return `Resuma o seguinte texto de forma concisa, mantendo os pontos principais:

"${text}"

O resumo deve ter cerca de 20% do tamanho original.`;

    case "translate":
      return `Traduza o seguinte texto para Inglês académico, mantendo o tom formal:

"${text}"`;

    case "citations":
      return `Crie citações no formato ${citationStyle} para as seguintes informações:

"${text}"

Forneça a citação no texto e a referência completa. Se não houver elementos mínimos suficientes, indique claramente a limitação em vez de inventar detalhes.`;

    case "plagiarism-check":
      return `Analise o seguinte texto em busca de potenciais problemas de originalidade:

"${text}"

Identifique:
1. Frases que podem ser consideradas plágio
2. Sugestões de parafraseamento
3. Áreas que precisam de citação

Não verifique online; faça apenas uma análise crítica textual.`;

    case "generate-section":
      return `Gere o conteúdo completo para a seguinte secção de um trabalho académico:

Secção: ${text}

Contexto do trabalho: ${mergedContext || "Trabalho académico"}

Escreva em Português académico, com 400-600 palavras, incluindo:
- Introdução ao tema
- Desenvolvimento argumentativo
- Conclusão parcial
- Transição para a próxima secção`;

    case "generate-complete":
      return `Crie um plano completo para um trabalho académico sobre: "${text}"

Tipo: ${mergedContext || "Monografia"}

Forneça:
1. Título sugerido
2. Resumo (150 palavras)
3. Estrutura completa com todas as secções
4. Para cada secção: objectivo, pontos principais e referências sugeridas
5. Conclusão geral

Formate de forma clara e estruturada.`;

    case "chat":
    default:
      return mergedContext ? `${text}

Contexto do trabalho:
${mergedContext}` : text;
  }
}
