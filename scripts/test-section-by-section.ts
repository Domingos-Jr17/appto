/**
 * Test script: Section-by-section generation vs single generation
 * 
 * Hypothesis: Generating each section individually produces better results
 * than trying to generate all sections in one API call
 * 
 * Usage: bun run scripts/test-section-by-section.ts
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

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

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

// ============================================================
// SECTION-BY-SECTION PROMPTS
// ============================================================

const SYSTEM_PROMPT = `Você é um assistente de escrita académica para estudantes moçambicanos.
- Gere conteúdo em Português de Moçambique formal
- Cada parágrafo deve ter 4+ frases desenvolvidas
- Use exemplos concretos sobre Moçambique
- Evite frases genéricas
- Responda APENAS com JSON válido, sem markdown`;

const SECTION_PROMPTS = {
  abstract: {
    title: "Abstract",
    prompt: `Gere um RESUMO ACADÉMICO sobre "Mudanças Climáticas em Moçambique".

Requisitos:
- Extensão: 80-140 palavras
- Deve conter: tema, objetivo breve, método resumido e principais conclusões
- Português de Moçambique formal

Formato JSON: {"content": "o resumo aqui"}`
  },
  introducao: {
    title: "1. Introdução",
    prompt: `Gere a secção INTRODUÇÃO de um trabalho académico sobre "Mudanças Climáticas em Moçambique".

Requisitos:
- Extensão: 300-400 palavras
- Deve conter: contextualização do tema em Moçambique, relevância, objetivo do trabalho
- Mínimo: 4 parágrafos desenvolvidos (4+ frases cada)
- Inclua exemplos concretos sobre Moçambique

Formato JSON: {"content": "a introdução aqui"}`
  },
  desenvolvimento: {
    title: "2. Desenvolvimento",
    prompt: `Gere a secção DESENVOLVIMENTO de um trabalho académico sobre "Mudanças Climáticas em Moçambique".

Requisitos:
- Extensão: 600-800 palavras (mínimo 600!)
- Deve conter: conceitos principais, análise detalhada, exemplos concretos sobre Moçambique
- Use subtítulos em Markdown (##)
- Mínimo: 6 parágrafos desenvolvidos (4+ frases cada)
- Inclua dados específicos sobre Moçambique (secas, cheias, ciclones, etc.)

Formato JSON: {"content": "o desenvolvimento aqui"}`
  },
  conclusao: {
    title: "3. Conclusão",
    prompt: `Gere a secção CONCLUSÃO de um trabalho académico sobre "Mudanças Climáticas em Moçambique".

Requisitos:
- Extensão: 280-380 palavras
- Deve conter: síntese das ideias principais, resposta ao objetivo, reflexão final
- Mínimo: 3 parágrafos desenvolvidos
- Portuguese de Moçambique formal

Formato JSON: {"content": "a conclusão aqui"}`
  }
};

interface SectionResult {
  title: string;
  words: number;
  time: number;
  success: boolean;
  content?: string;
  error?: string;
}

async function generateSection(
  provider: "cerebras" | "groq",
  sectionKey: keyof typeof SECTION_PROMPTS
): Promise<SectionResult> {
  const section = SECTION_PROMPTS[sectionKey];
  const startTime = Date.now();

  const providerConfig = provider === "cerebras" 
    ? { url: CEREBRAS_BASE_URL, key: CEREBRAS_API_KEY, model: "qwen-3-235b-a22b-instruct-2507" }
    : { url: GROQ_BASE_URL, key: GROQ_API_KEY, model: "openai/gpt-oss-120b" };

  try {
    const response = await fetch(`${providerConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerConfig.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: section.prompt }
        ],
        max_tokens: 4000,
        temperature: 0,
      }),
    });

    const time = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        title: section.title,
        words: 0,
        time,
        success: false,
        error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const parsed = JSON.parse(extractJSON(content));
    const text = parsed.content || parsed.text || "";

    return {
      title: section.title,
      words: countWords(text),
      time,
      success: true,
      content: text
    };
  } catch (error) {
    return {
      title: section.title,
      words: 0,
      time: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testSectionBySection(provider: "cerebras" | "groq", providerName: string) {
  console.log(`\n🧪 Testando geração SECÇÃO POR SECÇÃO com ${providerName}...`);
  
  const results: SectionResult[] = [];
  const sections = ["abstract", "introducao", "desenvolvimento", "conclusao"] as const;

  for (const sectionKey of sections) {
    const result = await generateSection(provider, sectionKey);
    results.push(result);
    
    const status = result.success ? "✅" : "❌";
    console.log(`   ${status} ${result.title}: ${result.words} palavras (${(result.time/1000).toFixed(1)}s)`);
    
    if (!result.success) {
      console.log(`      Erro: ${result.error}`);
    }
  }

  return results;
}

async function runComparison() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("   TESTE: Geração Secção por Secção vs Geração Única");
  console.log("═══════════════════════════════════════════════════════════");

  // Test Cerebras section-by-section
  const cerebrasResults = await testSectionBySection("cerebras", "Cerebras (Qwen3 235B)");
  
  // Test Groq section-by-section  
  const groqResults = await testSectionBySection("groq", "Groq (GPT OSS 120)");

  // Analysis
  console.log("\n" + "═".repeat(60));
  console.log("                    RESULTADOS");
  console.log("═".repeat(60));

  const cerebrasTotal = cerebrasResults.reduce((sum, r) => sum + r.words, 0);
  const groqTotal = groqResults.reduce((sum, r) => sum + r.words, 0);
  const cerebrasTime = cerebrasResults.reduce((sum, r) => sum + r.time, 0);
  const groqTime = groqResults.reduce((sum, r) => sum + r.time, 0);

  console.log(`\n🔵 Cerebras (Secção por Secção):`);
  console.log(`   ⏱️  Tempo total: ${(cerebrasTime / 1000).toFixed(1)}s`);
  console.log(`   📊 Total palavras: ${cerebrasTotal}`);

  console.log(`\n🟠 Groq (Secção por Secção):`);
  console.log(`   ⏱️  Tempo total: ${(groqTime / 1000).toFixed(1)}s`);
  console.log(`   📊 Total palavras: ${groqTotal}`);

  // Target verification
  console.log(`\n🎯 Verificação de Targets:`);
  
  const check = (actual: number, min: number, max: number) => 
    actual >= min && actual <= max ? "✅" : "⚠️";

  console.log(`   Abstract (80-140): ${check(cerebrasResults[0].words, 80, 140)} Cerebras (${cerebrasResults[0].words}) vs ${check(groqResults[0].words, 80, 140)} Groq (${groqResults[0].words})`);
  console.log(`   Introdução (300-400): ${check(cerebrasResults[1].words, 300, 400)} Cerebras (${cerebrasResults[1].words}) vs ${check(groqResults[1].words, 300, 400)} Groq (${groqResults[1].words})`);
  console.log(`   Desenvolvimento (600-800): ${check(cerebrasResults[2].words, 600, 800)} Cerebras (${cerebrasResults[2].words}) vs ${check(groqResults[2].words, 600, 800)} Groq (${groqResults[2].words})`);
  console.log(`   Conclusão (280-380): ${check(cerebrasResults[3].words, 280, 380)} Cerebras (${cerebrasResults[3].words}) vs ${check(groqResults[3].words, 280, 380)} Groq (${groqResults[3].words})`);

  // Veredicto
  console.log(`\n🏆 VEREDICTO:`);
  
  const cerebrasScore = cerebrasResults.filter((r, i) => {
    const targets = [[80, 140], [300, 400], [600, 800], [280, 380]];
    return r.words >= targets[i][0] && r.words <= targets[i][1];
  }).length;

  const groqScore = groqResults.filter((r, i) => {
    const targets = [[80, 140], [300, 400], [600, 800], [280, 380]];
    return r.words >= targets[i][0] && r.words <= targets[i][1];
  }).length;

  console.log(`   Cerebras: ${cerebrasScore}/4 secções no target`);
  console.log(`   Groq: ${groqScore}/4 secções no target`);

  if (groqScore > cerebrasScore) {
    console.log(`\n   🏆 Groq (GPT OSS 120) é MELHOR para geração secção por secção!`);
  } else if (cerebrasScore > groqScore) {
    console.log(`\n   🏆 Cerebras (Qwen3 235B) é MELHOR para geração secção por secção!`);
  } else {
    console.log(`\n   ⚖️ EMPATE!`);
  }

  // Compare with single generation
  console.log(`\n📈 Comparação com Geração Única:`);
  console.log(`   - Geração única (Cerebras): ~973 palavras`);
  console.log(`   - Secção por secção (Cerebras): ${cerebrasTotal} palavras (${((cerebrasTotal/973-1)*100).toFixed(1)}%)`);
  console.log(`   - Geração única (Groq): ~1302 palavras`);
  console.log(`   - Secção por secção (Groq): ${groqTotal} palavras (${((groqTotal/1302-1)*100).toFixed(1)}%)`);

  console.log("\n" + "═".repeat(60));
}

runComparison().catch(console.error);
