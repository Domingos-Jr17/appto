/**
 * Test script: Analyze prompts vs model quality
 * 
 * Usage: bun run scripts/test-qwen-comparison.ts
 * 
 * Tests different prompt strategies to identify if the issue is:
 * 1. Prompt quality (instructions, format, examples)
 * 2. Model quality (capability of the AI model)
 * 3. Both
 */

import { readFileSync } from "fs";
import { join } from "path";

// Load .env manually
const envPath = join(process.cwd(), ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found
}

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || "";
const CEREBRAS_BASE_URL = process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

const USER_PROMPT = `Você é um assistente de escrita académica para estudantes moçambicanos.

## Tarefa
Gere um trabalho académico completo sobre: "Mudanças Climáticas em Moçambique"

## Contexto
- Tipo: Trabalho Escolar
- Nível: Ensino Secundário
- Norma: ABNT

## Formato JSON Obrigatório
{
  "abstract": "resumo académico",
  "sections": [
    {"title": "1. Introdução", "content": "conteúdo completo"},
    {"title": "2. Desenvolvimento", "content": "conteúdo completo"},
    {"title": "3. Conclusão", "content": "conteúdo completo"}
  ]
}

## Requisitos Obrigatórios

### Abstract (Resumo)
- Extensão: 80-140 palavras
- Deve conter: tema, objetivo e conclusão breve

### 1. Introdução
- Extensão: 300-400 palavras
- Deve ter: contextualização, relevância do tema em Moçambique, objetivo
- Mínimo: 4 parágrafos desenvolvidos

### 2. Desenvolvimento
- Extensão: 500-800 palavras
- Deve ter: conceitos, análise, exemplos concretos sobre Moçambique
- Usar subtítulos em Markdown (##)
- Mínimo: 5 parágrafos desenvolvidos

### 3. Conclusão
- Extensão: 280-380 palavras
- Deve ter: síntese, resposta ao objetivo, reflexão final
- Mínimo: 3 parágrafos desenvolvidos

## Regras de Qualidade
- Cada parágrafo deve ter 4+ frases desenvolvidas
- Use exemplos concretos sobre Moçambique
- Evite frases genéricas sem conteúdo
- Português de Moçambique formal
- JSON válido sem markdown`;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
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
  error?: string;
}

