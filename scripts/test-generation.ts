/**
 * Test script: Direct AI content generation test
 * Tests the AI provider (OpenRouter) directly to verify
 * that content generation works (not just cover generation).
 *
 * Usage: npx tsx scripts/test-generation.ts
 */

import { getAIProvider } from "../src/lib/ai";
import type { AIChatRequest } from "../src/lib/ai-types";

async function testDirectAICall() {
  console.log("=== Testing Direct AI Provider Call ===\n");

  const provider = await getAIProvider();
  console.log(`Provider: ${provider.name}`);

  const request: AIChatRequest = {
    model: "",
    messages: [
      {
        role: "system",
        content:
          "Você é um assistente de escrita académica. Responda exclusivamente com JSON válido.",
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
- Mantenha exactamente estes títulos
- Resumo entre 80 e 140 palavras
- Cada secção entre 150 e 280 palavras
- Use Português de Moçambique
- Produza JSON estritamente válido`,
      },
    ],
    max_tokens: 8000,
  };

  console.log("Sending request to AI provider...\n");

  try {
    const response = await provider.chatCompletion(request);

    const content = response.choices[0]?.message?.content || "";

    console.log("=== AI Response Received ===");
    console.log(`Content length: ${content.length} characters`);
    console.log(`Finish reason: ${response.choices[0]?.finish_reason || "unknown"}`);
    console.log(`Usage: ${JSON.stringify(response.usage)}`);
    console.log("\n--- First 500 chars ---");
    console.log(content.slice(0, 500));
    console.log("\n--- Last 200 chars ---");
    console.log(content.slice(-200));

    // Try to parse as JSON
    try {
      const jsonStr = extractJSON(content);
      const parsed = JSON.parse(jsonStr);
      console.log("\n=== JSON Parsing: SUCCESS ===");
      console.log(`Abstract length: ${parsed.abstract?.length || 0} chars`);
      console.log(`Sections count: ${parsed.sections?.length || 0}`);
      if (parsed.sections) {
        parsed.sections.forEach((s: { title: string; content: string }) => {
          console.log(`  - "${s.title}": ${s.content.length} chars`);
        });
      }
    } catch (e) {
      console.log("\n=== JSON Parsing: FAILED ===");
      console.log(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  } catch (error) {
    console.error("\n=== AI Request FAILED ===");
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack.split("\n").slice(0, 5).join("\n"));
    }
  }
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

testDirectAICall().catch(console.error);
