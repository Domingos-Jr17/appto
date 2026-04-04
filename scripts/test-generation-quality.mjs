/**
 * Quality analysis test: Evaluates AI output quality for academic content generation
 * Tests both providers and analyzes output depth, word counts, and structure.
 *
 * Usage: node scripts/test-generation-quality.mjs
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
} catch (e) {}

// ─── Test Scenarios ──────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    name: "Trabalho Escolar (SECONDARY)",
    type: "SCHOOL_WORK",
    educationLevel: "SECONDARY",
    title: "Inteligência Artificial na Educação",
    institution: "Escola Secundária de Maputo",
    expectedSections: ["1. Introdução", "2. Desenvolvimento", "3. Conclusão"],
    minWordsPerSection: 150,
    maxWordsPerSection: 280,
    minAbstractWords: 80,
    maxAbstractWords: 140,
  },
  {
    name: "Monografia (HIGHER_EDUCATION)",
    type: "MONOGRAPHY",
    educationLevel: "HIGHER_EDUCATION",
    title: "Impacto das Redes Sociais na Saúde Mental dos Jovens",
    institution: "Universidade Eduardo Mondlane",
    expectedSections: ["1. Introdução", "2. Revisão da Literatura", "3. Metodologia", "4. Desenvolvimento", "5. Conclusão"],
    minWordsPerSection: 220,
    maxWordsPerSection: 380,
    minAbstractWords: 140,
    maxAbstractWords: 220,
  },
  {
    name: "Ensaio (HIGHER_EDUCATION)",
    type: "ESSAY",
    educationLevel: "HIGHER_EDUCATION",
    title: "Desafios da Digitalização em Moçambique",
    institution: "Universidade Católica de Moçambique",
    expectedSections: ["1. Introdução", "2. Desenvolvimento", "3. Conclusão"],
    minWordsPerSection: 220,
    maxWordsPerSection: 380,
    minAbstractWords: 140,
    maxAbstractWords: 220,
  },
];

// ─── Provider Configs ────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    name: "OpenRouter (Qwen)",
    url: `${process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"}/chat/completions`,
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aptto.mz",
      "X-Title": "aptto",
    },
    model: "qwen/qwen3.6-plus:free",
  },
  {
    name: "Z.AI (GLM)",
    url: `${process.env.ZAI_BASE_URL || "https://api.z.ai/api/paas/v4"}/chat/completions`,
    headers: {
      Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
      "Content-Type": "application/json",
      "Accept-Language": "en-US,en",
    },
    model: "glm-4.7-flash",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countWords(text) {
  return text?.split(/\s+/).filter(Boolean).length || 0;
}

function extractJSON(rawContent) {
  const trimmed = rawContent.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No valid JSON found");
  }
  return candidate.slice(firstBrace, lastBrace + 1);
}

function buildPrompt(scenario) {
  const isSchool = scenario.educationLevel === "SECONDARY" || scenario.educationLevel === "TECHNICAL";
  const sectionWords = isSchool ? "entre 150 e 280" : "entre 220 e 380";
  const abstractReq = isSchool ? "entre 80 e 140 palavras" : "entre 140 e 220 palavras";

  return `Gere um trabalho académico sobre "${scenario.title}".

Tipo de trabalho: ${scenario.type}
Contexto do briefing:
- Instituição: ${scenario.institution}
- Nível académico: ${scenario.educationLevel}
- Norma de citação: ABNT

Responda exclusivamente com JSON válido, sem markdown.

Use exactamente este formato:
{
  "abstract": "resumo académico",
  "sections": [
    ${scenario.expectedSections.map((s) => `{ "title": "${s}", "content": "..." }`).join(",\n    ")}
  ]
}

Requisitos obrigatórios:
- Mantenha exactamente estes títulos e esta ordem: ${scenario.expectedSections.join(", ")}
- O resumo deve ter ${abstractReq}
- Cada secção deve ter ${sectionWords} palavras
- Use Português académico de Moçambique${isSchool ? " (simplificado para o ensino secundário)" : ""}
- Respeite a norma ABNT
- Não fabrique referências bibliográficas, leis, dados estatísticos ou autores específicos
- Produza JSON estritamente válido`;
}

function buildSystemPrompt(educationLevel) {
  if (educationLevel === "SECONDARY") {
    return `Você é um assistente de escrita para estudantes do ensino secundário moçambicano.
Gere conteúdo simples e acessível em Português de Moçambique.
Use frases curtas e vocabulário acessível.
Evite jargão técnico excessivo.
Não é obrigatório incluir citações formais no texto.
Estrutura básica: Introdução, Desenvolvimento, Conclusão.`;
  }
  if (educationLevel === "TECHNICAL") {
    return `Você é um assistente de escrita para estudantes do ensino técnico profissional moçambicano.
Gere conteúdo técnico e prático em Português de Moçambique.
Use terminologia técnica apropriada com foco em aplicações práticas.`;
  }
  return `Você é um especialista em escrita académica para estudantes moçambicanos.
Gere conteúdo académico de alta qualidade em Português de Moçambique.
Siga a norma de citação pedida no briefing.
Adapte o nível de linguagem ao nível educacional indicado:
- SECONDARY: linguagem simples, frases curtas, vocabulário acessível
- TECHNICAL: terminologia técnica prática, foco em aplicações
- HIGHER_EDUCATION: linguagem formal, terminologia académica, citações obrigatórias
Nunca invente metadados da capa sem base no briefing.`;
}

async function callProvider(provider, scenario) {
  const startTime = Date.now();
  const response = await fetch(provider.url, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: buildSystemPrompt(scenario.educationLevel) },
        { role: "user", content: buildPrompt(scenario) },
      ],
      max_tokens: 8000,
    }),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!response.ok) {
    const errorText = await response.text();
    return { error: true, status: response.status, body: errorText, elapsed };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  return {
    error: false,
    elapsed: parseFloat(elapsed),
    content,
    finishReason: data.choices?.[0]?.finish_reason,
    usage: data.usage,
  };
}

function analyzeContent(content, scenario) {
  const results = {
    jsonValid: false,
    jsonError: null,
    abstract: { words: 0, text: "", inRange: false },
    sections: [],
    totalWords: 0,
    issues: [],
  };

  try {
    const jsonStr = extractJSON(content);
    const parsed = JSON.parse(jsonStr);
    results.jsonValid = true;

    // Analyze abstract
    if (parsed.abstract) {
      const words = countWords(parsed.abstract);
      results.abstract = {
        words,
        text: parsed.abstract,
        inRange: words >= scenario.minAbstractWords && words <= scenario.maxAbstractWords,
      };
      if (!results.abstract.inRange) {
        results.issues.push(
          `Abstract: ${words} palavras (esperado: ${scenario.minAbstractWords}-${scenario.maxAbstractWords})`
        );
      }
    } else {
      results.issues.push("Abstract em falta");
    }

    // Analyze sections
    if (Array.isArray(parsed.sections)) {
      for (const section of parsed.sections) {
        const words = countWords(section.content);
        const inRange = words >= scenario.minWordsPerSection && words <= scenario.maxWordsPerSection;
        results.sections.push({
          title: section.title,
          words,
          inRange,
          content: section.content,
        });
        if (!inRange) {
          results.issues.push(
            `"${section.title}": ${words} palavras (esperado: ${scenario.minWordsPerSection}-${scenario.maxWordsPerSection})`
          );
        }
      }

      // Check missing sections
      for (const expected of scenario.expectedSections) {
        if (!parsed.sections.find((s) => s.title === expected)) {
          results.issues.push(`Secção em falta: "${expected}"`);
        }
      }
    } else {
      results.issues.push("Secções em falta ou inválidas");
    }

    results.totalWords = results.abstract.words + results.sections.reduce((sum, s) => sum + s.words, 0);
  } catch (e) {
    results.jsonError = e.message;
    results.issues.push(`JSON inválido: ${e.message}`);
  }

  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("=== Quality Analysis: AI Content Generation ===\n");

  for (const provider of PROVIDERS) {
    if (!provider.headers.Authorization?.replace("Bearer ", "")) {
      console.log(`⏭  Skipping ${provider.name} (no API key)\n`);
      continue;
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`Provider: ${provider.name} (${provider.model})`);
    console.log("=".repeat(70));

    for (const scenario of SCENARIOS) {
      console.log(`\n--- ${scenario.name} ---`);

      const result = await callProvider(provider, scenario);

      if (result.error) {
        console.log(`  ❌ API Error: ${result.status} - ${result.body.slice(0, 200)}`);
        continue;
      }

      console.log(`  ⏱  ${result.elapsed}s | Finish: ${result.finishReason}`);

      const analysis = analyzeContent(result.content, scenario);

      if (!analysis.jsonValid) {
        console.log(`  ❌ JSON parsing failed: ${analysis.jsonError}`);
        continue;
      }

      console.log(`  📊 Total words: ${analysis.totalWords}`);
      console.log(`  📝 Abstract: ${analysis.abstract.words} palavras ${analysis.abstract.inRange ? "✅" : "⚠️"}`);

      for (const section of analysis.sections) {
        const icon = section.inRange ? "✅" : "⚠️";
        console.log(`  📄 ${section.title}: ${section.words} palavras ${icon}`);
      }

      if (analysis.issues.length > 0) {
        console.log(`\n  ⚠️  Issues (${analysis.issues.length}):`);
        for (const issue of analysis.issues) {
          console.log(`     - ${issue}`);
        }
      } else {
        console.log(`\n  ✅ All sections within expected word ranges`);
      }

      // Show a sample of content quality
      if (analysis.sections.length > 0) {
        const firstSection = analysis.sections[0];
        console.log(`\n  📖 Sample from "${firstSection.title}" (first 200 chars):`);
        console.log(`     "${firstSection.content.slice(0, 200)}..."`);
      }
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("=== Analysis Complete ===");
}

runTests().catch(console.error);