async function testCerebrasQwen(): Promise<TestResult> {
  console.log("\n🔵 Testando Qwen3 235B via Cerebras...");

  const startTime = Date.now();

  try {
    const response = await fetch(`${CEREBRAS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-3-235b-a22b-instruct-2507",
        messages: [
          {
            role: "system",
            content: "Você é um assistente de escrita académica para estudantes moçambicanos. Responda exclusivamente com JSON válido, sem markdown.",
          },
          {
            role: "user",
            content: USER_PROMPT,
          },
        ],
        max_tokens: 4000,
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
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const parsed = JSON.parse(extractJSON(content));

    return {
      model: "qwen-3-235b-a22b-instruct-2507",
      provider: "Cerebras",
      responseTime,
      success: true,
      wordCounts: {
        abstract: countWords(parsed.abstract || ""),
        introducao: countWords(parsed.sections?.[0]?.content || ""),
        desenvolvimento: countWords(parsed.sections?.[1]?.content || ""),
        conclusao: countWords(parsed.sections?.[2]?.content || ""),
        total: 0,
      },
    };
  } catch (error) {
    return {
      model: "qwen-3-235b-a22b-instruct-2507",
      provider: "Cerebras",
      responseTime: Date.now() - startTime,
      success: false,
      wordCounts: { abstract: 0, introducao: 0, desenvolvimento: 0, conclusao: 0, total: 0 },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testGroqGptOss(): Promise<TestResult> {
  console.log("\n🟠 Testando GPT OSS 120 via Groq...");

  const startTime = Date.now();

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: "Você é um assistente de escrita académica para estudantes moçambicanos. Responda exclusivamente com JSON válido, sem markdown.",
          },
          {
            role: "user",
            content: USER_PROMPT,
          },
        ],
        max_tokens: 4000,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        model: "gpt-oss-120b",
        provider: "Groq",
        responseTime,
        success: false,
        wordCounts: { abstract: 0, introducao: 0, desenvolvimento: 0, conclusao: 0, total: 0 },
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const parsed = JSON.parse(extractJSON(content));

    return {
      model: "gpt-oss-120b",
      provider: "Groq",
      responseTime,
      success: true,
      wordCounts: {
        abstract: countWords(parsed.abstract || ""),
        introducao: countWords(parsed.sections?.[0]?.content || ""),
        desenvolvimento: countWords(parsed.sections?.[1]?.content || ""),
        conclusao: countWords(parsed.sections?.[2]?.content || ""),
        total: 0,
      },
    };
  } catch (error) {
    return {
      model: "gpt-oss-120b",
      provider: "Groq",
      responseTime: Date.now() - startTime,
      success: false,
      wordCounts: { abstract: 0, introducao: 0, desenvolvimento: 0, conclusao: 0, total: 0 },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runComparison() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("   COMPARAÇÃO: Qwen3 235B (Cerebras) vs GPT OSS 120 (Groq)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\nTema: Mudanças Climáticas em Moçambique`);
  console.log(`Nível: SECONDARY (Trabalho Escolar)`);

  const [cerebrasResult, groqResult] = await Promise.all([
    testCerebrasQwen(),
    testGroqGptOss(),
  ]);

  console.log("\n" + "═".repeat(60));
  console.log("                    RESULTADOS");
  console.log("═".repeat(60));

  // Cerebras Result
  console.log(`\n🔵 Qwen3 235B (Cerebras):`);
  if (cerebrasResult.success) {
    const total = cerebrasResult.wordCounts.abstract + cerebrasResult.wordCounts.introducao + 
                  cerebrasResult.wordCounts.desenvolvimento + cerebrasResult.wordCounts.conclusao;
    console.log(`   ⏱️  Tempo de resposta: ${(cerebrasResult.responseTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Resumo: ${cerebrasResult.wordCounts.abstract} palavras`);
    console.log(`   📝 Introdução: ${cerebrasResult.wordCounts.introducao} palavras`);
    console.log(`   📝 Desenvolvimento: ${cerebrasResult.wordCounts.desenvolvimento} palavras`);
    console.log(`   📝 Conclusão: ${cerebrasResult.wordCounts.conclusao} palavras`);
    console.log(`   📊 Total: ${total} palavras`);
  } else {
    console.log(`   ❌ Erro: ${cerebrasResult.error}`);
  }

  // Groq Result
  console.log(`\n🟠 GPT OSS 120 (Groq):`);
  if (groqResult.success) {
    const total = groqResult.wordCounts.abstract + groqResult.wordCounts.introducao + 
                  groqResult.wordCounts.desenvolvimento + groqResult.wordCounts.conclusao;
    console.log(`   ⏱️  Tempo de resposta: ${(groqResult.responseTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Resumo: ${groqResult.wordCounts.abstract} palavras`);
    console.log(`   📝 Introdução: ${groqResult.wordCounts.introducao} palavras`);
    console.log(`   📝 Desenvolvimento: ${groqResult.wordCounts.desenvolvimento} palavras`);
    console.log(`   📝 Conclusão: ${groqResult.wordCounts.conclusao} palavras`);
    console.log(`   📊 Total: ${total} palavras`);
  } else {
    console.log(`   ❌ Erro: ${groqResult.error}`);
  }

  // Comparison
  console.log("\n" + "═".repeat(60));
  console.log("                   ANÁLISE COMPARATIVA");
  console.log("═".repeat(60));

  if (cerebrasResult.success && groqResult.success) {
    const cerebrasTotal = cerebrasResult.wordCounts.abstract + cerebrasResult.wordCounts.introducao + 
                          cerebrasResult.wordCounts.desenvolvimento + cerebrasResult.wordCounts.conclusao;
    const groqTotal = groqResult.wordCounts.abstract + groqResult.wordCounts.introducao + 
                            groqResult.wordCounts.desenvolvimento + groqResult.wordCounts.conclusao;

    const speedDiff = ((groqResult.responseTime / cerebrasResult.responseTime - 1) * 100).toFixed(1);
    const wordsDiff = cerebrasTotal - groqTotal;

    console.log(`\n📈 Velocidade:`);
    console.log(`   - Cerebras: ${(cerebrasResult.responseTime / 1000).toFixed(2)}s`);
    console.log(`   - Groq: ${(groqResult.responseTime / 1000).toFixed(2)}s`);
    console.log(`   - Cerebras é ${speedDiff}% ${parseFloat(speedDiff) > 0 ? "mais rápido" : "mais lento"}`);

    console.log(`\n📝 Contagem de palavras:`);
    console.log(`   - Cerebras: ${cerebrasTotal} palavras`);
    console.log(`   - Groq: ${groqTotal} palavras`);
    console.log(`   - Diferença: ${wordsDiff > 0 ? "+" : ""}${wordsDiff} palavras`);

    // Targets
    console.log(`\n🎯 Verificação de Targets (alvo: 80-140 resumo, 300-500 por secção):`);
    
    const checkAbstract = (count: number, min: number, max: number) => 
      count >= min && count <= max ? "✅" : "⚠️";
    
    const checkSection = (count: number, min: number, max: number) => 
      count >= min && count <= max ? "✅" : "⚠️";

    console.log(`   Abstract: ${checkAbstract(cerebrasResult.wordCounts.abstract, 80, 140)} Cerebras (${cerebrasResult.wordCounts.abstract}) vs ${checkAbstract(groqResult.wordCounts.abstract, 80, 140)} Groq (${groqResult.wordCounts.abstract})`);
    console.log(`   Introdução: ${checkSection(cerebrasResult.wordCounts.introducao, 300, 500)} Cerebras (${cerebrasResult.wordCounts.introducao}) vs ${checkSection(groqResult.wordCounts.introducao, 300, 500)} Groq (${groqResult.wordCounts.introducao})`);
    console.log(`   Desenvolvimento: ${checkSection(cerebrasResult.wordCounts.desenvolvimento, 300, 500)} Cerebras (${cerebrasResult.wordCounts.desenvolvimento}) vs ${checkSection(groqResult.wordCounts.desenvolvimento, 300, 500)} Groq (${groqResult.wordCounts.desenvolvimento})`);
    console.log(`   Conclusão: ${checkSection(cerebrasResult.wordCounts.conclusao, 300, 500)} Cerebras (${cerebrasResult.wordCounts.conclusao}) vs ${checkSection(groqResult.wordCounts.conclusao, 300, 500)} Groq (${groqResult.wordCounts.conclusao})`);
  }

  // ============================================================
  // COMPARAÇÃO COM OUTPUT DOCUMENTADO (content-evaluation)
  // ============================================================
  console.log("\n" + "═".repeat(60));
  console.log("          COMPARAÇÃO COM OUTPUT DOCUMENTADO");
  console.log("═".repeat(60));
  
  // Output documentado: content-evaluation-1775470881774.md (Score: 94%)
  const documentedOutput = {
    model: "qwen/qwen3.6-plus (documentado)",
    provider: "OpenRouter",
    score: "94%",
    abstract: 110,
    introducao: 373,
    desenvolvimento: 1409,
    conclusao: 324,
    total: 2106,
    target: {
      abstract: "80-140",
      introducao: "300-400",
      desenvolvimento: "1500-1700",
      conclusao: "280-380"
    }
  };

  console.log(`\n📋 Output Documentado (Score: 94%):`);
  console.log(`   Modelo: ${documentedOutput.model}`);
  console.log(`   - Abstract: ${documentedOutput.abstract} palavras (target: ${documentedOutput.target.abstract})`);
  console.log(`   - Introdução: ${documentedOutput.introducao} palavras (target: ${documentedOutput.target.introducao})`);
  console.log(`   - Desenvolvimento: ${documentedOutput.desenvolvimento} palavras (target: ${documentedOutput.target.desenvolvimento})`);
  console.log(`   - Conclusão: ${documentedOutput.conclusao} palavras (target: ${documentedOutput.target.conclusao})`);
  console.log(`   - Total: ${documentedOutput.total} palavras`);

  if (cerebrasResult.success && groqResult.success) {
    console.log(`\n🔵 Qwen3 235B (Cerebras) vs 🟠 GPT OSS 120 (Groq) vs 📋 Documentado:`);
    
    const compare = (label: string, val: number, oldVal: number) => {
      const diff = val - oldVal;
      const percent = ((diff / oldVal) * 100).toFixed(1);
      const symbol = diff > 0 ? "🔺" : diff < 0 ? "🔻" : "➖";
      return `${symbol} ${label}: ${val} vs ${oldVal} (${diff > 0 ? "+" : ""}${percent}%)`;
    };

    const cerebrasTotal = cerebrasResult.wordCounts.abstract + cerebrasResult.wordCounts.introducao + 
                          cerebrasResult.wordCounts.desenvolvimento + cerebrasResult.wordCounts.conclusao;
    const groqTotal = groqResult.wordCounts.abstract + groqResult.wordCounts.introducao + 
                      groqResult.wordCounts.desenvolvimento + groqResult.wordCounts.conclusao;

    console.log(`   --- Cerebras vs Documentado ---`);
    console.log(`   ${compare("Abstract", cerebrasResult.wordCounts.abstract, documentedOutput.abstract)}`);
    console.log(`   ${compare("Introdução", cerebrasResult.wordCounts.introducao, documentedOutput.introducao)}`);
    console.log(`   ${compare("Desenvolvimento", cerebrasResult.wordCounts.desenvolvimento, documentedOutput.desenvolvimento)}`);
    console.log(`   ${compare("Conclusão", cerebrasResult.wordCounts.conclusao, documentedOutput.conclusao)}`);
    console.log(`   ${compare("Total", cerebrasTotal, documentedOutput.total)}`);

    console.log(`\n   --- Groq vs Documentado ---`);
    console.log(`   ${compare("Abstract", groqResult.wordCounts.abstract, documentedOutput.abstract)}`);
    console.log(`   ${compare("Introdução", groqResult.wordCounts.introducao, documentedOutput.introducao)}`);
    console.log(`   ${compare("Desenvolvimento", groqResult.wordCounts.desenvolvimento, documentedOutput.desenvolvimento)}`);
    console.log(`   ${compare("Conclusão", groqResult.wordCounts.conclusao, documentedOutput.conclusao)}`);
    console.log(`   ${compare("Total", groqTotal, documentedOutput.total)}`);

    // Avaliação de qualidade baseada na estrutura
    console.log(`\n🎯 Análise de Qualidade:`);
    
    const cerAbstractOK = cerebrasResult.wordCounts.abstract >= 80 && cerebrasResult.wordCounts.abstract <= 140;
    const groqAbstractOK = groqResult.wordCounts.abstract >= 80 && groqResult.wordCounts.abstract <= 140;
    const cerIntroOK = cerebrasResult.wordCounts.introducao >= 300 && cerebrasResult.wordCounts.introducao <= 500;
    const groqIntroOK = groqResult.wordCounts.introducao >= 300 && groqResult.wordCounts.introducao <= 500;
    const cerDevOK = cerebrasResult.wordCounts.desenvolvimento >= 300 && cerebrasResult.wordCounts.desenvolvimento <= 500;
    const groqDevOK = groqResult.wordCounts.desenvolvimento >= 300 && groqResult.wordCounts.desenvolvimento <= 500;
    const cerConclOK = cerebrasResult.wordCounts.conclusao >= 300 && cerebrasResult.wordCounts.conclusao <= 500;
    const groqConclOK = groqResult.wordCounts.conclusao >= 300 && groqResult.wordCounts.conclusao <= 500;

    console.log(`   Abstract (80-140): ${cerAbstractOK ? "✅" : "⚠️"} Cerebras vs ${groqAbstractOK ? "✅" : "⚠️"} Groq`);
    console.log(`   Introdução: ${cerIntroOK ? "✅" : "⚠️"} Cerebras vs ${groqIntroOK ? "✅" : "⚠️"} Groq`);
    console.log(`   Desenvolvimento: ${cerDevOK ? "✅" : "⚠️"} Cerebras vs ${groqDevOK ? "✅" : "⚠️"} Groq`);
    console.log(`   Conclusão: ${cerConclOK ? "✅" : "⚠️"} Cerebras vs ${groqConclOK ? "✅" : "⚠️"} Groq`);

    // Veredicto
    console.log(`\n🏆 VEREDICTO FINAL:`);
    
    const cerebrasScore = [cerAbstractOK, cerIntroOK, cerDevOK, cerConclOK].filter(Boolean).length;
    const groqScore = [groqAbstractOK, groqIntroOK, groqDevOK, groqConclOK].filter(Boolean).length;
    
    if (cerebrasScore > groqScore) {
      console.log(`   🏆 Qwen3 235B (Cerebras) - VENCEDOR!`);
      console.log(`   - Score: ${cerebrasScore}/4 vs ${groqScore}/4`);
    } else if (groqScore > cerebrasScore) {
      console.log(`   🏆 GPT OSS 120 (Groq) - VENCEDOR!`);
      console.log(`   - Score: ${groqScore}/4 vs ${cerebrasScore}/4`);
    } else {
      console.log(`   ⚖️ EMPATE!`);
      console.log(`   - Score: ${cerebrasScore}/4 vs ${groqScore}/4`);
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   - Cerebras: ${cerebrasTotal} palavras em ${(cerebrasResult.responseTime/1000).toFixed(1)}s`);
    console.log(`   - Groq: ${groqTotal} palavras em ${(groqResult.responseTime/1000).toFixed(1)}s`);
    console.log(`   - Documentado: ${documentedOutput.total} palavras (referência)`);
  } else if (cerebrasResult.success) {
    console.log(`\n⚠️ Groq falhou, não é possível comparar`);
  }

  console.log("\n" + "═".repeat(60));
}

runComparison().catch(console.error);
