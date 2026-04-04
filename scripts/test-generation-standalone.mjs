/**
 * Standalone test: Direct AI provider test (pure Node.js, no dependencies)
 * Tests OpenRouter API directly to verify content generation works.
 *
 * Usage: node scripts/test-generation-standalone.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
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
} catch {
  console.log("Warning: Could not load .env file");
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

if (!OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY not set");
  process.exit(1);
}

async function testOpenRouterDirect() {
  console.log("=== Testing OpenRouter Direct API Call ===\n");
  console.log(`Base URL: ${OPENROUTER_BASE_URL}`);

  const payload = {
    model: "qwen/qwen3.6-plus:free",
    messages: [
      {
        role: "system",
        content:
          "Você é um assistente de escrita académica para estudantes moçambicanos. Responda exclusivamente com JSON válido, sem markdown.",
      },
      {
        role: "user",
        content: `Gere um trabalho académico sobre "Inteligência Artificial na Educação".

Tipo de trabalho: Trabalho Escolar
Contexto do briefing:
- Instituição: Escola Secundária de Maputo
- Nível académico: SECONDARY
- Norma de citação: ABNT

Use exactamente este formato JSON:
{
  "abstract": "resumo académico",
  "sections": [
    { "title": "1. Introdução", "content": "..." },
    { "title": "2. Desenvolvimento", "content": "..." },
    { "title": "3. Conclusão", "content": "..." }
  ]
}

Requisitos:
- Mantenha exactamente estes títulos e esta ordem
- Resumo entre 80 e 140 palavras
- Cada secção entre 150 e 280 palavras
- Use Português de Moçambique
- Produza JSON estritamente válido`,
      },
    ],
    max_tokens: 8000,
  };

  console.log("Sending request to OpenRouter...\n");
  const startTime = Date.now();

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aptto.mz",
        "X-Title": "aptto",
      },
      body: JSON.stringify(payload),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Response time: ${elapsed}s`);
    console.log(`HTTP Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("\n=== API Error ===");
      console.error(`Status: ${response.status}`);
      console.error(`Body: ${errorText}`);
      return;
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content || "";

    console.log("\n=== AI Response Received ===");
    console.log(`ID: ${data.id}`);
    console.log(`Content length: ${content.length} characters`);
    console.log(`Finish reason: ${data.choices?.[0]?.finish_reason || "unknown"}`);
    console.log(`Usage: ${JSON.stringify(data.usage)}`);

    if (content.length === 0) {
      console.error("\n=== ERROR: Empty content from AI ===");
      console.error("The AI returned no content. This is the root cause.");
      return;
    }

    console.log("\n--- First 600 chars ---");
    console.log(content.slice(0, 600));
    console.log("\n--- Last 200 chars ---");
    console.log(content.slice(-200));

    // Try to parse as JSON
    try {
      const jsonStr = extractJSON(content);
      const parsed = JSON.parse(jsonStr);
      console.log("\n=== JSON Parsing: SUCCESS ===");
      console.log(`Abstract length: ${parsed.abstract?.length || 0} chars`);
      console.log(`Sections count: ${parsed.sections?.length || 0}`);
      if (parsed.sections && Array.isArray(parsed.sections)) {
        parsed.sections.forEach((s) => {
          console.log(`  - "${s.title}": ${s.content?.length || 0} chars`);
        });
      }
      console.log("\n=== RESULT: Content generation works! ===");
    } catch (e) {
      console.log("\n=== JSON Parsing: FAILED ===");
      console.log(`Error: ${e.message}`);
      console.log("\nThis means the AI response is not valid JSON, which would cause the generation to fail.");
    }
  } catch (error) {
    console.error("\n=== Request FAILED ===");
    console.error(`Error: ${error.message}`);
  }
}

function extractJSON(rawContent) {
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

testOpenRouterDirect();
