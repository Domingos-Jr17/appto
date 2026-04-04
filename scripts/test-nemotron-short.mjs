/**
 * Minimal test: Nemotron short prompt
 * Usage: node scripts/test-nemotron-short.mjs
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
  console.log("=== Testing Nemotron 3 Super (Short) ===\n");

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); console.log("\nAborting after 30s..."); }, 30000);

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
          { role: "system", content: "Responda com uma frase curta." },
          { role: "user", content: "O que é IA?" },
        ],
        max_tokens: 200,
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

    console.log("Reading response...");
    const text = await response.text();
    console.log(`Response size: ${text.length} bytes`);

    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`Content: "${content}"`);
    console.log(`Chars: ${content.length}`);
    console.log(`Usage: ${JSON.stringify(data.usage)}`);
  } catch (error) {
    clearTimeout(timeout);
    console.log(`Error: ${error.name === "AbortError" ? "Timeout" : error.message}`);
  }
}

testNemotron().catch(console.error);
