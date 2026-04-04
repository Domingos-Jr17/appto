/**
 * Test: Google AI Studio (Gemini 2.5 Flash) quality
 * Usage: node scripts/test-google-ai.mjs
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

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || "";
const GOOGLE_AI_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

async function testGoogleAI() {
  console.log("=== Testing Google AI Studio (Gemini 2.5 Flash) ===\n");
  console.log(`Model: ${GOOGLE_AI_MODEL}`);

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

  const requestBody = {
    contents: [
      { role: "user", parts: [{ text: prompt }] },
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 16000,
      responseMimeType: "application/json",
    },
  };

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `${BASE_URL}/models/${GOOGLE_AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      }
    );

    clearTimeout(timeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`HTTP: ${response.status} | Time: ${elapsed}s`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText.slice(0, 300)}`);
      return;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log(`Finish reason: ${data.candidates?.[0]?.finishReason}`);
    console.log(`Content chars: ${content.length}`);
    console.log(`Usage: ${JSON.stringify(data.usageMetadata)}`);

    if (content.length === 0) {
      console.log("❌ Empty content");
      return;
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
        console.log(`📄 ${section.title}: ${words} palavras ${icon}`);
      }
      console.log(`📊 Total: ${totalWords} palavras`);

      const devSection = parsed.sections.find((s) => s.title.includes("Desenvolvimento"));
      if (devSection) {
        console.log(`\n📖 Desenvolvimento preview (first 300 chars):`);
        console.log(`"${devSection.content.slice(0, 300)}..."`);
      }

      console.log("\n✅ Google AI Studio works!");
    } catch (e) {
      console.log(`❌ JSON parse: ${e.message}`);
      console.log(`First 400 chars: ${content.slice(0, 400)}`);
    }
  } catch (error) {
    clearTimeout(timeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    if (error.name === "AbortError") {
      console.log(`⏱️ Timeout after ${elapsed}s`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testGoogleAI().catch(console.error);
