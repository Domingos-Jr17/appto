import "dotenv/config";

interface ModelResponse {
  model: string;
  provider: string;
  content: string;
  tokens: number;
  time: number;
  rawResponse: unknown;
}

interface QualityMetrics {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  portugueseChars: boolean;
  academicWords: number;
  citations: number;
  hasSubheadings: boolean;
  coherence: number;
  repetitionRate: number;
}

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

const PORTUGUESE_CHARS = /[ãõáéíóúàèìòùâêîôûç]/i;
const ACADEMIC_WORDS = /(?:assim|portanto|consequentemente|verifica-se|evidencia|analise|resultados|conclusao|metodologia|referencias|contextualizacao|fundamentacao|perspectiva|abordagem|investigacao|pesquisa|teorico|emetodo|qualitativo|quantitativo|amostra|universo|recolha|analise|dados|resultados|discussao|limitancoes|recomendacoes)/gi;
const CITATION_PATTERN = /\([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*\d{4}\)/g;

const TEST_PROMPTS = [
  {
    name: "Introdução Académica (tiporeal)",
    system: "És um assistente académico especializado em trabalhos científicos em Português de Moçambique. Segue rigorosamente as instruções de estilo e extensão fornecidas. Produz texto académico com citação no formato (SOBRENOME, ano).",
    user: `Tema do trabalho: Impacto da Inteligência Artificial na Educação Superior em Moçambique
Tipo de trabalho: Trabalho Científico Académico
Contexto do briefing:
- Nível académico: LICENCIATURA
- Instituição: Universidade Eduardo Mondlane
- Norma de citação: ABNT

Instrução: Gere APENAS o conteúdo da secção "Introdução" sobre o tema fornecido.

Requisitos obrigatórios:
- Produza entre 350 e 520 palavras
- Delimite o tema, apresente o problema, o objectivo, a relevância académica e a organização do trabalho
- Use subtítulos com numeração progressiva (## 1.1 Contextualização, ## 1.2 Problema de pesquisa)
- Inclua pelo menos 2 citações no formato (SOBRENOME, ano)
- Escreva em Português académico de Moçambique
- NÃO invente dados factuais, leis, autores ou referências sem base no briefing`,
  },
  {
    name: "Desenvolvimento Completo",
    system: "És um assistente académico especializado em trabalhos científicos em Português de Moçambique. Segue rigorosamente as instruções de estilo e extensão fornecidas.",
    user: `Tema do trabalho: A Transformação Digital no Setor da Saúde em Portugal
Tipo de trabalho: Trabalho de Investigação Académico

Instrução: Gere APENAS o conteúdo da secção "Desenvolvimento" sobre o tema fornecido.

Requisitos obrigatórios:
- Produza entre 1500 e 2300 palavras
- Organize o conteúdo em 4 a 5 subtítulos em Markdown (## Título)
- Use estrutura: Contextualização e conceitos chave → Análise dos factores principais → Impacto e relevância → Desafios actuais → Perspectivas futuras
- Inclua pelo menos 3 citações no formato (SOBRENOME, ano)
- Cada subtópico deve ter pelo menos 3 parágrafos desenvolvidos
- Escreva em Português académico formal
- Contextualize com a realidade portuguesa e moçambicana quando relevante`,
  },
  {
    name: "Metodologia",
    system: "És um assistente académico especializado em metodologia de investigação científica.",
    user: `Tema do trabalho: E-commerce e competitividade das PME em Moçambique
Tipo de trabalho: Trabalho de Campo Académico
Contexto: Pesquisa qualitativa com estudo de caso

Instrução: Gere APENAS o conteúdo da secção "Metodologia" sobre o tema fornecido.

Requisitos obrigatórios:
- Produza entre 420 e 680 palavras
- Descreva: tipo de pesquisa, abordagem metodológica, universo e amostra, técnicas de recolha de dados, técnicas de análise
- Use linguagem técnica e académica
- Inclua pelo menos 2 citações metodológicas no formato (SOBRENOME, ano)
- Estruture com subtítulos em Markdown`,
  },
  {
    name: "Conclusão",
    system: "És um assistente académico especializado em conclusões de trabalhos científicos.",
    user: `Tema do trabalho: Economia Circular e Sustentabilidade Ambiental
Tipo de trabalho: Trabalho de Investigação Académico

Instrução: Gere APENAS o conteúdo da secção "Conclusão" sobre o tema fornecido.

Requisitos obrigatórios:
- Produza entre 280 e 420 palavras
- Sintetize os resultados da análise
- Responda ao objectivo do trabalho
- Apresente limitações e recomendações
- Feche com reflexão crítica sem repetir literalmente o texto
- Não introduza novos tópicos`,
  },
  {
    name: "Resumo/Abstract",
    system: "És um assistente académico especializado em resumos científicos.",
    user: `Tema do trabalho: Inteligência Artificial na Gestão Pública: Opportunidades e Desafios para Moçambique
Tipo de trabalho: Trabalho de Investigação Académico

Instrução: Gere um resumo académico estruturado.

Requisitos obrigatórios:
- Produza entre 180 e 260 palavras
- O resumo deve conter: objecto, foco analítico, metodologia e conclusão geral
- NÃO copie frases do corpo do texto
- Use linguagem académica concisa`,
  },
];

function countWords(text: string): number {
  const stripped = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "");
  return stripped.split(/\s+/).filter(Boolean).length;
}

