/**
 * Test: Google Gemma 3 27B quality
 * Usage: node scripts/test-gemma.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, "..", ".env");
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
} catch {}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

const MODELS = [
  "qwen/qwen3.6-plus:free",
  "google/gemma-3-27b-it:free",
];

async function testModel(model, prompt, systemPrompt) {
  console.log(`\nTesting: ${model}`);
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aptto.mz",
        "X-Title": "aptto",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 8000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  HTTP: ${response.status} | Time: ${elapsed}s`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  ❌ ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log(`  Finish: ${data.choices?.[0]?.finish_reason}`);
    console.log(`  Chars: ${content.length}`);
    console.log(`  Usage: ${JSON.stringify(data.usage)}`);

    if (content.length === 0) {
      console.log(`  ❌ Empty content`);
      return null;
    }

    // Parse JSON
    try {
      const trimmed = content.trim();
      const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidate = fencedMatch?.[1]?.trim() || trimmed;
      const firstBrace = candidate.indexOf("{");
      const lastBrace = candidate.lastIndexOf("}");
      const jsonStr = candidate.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);

      let totalWords = 0;
      for (const section of parsed.sections) {
        const words = section.content?.split(/\s+/).filter(Boolean).length || 0;
        totalWords += words;
        const icon = words >= 220 ? "✅" : "⚠️";
        console.log(`  📄 ${section.title}: ${words} palavras ${icon}`);
      }
      console.log(`  📊 Total: ${totalWords} palavras`);

      const devSection = parsed.sections.find((s) => s.title.includes("Desenvolvimento"));
      if (devSection) {
        console.log(`  📖 Preview: "${devSection.content.slice(0, 250)}..."`);
      }

      return { model, words: totalWords, elapsed };
    } catch (e) {
      console.log(`  ❌ JSON parse: ${e.message}`);
      console.log(`  First 300: ${content.slice(0, 300)}`);
      return null;
    }
  } catch (error) {
    clearTimeout(timeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    if (error.name === "AbortError") {
      console.log(`  ⏱️ Timeout after ${elapsed}s`);
    } else {
      console.log(`  ❌ Error: ${error.message}`);
    }
    return null;
  }
}

async function main() {
  console.log("=== Testing Qwen vs Gemma 3 27B ===\n");

  const prompt = `Gere um trabalho escolar sobre "Mudanças climáticas em Moçambique".

Responda exclusivamente com JSON válido, sem markdown.

Use exactamente este formato:
{
  "sections": [
    { "title": "1. Introdução", "content": "..." },
    { "title": "2. Desenvolvimento", "content": "..." },
    { "title": "3. Conclusão", "content": "..." }
  ]
}

Requisitos:
- Introdução: 260-360 palavras
- Desenvolvimento: 1100-1700 palavras com 3-5 subtítulos curtos
- Conclusão: 220-320 palavras
- Português de Moçambique, linguagem escolar simples
- Exemplos ligados à realidade moçambicana
- JSON estritamente válido`;

  const systemPrompt = "Assistente de escrita para ensino secundário moçambicano.";

  for (const model of MODELS) {
    await testModel(model, prompt, systemPrompt);
  }
}

main().catch(console.error);
