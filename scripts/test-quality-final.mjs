/**
 * Quality test for updated school work generation
 * Tests Qwen -> Nemotron fallback with Mozambique-aligned prompts
 * Usage: node scripts/test-quality-final.mjs
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

const SCENARIOS = [
  {
    name: "Trabalho Escolar - 11ª Classe (Geografia)",
    title: "Mudanças climáticas em Moçambique",
    brief: {
      educationLevel: "SECONDARY",
      institutionName: "Escola Secundária Josina Machel",
      subjectName: "Geografia",
      className: "11ª",
      city: "Maputo",
      objective: "Explicar as principais causas, consequências e formas de mitigação das mudanças climáticas em Moçambique.",
      additionalInstructions: "Use linguagem clara de ensino secundário e relacione o tema com exemplos do quotidiano moçambicano.",
    },
    templates: [
      { title: "1. Introdução" },
      { title: "2. Desenvolvimento" },
      { title: "3. Conclusão" },
    ],
    expectedMinWords: 1500,
    expectedMaxWords: 2500,
    sectionMins: {
      "1. Introdução": 220,
      "2. Desenvolvimento": 900,
      "3. Conclusão": 180,
    },
  },
  {
    name: "Trabalho Escolar - 10ª Classe (História)",
    title: "O papel das mulheres na luta de libertação nacional",
    brief: {
      educationLevel: "SECONDARY",
      institutionName: "Escola Secundária da Polana",
      subjectName: "História",
      className: "10ª",
      city: "Beira",
      objective: "Analisar a contribuição das mulheres moçambicanas na luta armada de libertação nacional.",
    },
    templates: [
      { title: "1. Introdução" },
      { title: "2. Desenvolvimento" },
      { title: "3. Conclusão" },
    ],
    expectedMinWords: 1500,
    expectedMaxWords: 2500,
    sectionMins: {
      "1. Introdução": 220,
      "2. Desenvolvimento": 900,
      "3. Conclusão": 180,
    },
  },
];

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
  const briefContext = Object.entries(scenario.brief)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const sectionList = scenario.templates.map((t) => t.title).join(", ");
  const sectionJson = scenario.templates
    .map((t) => `    { "title": "${t.title}", "content": "..." }`)
    .join(",\n");

  return `Gere um trabalho académico sobre "${scenario.title}".

Tipo de trabalho: Trabalho Escolar
Contexto do briefing:
${briefContext}

Responda exclusivamente com JSON válido, sem markdown, sem comentários e sem texto antes ou depois do JSON.

Use exactamente este formato:
{
  "sections": [
${sectionJson}
  ]
}

Plano obrigatório por secção:
- 1. Introdução: 260-360 palavras; apresente o tema, a importância do assunto, o objectivo do trabalho e a organização do texto
- 2. Desenvolvimento: 1100-1700 palavras; desenvolva o tema em profundidade, usando 3 a 5 subtítulos curtos com conceito central, causas ou características, exemplos e relação com a realidade moçambicana; inclua subtítulos curtos como: Enquadramento do tema, Ideias principais, Exemplos no contexto moçambicano, Desafios e caminhos
- 3. Conclusão: 220-320 palavras; retome as ideias principais, responda ao objectivo e feche o trabalho com clareza, sem introduzir novos tópicos

Regras de qualidade:
- Escreva em Português de Moçambique com linguagem clara, formal e acessível ao nível escolar.
- Evite introduções vagas como 'desde os primórdios', 'ao longo dos tempos' ou definições genéricas repetidas.
- Cada secção deve avançar a análise e ligar-se ao tema, ao objectivo e ao contexto do briefing.
- Evite repetir a mesma ideia em várias secções ou reutilizar frases quase idênticas.
- Quando relevante, use exemplos plausíveis ligados à realidade moçambicana, à escola, à comunidade ou ao quotidiano do estudante.
- Escreva principalmente em parágrafos corridos; use listas apenas se forem indispensáveis para a clareza.
- Evite inventar autores, datas e referências. As citações formais no texto são opcionais; se usar, siga a norma ABNT.
- Não fabrique referências bibliográficas, leis, dados estatísticos, autores, datas ou instituições sem base no briefing.
- Não deixe nenhuma secção vazia nem excessivamente curta.
- Mantenha exactamente os títulos fornecidos e a mesma ordem.
- Produza JSON estritamente válido.`;
}

function buildSystemPrompt() {
  return `Você é um assistente de escrita para estudantes do ensino secundário moçambicano.
Gere conteúdo simples e acessível em Português de Moçambique.
Use frases curtas e vocabulário acessível.
Evite jargão técnico excessivo.
Não é obrigatório incluir citações formais no texto.
Estrutura básica: Introdução, Desenvolvimento, Conclusão.`;
}

async function callModel(model, prompt, systemPrompt) {
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
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0,
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
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    return { error: true, status: null, body: error.message, elapsed };
  }
}

function analyzeContent(content, scenario) {
  const results = {
    jsonValid: false,
    jsonError: null,
    sections: [],
    totalWords: 0,
    issues: [],
    passed: true,
  };

  try {
    const jsonStr = extractJSON(content);
    const parsed = JSON.parse(jsonStr);
    results.jsonValid = true;

    if (!Array.isArray(parsed.sections)) {
      results.issues.push("Secções em falta ou inválidas");
      results.passed = false;
      return results;
    }

    for (const section of parsed.sections) {
      const words = countWords(section.content);
      const expectedMin = scenario.sectionMins[section.title] || 150;
      const inRange = words >= expectedMin;
      results.sections.push({
        title: section.title,
        words,
        inRange,
        content: section.content,
      });
      if (!inRange) {
        results.issues.push(
          `"${section.title}": ${words} palavras (mínimo esperado: ${expectedMin})`
        );
        results.passed = false;
      }
    }

    // Check missing sections
    for (const template of scenario.templates) {
      if (!parsed.sections.find((s) => s.title === template.title)) {
        results.issues.push(`Secção em falta: "${template.title}"`);
        results.passed = false;
      }
    }

    results.totalWords = results.sections.reduce((sum, s) => sum + s.words, 0);

    if (results.totalWords < scenario.expectedMinWords) {
      results.issues.push(
        `Total: ${results.totalWords} palavras (esperado: ${scenario.expectedMinWords}-${scenario.expectedMaxWords})`
      );
      results.passed = false;
    }
  } catch (e) {
    results.jsonError = e.message;
    results.issues.push(`JSON inválido: ${e.message}`);
    results.passed = false;
  }

  return results;
}

async function runTests() {
  console.log("=== Quality Test: Updated School Work Generation ===\n");

  for (const scenario of SCENARIOS) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Scenario: ${scenario.name}`);
    console.log("=".repeat(70));

    const prompt = buildPrompt(scenario);
    const systemPrompt = buildSystemPrompt();

    let result = null;
    let usedModel = null;

    for (const model of MODELS) {
      console.log(`\n  Trying: ${model}`);
      const callResult = await callModel(model, prompt, systemPrompt);

      if (callResult.error) {
        console.log(`    ❌ ${callResult.status || "Error"} - ${callResult.elapsed}s`);
        if (callResult.body) {
          console.log(`    ${callResult.body.slice(0, 150)}`);
        }
        continue;
      }

      console.log(`    ⏱  ${callResult.elapsed}s | Finish: ${callResult.finishReason}`);

      const analysis = analyzeContent(callResult.content, scenario);
      result = analysis;
      usedModel = model;

      if (analysis.jsonValid) {
        console.log(`  📊 Total words: ${analysis.totalWords}`);
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
          console.log(`\n  ✅ All sections meet minimum word requirements`);
        }

        if (analysis.sections.length > 0) {
          const devSection = analysis.sections.find((s) => s.title.includes("Desenvolvimento"));
          if (devSection) {
            console.log(`\n  📖 Desenvolvimento preview (first 300 chars):`);
            console.log(`     "${devSection.content.slice(0, 300)}..."`);
          }
        }

        console.log(`\n  🏷️  Used model: ${usedModel}`);
        break;
      } else {
        console.log(`    ❌ JSON parsing failed: ${analysis.jsonError}`);
      }
    }

    if (!result) {
      console.log("\n  ❌ All models failed for this scenario");
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("=== Test Complete ===");
}

runTests().catch(console.error);
