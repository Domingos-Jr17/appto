/**
 * Test the fallback chain: Qwen -> Nemotron 3 Super
 * Usage: node scripts/test-fallback-chain.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
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
  "nvidia/nemotron-3-super-120b-a12b:free",
];

async function testModel(model) {
  console.log(`\nTesting: ${model}`);
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
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Responda com uma frase curta sobre inteligência artificial em português.",
          },
          { role: "user", content: "O que é IA?" },
        ],
        max_tokens: 200,
      }),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  ❌ ${response.status} - ${elapsed}s`);
      console.log(`  ${errorText.slice(0, 150)}`);
      return false;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const elapsedNum = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ✅ ${elapsedNum}s | ${content.length} chars`);
    console.log(`  "${content.slice(0, 120)}..."`);
    return true;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ❌ Error - ${elapsed}s | ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=== Testing Model Fallback Chain ===");
  console.log(`Base URL: ${OPENROUTER_BASE_URL}`);

  for (const model of MODELS) {
    await testModel(model);
  }
}

main().catch(console.error);
