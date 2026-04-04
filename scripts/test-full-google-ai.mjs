/**
 * Test: Full generation flow with Google AI as primary
 * Usage: node scripts/test-full-google-ai.mjs
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

async function callGoogleAI(prompt, systemPrompt) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
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

    if (!response.ok) {
      const errorText = await response.text();
      return { error: true, status: response.status, body: errorText, elapsed };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      error: false,
      elapsed: parseFloat(elapsed),
      content,
      finishReason: data.candidates?.[0]?.finishReason,
      usage: data.usageMetadata,
    };
  } catch (error) {
    clearTimeout(timeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    if (error.name === "AbortError") {
      return { error: true, status: null, body: `Timeout after ${elapsed}s`, elapsed };
    }
    return { error: true, status: null, body: error.message, elapsed };
  }
}

function countWords(text) {
  return text?.split(/\s+/).filter(Boolean).length || 0;
}

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
    },
    templates: [
      { title: "1. Introdução" },
      { title: "2. Desenvolvimento" },
      { title: "3. Conclusão" },
    ],
    sectionMins: {
      "1. Introdução": 260,
      "2. Desenvolvimento": 1100,
      "3. Conclusão": 220,
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
    sectionMins: {
      "1. Introdução": 260,
      "2. Desenvolvimento": 1100,
      "3. Conclusão": 220,
    },
  },
];

function buildPrompt(scenario) {
  const briefContext = Object.entries(scenario.brief)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

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

async function runTests() {
  console.log("=== Full Generation Test: Google AI Studio (Gemini 2.5 Flash) ===\n");

  for (const scenario of SCENARIOS) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Scenario: ${scenario.name}`);
    console.log("=".repeat(70));

    const prompt = buildPrompt(scenario);
    const systemPrompt = buildSystemPrompt();

    console.log("Calling Google AI...");
    const result = await callGoogleAI(prompt, systemPrompt);

    if (result.error) {
      console.log(`❌ ${result.status || "Error"} - ${result.elapsed}s`);
      console.log(`   ${result.body.slice(0, 200)}`);
      continue;
    }

    console.log(`⏱️  ${result.elapsed}s | Finish: ${result.finishReason}`);
    console.log(`Usage: ${JSON.stringify(result.usage)}`);

    // Parse and analyze
    try {
      const parsed = JSON.parse(result.content);
      let totalWords = 0;
      let allPassed = true;

      for (const section of parsed.sections) {
        const words = countWords(section.content);
        totalWords += words;
        const expectedMin = scenario.sectionMins[section.title] || 200;
        const passed = words >= expectedMin;
        const icon = passed ? "✅" : "⚠️";
        console.log(`📄 ${section.title}: ${words} palavras ${icon}`);
        if (!passed) allPassed = false;
      }

      console.log(`📊 Total: ${totalWords} palavras`);

      if (allPassed && totalWords >= 1500) {
        console.log("✅ All sections meet requirements!");
      } else {
        console.log("⚠️  Some sections below expected minimums");
      }

      const devSection = parsed.sections.find((s) => s.title.includes("Desenvolvimento"));
      if (devSection) {
        console.log(`\n📖 Desenvolvimento preview (first 300 chars):`);
        console.log(`"${devSection.content.slice(0, 300)}..."`);
      }
    } catch (e) {
      console.log(`❌ JSON parse: ${e.message}`);
      console.log(`First 300 chars: ${result.content.slice(0, 300)}`);
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("=== Test Complete ===");
}

runTests().catch(console.error);