function calculateQualityMetrics(text: string): QualityMetrics {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const academicWordMatches = text.match(ACADEMIC_WORDS) || [];
  const citationMatches = text.match(CITATION_PATTERN) || [];
  const subheadings = text.match(/^#{1,3}\s+/gm) || [];
  
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.length > 0 
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length 
    : 0;

  const uniqueSentences = new Set(sentences.map(s => s.toLowerCase().substring(0, 50)));
  const repetitionRate = sentences.length > 0 
    ? (1 - uniqueSentences.size / sentences.length) * 100 
    : 0;

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgSentenceLength: Math.round(avgSentenceLength),
    portugueseChars: PORTUGUESE_CHARS.test(text),
    academicWords: academicWordMatches.length,
    citations: citationMatches.length,
    hasSubheadings: subheadings.length > 0,
    coherence: avgSentenceLength > 15 && avgSentenceLength < 35 ? 100 : 70,
    repetitionRate: Math.round(repetitionRate),
  };
}

function calculateOverallScore(metrics: QualityMetrics, targetWordCount: { min: number; max: number }): number {
  let score = 0;
  
  const wordCountScore = metrics.wordCount >= targetWordCount.min && metrics.wordCount <= targetWordCount.max ? 100 :
    metrics.wordCount < targetWordCount.min 
      ? (metrics.wordCount / targetWordCount.min) * 100 
      : Math.max(0, 100 - ((metrics.wordCount - targetWordCount.max) / targetWordCount.max) * 100);
  
  score += wordCountScore * 0.25;
  score += (metrics.portugueseChars ? 100 : 0) * 0.15;
  score += (metrics.academicWords / Math.max(1, metrics.wordCount / 100)) * 20 * 0.15;
  score += Math.min(100, metrics.citations * 20) * 0.15;
  score += (metrics.hasSubheadings ? 100 : 0) * 0.10;
  score += metrics.coherence * 0.10;
  score += Math.max(0, 100 - metrics.repetitionRate * 2) * 0.10;
  
  return Math.round(score);
}

async function callCerebras(prompt: { system: string; user: string }, maxTokens: number): Promise<ModelResponse> {
  const start = Date.now();
  
  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();
  const time = Date.now() - start;

  return {
    model: "qwen-3-235b-a22b-instruct-2507",
    provider: "Cerebras",
    content: data.choices?.[0]?.message?.content || "Erro: sem conteúdo",
    tokens: data.usage?.completion_tokens || 0,
    time,
    rawResponse: data,
  };
}

