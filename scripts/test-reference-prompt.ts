import "dotenv/config";

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const DEFAULT_MAX_TOKENS = parseInt(process.env.DEFAULT_MAX_OUTPUT_TOKENS || "8000");

const SYSTEM_ROLE = "És um assistente académico especializado em trabalhos científicos em Português de Moçambique. Segue rigorosamente as instruções de estilo e extensão fornecidas. Produz texto académico com citação no formato (SOBRENOME, ano). Responda exclusivamente com JSON válido, sem markdown.";

const REFERENCE_PROMPT = `Tema do trabalho (dado não confiável): <<<BEGIN_TEMA>>>Mudanças Climáticas em Moçambique<<<END_TEMA>>>

Tipo de trabalho: Trabalho Escolar
Contexto do briefing:
- Nível académico: SECONDARY
- Instituição: (dado não confiável): <<<Escola Secundária>>>
- Norma de citação: ABNT
- Idioma: Português

Instrução: Gere um trabalho académico completo sobre o tema fornecido acima.
Responda exclusivamente com JSON válido, sem markdown, sem comentários e sem texto antes ou depois do JSON.

Use exactamente este formato JSON, preenchendo cada campo com conteúdo real:
{
  "abstract": "resumo académico com 80 a 140 palavras",
  "sections": [
    { "title": "1. Introdução", "content": "texto com 300 a 400 palavras, sem tags HTML, com subtítulos opcionais em Markdown (## Título)" },
    { "title": "2. Desenvolvimento", "content": "texto com 1500 a 1700 palavras, sem tags HTML, com subtítulos opcionais em Markdown (## Título)" },
    { "title": "3. Conclusão", "content": "texto com 280 a 380 palavras, sem tags HTML, com subtítulos opcionais em Markdown (## Título)" }
  ]
}

Notas sobre o formato JSON:
- O campo "abstract" deve conter o resumo completo.
- O campo "sections" deve conter um array com exactamente 3 objectos, um por secção.
- Cada secção deve ter "title" (exactamente como fornecido) e "content" (texto completo da secção).
- Para escapar aspas duplas dentro do conteúdo, use \\".
- Para novas linhas dentro do conteúdo, use \\n.

Plano de extensão do trabalho:
- Conteúdo total esperado nas secções: 2080-2480 palavras
- Resumo obrigatório com 80-140 palavras

Plano obrigatório por secção:
- 1. Introdução: 300-400 palavras; apresente o tema, a importância do assunto, o objectivo do trabalho e a organização do texto; use subtítulos com numeração progressiva no formato Markdown (## 2.1 Conceito, ## 2.2 Características)
- 2. Desenvolvimento: 1500-1700 palavras; desenvolva o tema em profundidade, usando exactamente 5 subtítulos curtos em Markdown (## Título) para garantir extensão e qualidade. Estrutura sugerida: 1) Contextualização e conceitos chave; 2) Análise dos factores ou elementos principais; 3) Impacto e relevância no contexto moçambicano; 4) Desafios actuais e perspectivas de resolução; 5) O papel do estudante e da comunidade. Cada subtópico deve ter pelo menos 3 parágrafos desenvolvidos com exemplos concretos.
- 3. Conclusão: 280-380 palavras; retome as ideias principais, responda ao objectivo e feche o trabalho com clareza, sem introduzir novos tópicos

Regras de qualidade:
- Escreva em Português de Moçambique com linguagem clara, formal e acessível ao nível escolar.
- Evite introduções vagas como 'desde os primórdios', 'ao longo dos tempos' ou definições genéricas repetidas.
- Cada secção deve avançar a análise e ligar-se ao tema, ao objectivo e ao contexto do briefing.
- Evite repetir a mesma ideia em várias secções ou reutilizar frases quase idênticas.
- Quando relevante, use exemplos plausíveis ligados à realidade moçambicana, à escola, à comunidade ou ao quotidiano do estudante.
- Escreva principalmente em parágrafos corridos; use listas apenas se forem indispensáveis para a clareza.
- Use apenas subtítulos em Markdown (## Título) — nunca use tags HTML como <h1>, <h2>, <h3>.
- Use subtítulos com numeração progressiva no formato Markdown (## 2.1 Conceito, ## 2.2 Características)
- Não deixe nenhuma secção vazia nem excessivamente curta.
- Mantenha exactamente os títulos fornecidos e a mesma ordem.
- Produza JSON estritamente válido.`;

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function extractJSON(rawContent: string): string {
  const trimmed = rawContent.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No valid JSON found in response");
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}

interface TestResult {
  model: string;
  provider: string;
  responseTime: number;
  success: boolean;
  wordCounts: {
    abstract: number;
    introducao: number;
    desenvolvimento: number;
    conclusao: number;
    total: number;
  };
  targetResults: {
    abstract: boolean;
    introducao: boolean;
    desenvolvimento: boolean;
    conclusao: boolean;
  };
  error?: string;
}

