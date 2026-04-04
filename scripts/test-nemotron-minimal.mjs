/**
 * Minimal test: Nemotron raw response
 * Usage: node scripts/test-nemotron-minimal.mjs
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

async function testNemotron() {
  console.log("=== Testing Nemotron 3 Super (Minimal) ===\n");

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

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); console.log("\nAborting after 40s..."); }, 40000);

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
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          { role: "system", content: "Assistente de escrita." },
          { role: "user", content: prompt },
        ],
        max_tokens: 6000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`HTTP: ${response.status} | Time: ${elapsed}s`);

    if (!response.ok) {
      console.log(`Error: ${await response.text()}`);
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log(`Finish: ${data.choices?.[0]?.finish_reason}`);
    console.log(`Chars: ${content.length}`);
    console.log(`Words: ${content.split(/\s+/).filter(Boolean).length}`);
    console.log(`Usage: ${JSON.stringify(data.usage)}`);
    console.log(`\nPreview:\n${content.slice(0, 500)}`);
  } catch (error) {
    clearTimeout(timeout);
    console.log(`Error: ${error.name === "AbortError" ? "Timeout" : error.message}`);
  }
}

testNemotron().catch(console.error);