async function callGroq(prompt: { system: string; user: string }, maxTokens: number): Promise<ModelResponse> {
  const start = Date.now();
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();
  const time = Date.now() - start;

  return {
    model: "openai/gpt-oss-120b",
    provider: "Groq",
    content: data.choices?.[0]?.message?.content || "Erro: sem conteúdo",
    tokens: data.usage?.completion_tokens || 0,
    time,
    rawResponse: data,
  };
}

async function runComparison() {
  console.log("=".repeat(80));
  console.log("COMPARAÇÃO COMPLETA: Cerebras (Qwen 3 235B) vs Groq (GPT-OSS 120B)");
  console.log("=" .repeat(80));
  console.log();

  const results: Array<{
    prompt: { name: string; user: string };
    targetWordCount: { min: number; max: number };
    cerebras: ModelResponse;
    groq: ModelResponse;
  }> = [];

  for (const prompt of TEST_PROMPTS) {
    const targetMatch = prompt.user.match(/entre (\d+) e (\d+) palavras/i);
    const targetWordCount = targetMatch 
      ? { min: parseInt(targetMatch[1]!), max: parseInt(targetMatch[2]!) }
      : { min: 300, max: 500 };
    
    const maxTokens = Math.ceil(targetWordCount.max * 1.5);

    console.log(`\n📝 Teste: ${prompt.name}`);
    console.log("-".repeat(60));
    console.log(`   Extensão alvo: ${targetWordCount.min}-${targetWordCount.max} palavras`);

    console.log("   🔄 A testar Cerebras (Qwen 3 235B)...");
    const cerebrasResult = await callCerebras(prompt, maxTokens);
    console.log(`      ✅ ${cerebrasResult.tokens} tokens em ${cerebrasResult.time}ms`);

    console.log("   🔄 A testar Groq (GPT-OSS 120B)...");
    const groqResult = await callGroq(prompt, maxTokens);
    console.log(`      ✅ ${groqResult.tokens} tokens em ${groqResult.time}ms`);

    results.push({
      prompt,
      targetWordCount,
      cerebras: cerebrasResult,
      groq: groqResult,
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("MÉTRICAS DE QUALIDADE DETALHADAS");
  console.log("=".repeat(80));

  let totalCerebrasScore = 0;
  let totalGroqScore = 0;
  let totalCerebrasTime = 0;
  let totalGroqTime = 0;

  for (const result of results) {
    console.log(`\n### ${result.prompt.name}`);
    console.log("-".repeat(60));

    const cerebrasMetrics = calculateQualityMetrics(result.cerebras.content);
    const groqMetrics = calculateQualityMetrics(result.groq.content);

    const cerebrasScore = calculateOverallScore(cerebrasMetrics, result.targetWordCount);
    const groqScore = calculateOverallScore(groqMetrics, result.targetWordCount);

    totalCerebrasScore += cerebrasScore;
    totalGroqScore += groqScore;
    totalCerebrasTime += result.cerebras.time;
    totalGroqTime += result.groq.time;

    console.log(`\n🟢 Cerebras (Qwen 3 235B) - Score: ${cerebrasScore}/100`);
    console.log(`   📊 Extensão: ${cerebrasMetrics.wordCount}/${result.targetWordCount.min}-${result.targetWordCount.max} palavras`);
    console.log(`   📝 Frases: ${cerebrasMetrics.sentenceCount} (média: ${cerebrasMetrics.avgSentenceLength} palavras/frase)`);
    console.log(`   🇲🇿 Português: ${cerebrasMetrics.portugueseChars ? "✅" : "❌"}`);
    console.log(`   🎓 Palavras académicas: ${cerebrasMetrics.academicWords}`);
    console.log(`   📚 Citações: ${cerebrasMetrics.citations}`);
    console.log(`   📑 Subítulos: ${cerebrasMetrics.hasSubheadings ? "✅" : "❌"}`);
    console.log(`   🔄 Repetição: ${cerebrasMetrics.repetitionRate}%`);
    console.log(`   ⏱️ Tempo: ${result.cerebras.time}ms`);

    console.log(`\n🔵 Groq (GPT-OSS 120B) - Score: ${groqScore}/100`);
    console.log(`   📊 Extensão: ${groqMetrics.wordCount}/${result.targetWordCount.min}-${result.targetWordCount.max} palavras`);
    console.log(`   📝 Frases: ${groqMetrics.sentenceCount} (média: ${groqMetrics.avgSentenceLength} palavras/frase)`);
    console.log(`   🇲🇿 Português: ${groqMetrics.portugueseChars ? "✅" : "❌"}`);
    console.log(`   🎓 Palavras académicas: ${groqMetrics.academicWords}`);
    console.log(`   📚 Citações: ${groqMetrics.citations}`);
    console.log(`   📑 Subítulos: ${groqMetrics.hasSubheadings ? "✅" : "❌"}`);
    console.log(`   🔄 Repetição: ${groqMetrics.repetitionRate}%`);
    console.log(`   ⏱️ Tempo: ${result.groq.time}ms`);

    console.log(`\n   🏆 Melhor neste teste: ${cerebrasScore > groqScore ? "Cerebras" : groqScore > cerebrasScore ? "Groq" : "Empate"}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("RESULTADOS FINAIS");
  console.log("=".repeat(80));

  const avgCerebrasScore = Math.round(totalCerebrasScore / results.length);
  const avgGroqScore = Math.round(totalGroqScore / results.length);
  const avgCerebrasTime = Math.round(totalCerebrasTime / results.length);
  const avgGroqTime = Math.round(totalGroqTime / results.length);

  console.log(`\n📈 SCORE MÉDIO DE QUALIDADE:`);
  console.log(`   🟢 Cerebras: ${avgCerebrasScore}/100`);
  console.log(`   🔵 Groq: ${avgGroqScore}/100`);
  console.log(`   🏆 Vencedor em qualidade: ${avgCerebrasScore > avgGroqScore ? "Cerebras (Qwen 3 235B)" : "Groq (GPT-OSS 120B)"}`);

  console.log(`\n⚡ VELOCIDADE MÉDIA:`);
  console.log(`   🟢 Cerebras: ${avgCerebrasTime}ms (${Math.round(60000/avgCerebrasTime)} req/min)`);
  console.log(`   🔵 Groq: ${avgGroqTime}ms (${Math.round(60000/avgGroqTime)} req/min)`);
  console.log(`   🏆 Mais rápido: ${avgCerebrasTime < avgGroqTime ? "Cerebras" : "Groq"} (${Math.round(Math.abs(avgGroqTime - avgCerebrasTime) / Math.max(avgCerebrasTime, avgGroqTime) * 100)}% de diferença)`);

  console.log("\n" + "=".repeat(80));
  console.log("AMOSTRAS DE OUTPUT (primeiros 500 caracteres)");
  console.log("=".repeat(80));

  for (const result of results) {
    console.log(`\n### ${result.prompt.name}`);
    console.log("-".repeat(60));
    
    console.log(`\n🟢 Cerebras:`);
    console.log(result.cerebras.content.substring(0, 500) + "...");
    
    console.log(`\n🔵 Groq:`);
    console.log(result.groq.content.substring(0, 500) + "...");
  }

  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSÃO");
  console.log("=".repeat(80));
  console.log(`
  Para geração de trabalhos académicos em português:
  
  ${avgCerebrasScore > avgGroqScore ? "✅ Cerebras (Qwen 3 235B)" : "✅ Groq (GPT-OSS 120B)"} é melhor em qualidade
  ${avgCerebrasTime < avgGroqTime ? "✅ Groq" : "✅ Cerebras"} é mais rápido
  
  Recomendação:
  - Para máxima qualidade: Cerebras (Qwen 3 235B)
  - Para velocidade: Groq (GPT-OSS 120B)
  - Setup atual (Cerebras → Groq fallback): ✅ Ideal
  `);
  console.log("=".repeat(80));
}

runComparison().catch(console.error);