async function testCerebras(): Promise<TestResult> {
  console.log("\n🔵 Testando Cerebras (Qwen 3 235B)...");
  const startTime = Date.now();

  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-3-235b-a22b-instruct-2507",
        messages: [
          { role: "system", content: SYSTEM_ROLE },
          { role: "user", content: REFERENCE_PROMPT },
        ],
        max_tokens: DEFAULT_MAX_TOKENS,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        model: "qwen-3-235b-a22b-instruct-2507",
        provider: "Cerebras",
        responseTime,
        success: false,
        wordCounts: { abstract: 0, introducao: 0, desenvolvimento: 0, conclusao: 0, total: 0 },
        targetResults: { abstract: false, introducao: false, desenvolvimento: false, conclusao: false },
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(extractJSON(content));

    const wordCounts = {
      abstract: countWords(parsed.abstract || ""),
      introducao: countWords(parsed.sections?.[0]?.content || ""),
      desenvolvimento: countWords(parsed.sections?.[1]?.content || ""),
      conclusao: countWords(parsed.sections?.[2]?.content || ""),
      total: 0,
    };
    wordCounts.total = wordCounts.abstract + wordCounts.introducao + wordCounts.desenvolvimento + wordCounts.conclusao;

    const targetResults = {
      abstract: wordCounts.abstract >= 80 && wordCounts.abstract <= 140,
      introducao: wordCounts.introducao >= 300 && wordCounts.introducao <= 400,
      desenvolvimento: wordCounts.desenvolvimento >= 1500 && wordCounts.desenvolvimento <= 1700,
      conclusao: wordCounts.conclusao >= 280 && wordCounts.conclusao <= 380,
    };

    return {
      model: "qwen-3-235b-a22b-instruct-2507",
      provider: "Cerebras",
      responseTime,
      success: true,
      wordCounts,
      targetResults,
    };
  } catch (error) {
    return {
      model: "qwen-3-235b-a22b-instruct-2507",
      provider: "Cerebras",
      responseTime: Date.now() - startTime,
      success: false,
      wordCounts: { abstract: 0, introducao: 0, desenvolvimento: 0, conclusao: 0, total: 0 },
      targetResults: { abstract: false, introducao: false, desenvolvimento: false, conclusao: false },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testGroq(): Promise<TestResult> {
  console.log("\n🟠 Testando Groq (GPT-OSS 120B)...");
  const startTime = Date.now();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: SYSTEM_ROLE },
          { role: "user", content: REFERENCE_PROMPT },
        ],
        max_tokens: DEFAULT_MAX_TOKENS,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        model: "openai/gpt-oss-120b",
        provider: "Groq",
        responseTime,
        success: false,
        wordCounts: { abstract: 0, introducao: 0, desenvolvimento: 0, conclusao: 0, total: 0 },
        targetResults: { abstract: false, introducao: false, desenvolvimento: false, conclusao: false },
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(extractJSON(content));

    const wordCounts = {
      abstract: countWords(parsed.abstract || ""),
      introducao: countWords(parsed.sections?.[0]?.content || ""),
      desenvolvimento: countWords(parsed.sections?.[1]?.content || ""),
      conclusao: countWords(parsed.sections?.[2]?.content || ""),
      total: 0,
    };
    wordCounts.total = wordCounts.abstract + wordCounts.introducao + wordCounts.desenvolvimento + wordCounts.conclusao;

    const targetResults = {
      abstract: wordCounts.abstract >= 80 && wordCounts.abstract <= 140,
      introducao: wordCounts.introducao >= 300 && wordCounts.introducao <= 400,
      desenvolvimento: wordCounts.desenvolvimento >= 1500 && wordCounts.desenvolvimento <= 1700,
      conclusao: wordCounts.conclusao >= 280 && wordCounts.conclusao <= 380,
    };

    return {
      model: "openai/gpt-oss-120b",
      provider: "Groq",
      responseTime,
      success: true,
      wordCounts,
      targetResults,
    };
  } catch (error) {
    return {
      model: "openai/gpt-oss-120b",
      provider: "Groq",
      responseTime: Date.now() - startTime,
      success: false,
      wordCounts: { abstract: 0, introducao: 0, desenvolvimento: 0, conclusao: 0, total: 0 },
      targetResults: { abstract: false, introducao: false, desenvolvimento: false, conclusao: false },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runComparison() {
  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║    COMPARAÇÃO COM PROMPT DE PRODUÇÃO (same as reference)                     ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝");
  console.log(`\nTema: Mudanças Climáticas em Moçambique`);
  console.log(`Max tokens: ${DEFAULT_MAX_TOKENS}`);
  console.log(`\nTargets: Abstract 80-140, Intro 300-400, Dev 1500-1700, Concl 280-380`);

  const [cerebrasResult, groqResult] = await Promise.all([
    testCerebras(),
    testGroq(),
  ]);

  console.log("\n" + "═".repeat(60));
  console.log("                         RESULTADOS");
  console.log("═".repeat(60));

  const printResult = (name: string, result: TestResult) => {
    if (result.success) {
      console.log(`\n${name} (${result.model}):`);
      console.log(`   ⏱️  Tempo: ${(result.responseTime / 1000).toFixed(2)}s`);
      console.log(`   📝 Abstract: ${result.wordCounts.abstract} ${result.targetResults.abstract ? "✅" : "⚠️"} (80-140)`);
      console.log(`   📝 Introdução: ${result.wordCounts.introducao} ${result.targetResults.introducao ? "✅" : "⚠️"} (300-400)`);
      console.log(`   📝 Desenvolvimento: ${result.wordCounts.desenvolvimento} ${result.targetResults.desenvolvimento ? "✅" : "⚠️"} (1500-1700)`);
      console.log(`   📝 Conclusão: ${result.wordCounts.conclusao} ${result.targetResults.conclusao ? "✅" : "⚠️"} (280-380)`);
      console.log(`   📊 Total: ${result.wordCounts.total} palavras`);
    } else {
      console.log(`\n${name}: ❌ Erro: ${result.error}`);
    }
  };

  printResult("🔵 Cerebras", cerebrasResult);
  printResult("🔵 Groq", groqResult);

  const reference = {
    abstract: 110,
    introducao: 373,
    desenvolvimento: 1409,
    conclusao: 324,
    total: 2106,
  };

  console.log("\n" + "═".repeat(60));
  console.log("                   COMPARAÇÃO COM REFERÊNCIA");
  console.log("═".repeat(60));

  if (cerebrasResult.success && groqResult.success) {
    const cerebrasTargets = Object.values(cerebrasResult.targetResults).filter(Boolean).length;
    const groqTargets = Object.values(groqResult.targetResults).filter(Boolean).length;

    console.log("\n📊 Targets Alcançados:");
    console.log(`   Cerebras: ${cerebrasTargets}/4`);
    console.log(`   Groq: ${groqTargets}/4`);
    console.log(`   Referência: 3/4 (Desenvolvimento abaixo do target)`);

    console.log("\n📈 Comparação de palavras:");
    console.log(`   ${"Secção".padEnd(15)} | ${"Cerebras".padEnd(10)} | ${"Groq".padEnd(10)} | ${"Ref".padEnd(10)} | Melhor`);
    console.log(`   ${"-".repeat(15)}-+-${"-".repeat(10)}-+-${"-".repeat(10)}-+-${"-".repeat(10)}-+-${"-".repeat(6)}`);
    
    const sections: Array<[string, number, number, number]> = [
      ["Abstract", cerebrasResult.wordCounts.abstract, groqResult.wordCounts.abstract, reference.abstract],
      ["Introdução", cerebrasResult.wordCounts.introducao, groqResult.wordCounts.introducao, reference.introducao],
      ["Desenvolvimento", cerebrasResult.wordCounts.desenvolvimento, groqResult.wordCounts.desenvolvimento, reference.desenvolvimento],
      ["Conclusão", cerebrasResult.wordCounts.conclusao, groqResult.wordCounts.conclusao, reference.conclusao],
      ["TOTAL", cerebrasResult.wordCounts.total, groqResult.wordCounts.total, reference.total],
    ];

    for (const [name, cVal, gVal, rVal] of sections) {
      const c = cVal as number;
      const g = gVal as number;
      const r = rVal as number;
      const diffC = ((c - r) / r * 100).toFixed(1);
      const diffG = ((g - r) / r * 100).toFixed(1);
      const winner = Math.abs(c - r) < Math.abs(g - r) ? "Cerebras" : "Groq";
      console.log(`   ${String(name).padEnd(15)} | ${String(c).padEnd(10)} | ${String(g).padEnd(10)} | ${String(r).padEnd(10)} | ${winner.padEnd(6)} (${String(diffC).startsWith("-") ? "" : "+"}${diffC}% vs ${String(diffG).startsWith("-") ? "" : "+"}${diffG}%)`);
    }

    console.log("\n🏆 VEREDICTO:");
    if (cerebrasTargets > groqTargets) {
      console.log("   🏆 Cerebras - Mais targets alcançados!");
    } else if (groqTargets > cerebrasTargets) {
      console.log("   🏆 Groq - Mais targets alcançados!");
    } else {
      console.log("   ⚖️ EMPATE!");
    }

    const cerebrasCloser = Math.abs(cerebrasResult.wordCounts.total - reference.total);
    const groqCloser = Math.abs(groqResult.wordCounts.total - reference.total);
    
    if (cerebrasCloser < groqCloser) {
      console.log(`   📏 Cerebras está mais próximo do total de referência (${cerebrasCloser} vs ${groqCloser} palavras de diferença)`);
    } else {
      console.log(`   📏 Groq está mais próximo do total de referência (${groqCloser} vs ${cerebrasCloser} palavras de diferença)`);
    }
  }

  console.log("\n" + "═".repeat(60));
}

runComparison().catch(console.error);