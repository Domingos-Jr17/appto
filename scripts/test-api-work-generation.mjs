/**
 * Simula a geração de um trabalho académico via API
 * Usa apenas o tema como input, preenche o resto automaticamente
 *
 * Usage: node scripts/test-api-work-generation.mjs "Tema do trabalho"
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.production or .env
const envPath = join(__dirname, "..", ".env.production");
const fallbackEnvPath = join(__dirname, "..", ".env");

let envContent = "";
try {
  envContent = readFileSync(envPath, "utf-8");
} catch {
  try {
    envContent = readFileSync(fallbackEnvPath, "utf-8");
  } catch {
    console.error("ERROR: No .env.production or .env file found");
    process.exit(1);
  }
}

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

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3.6-plus:free";
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || "";
const GOOGLE_AI_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
const GOOGLE_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const theme = process.argv[2] || "Inteligência Artificial na Educação em Moçambique";

// ── Step 1: Call the /api/generate/work endpoint ──────────────────────

async function callGenerateWorkAPI() {
  console.log("=".repeat(70));
  console.log("STEP 1: Calling /api/generate/work");
  console.log("=".repeat(70));
  console.log(`\nTheme: "${theme}"`);
  console.log(`API URL: ${APP_URL}/api/generate/work\n`);

  const payload = {
    title: theme,
    type: "SCHOOL_WORK",
    generateContent: false, // Just create the structure, we'll test AI separately
    brief: {
      language: "pt-MZ",
      citationStyle: "ABNT",
      coverTemplate: "SCHOOL_MOZ",
      educationLevel: "SECONDARY",
      institutionName: "Escola Secundária de Maputo",
      subjectName: "Informática",
      studentName: "Estudante Teste",
      city: "Maputo",
      academicYear: new Date().getFullYear(),
    },
  };

  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${APP_URL}/api/generate/work`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log(`\nHTTP Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log("\n⚠️  API requires authentication (session cookie).");
      console.log("   This is expected — the API is protected by NextAuth.");
      console.log("   Falling back to direct AI generation test below...\n");
      return null;
    }

    if (response.status === 403) {
      console.log("\n⚠️  API blocked (CSRF or subscription).");
      console.log("   Error:", data.error || data.message);
      console.log("   This is expected without a valid session cookie.\n");
      return null;
    }

    if (response.ok) {
      console.log("\n✅ Work created successfully!");
      return data;
    }

    return null;
  } catch (error) {
    console.log(`\n⚠️  API call failed: ${error.message}`);
    console.log("   Falling back to direct AI generation test...\n");
    return null;
  }
}

// ── Step 2: Direct AI generation (mimics work-generation-jobs.ts) ─────

async function callAIDirectly() {
  console.log("=".repeat(70));
  console.log("STEP 2: Direct AI Generation (mimics backend worker)");
  console.log("=".repeat(70));
  console.log(`\nTheme: "${theme}"`);
  console.log(`Model: ${OPENROUTER_MODEL}`);
  console.log(`Provider: ${OPENROUTER_BASE_URL}\n`);

  const systemPrompt = `Você é um assistente de escrita para estudantes do ensino secundário moçambicano.
Gere conteúdo simples e acessível em Português de Moçambique.
Use frases curtas e vocabulário acessível.
Evite jargão técnico excessivo.
Não é obrigatório incluir citações formais no texto.
Estrutura básica: Introdução, Desenvolvimento, Conclusão.`;

  const userPrompt = `Gere um trabalho académico sobre "${theme}".

Tipo de trabalho: Trabalho Escolar
Contexto do briefing:
- Instituição: Escola Secundária de Maputo
- Disciplina: Informática
- Nível académico: SECONDARY
- Cidade: Maputo

Responda exclusivamente com JSON válido, sem markdown, sem comentários e sem texto antes ou depois do JSON.

Use exactamente este formato:
{
  "abstract": "resumo académico entre 80 e 140 palavras",
  "sections": [
    { "title": "1. Introdução", "content": "..." },
    { "title": "2. Desenvolvimento", "content": "..." },
    { "title": "3. Conclusão", "content": "..." }
  ]
}

Plano obrigatório por secção:
- 1. Introdução: 300-400 palavras; apresente o tema, a importância do assunto, o objectivo do trabalho e a organização do texto
- 2. Desenvolvimento: 1500-1700 palavras; desenvolva o tema em profundidade, usando 4 a 6 subtítulos curtos em Markdown (## Título) com: conceito central, causas ou características, exemplos concretos, relação com a realidade moçambicana, desafios e caminhos; cada subtópico deve ter pelo menos 3 parágrafos desenvolvidos
- 3. Conclusão: 280-380 palavras; retome as ideias principais, responda ao objectivo e feche o trabalho com clareza, sem introduzir novos tópicos

Regras de qualidade:
- Escreva em Português de Moçambique com linguagem clara, formal e acessível ao nível escolar.
- Evite introduções vagas como 'desde os primórdios', 'ao longo dos tempos' ou definições genéricas repetidas.
- Cada secção deve avançar a análise e ligar-se ao tema, ao objectivo e ao contexto do briefing.
- Evite repetir a mesma ideia em várias secções ou reutilizar frases quase idênticas.
- Quando relevante, use exemplos plausíveis ligados à realidade moçambicana.
- Escreva principalmente em parágrafos corridos; use listas apenas se forem indispensáveis para a clareza.
- Use apenas subtítulos em Markdown (## Título) — nunca use tags HTML como <h1>, <h2>, <h3>.
- Evite inventar autores, datas e referências.
- Não fabrique referências bibliográficas, leis, dados estatísticos, autores, datas ou instituições sem base no briefing.
- Não deixe nenhuma secção vazia nem excessivamente curta.
- Mantenha exactamente os títulos fornecidos e a mesma ordem.
- Produza JSON estritamente válido.`;

  const startTime = Date.now();
  let response;
  let provider = "OpenRouter";

  try {
    // Try OpenRouter first
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": APP_URL,
        "X-Title": "aptto",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 16000,
        temperature: 0,
      }),
    });

    const elapsed1 = ((Date.now() - startTime) / 1000).toFixed(2);

    // Fallback to Google AI if rate limited
    if (response.status === 429 && GOOGLE_AI_API_KEY) {
      console.log(`⚠️  OpenRouter rate limited (429) after ${elapsed1}s — falling back to Google AI\n`);
      provider = "Google AI";

      response = await fetch(
        `${GOOGLE_AI_BASE_URL}/models/${GOOGLE_AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: userPrompt }] },
            ],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 16000,
              responseMimeType: "application/json",
            },
          }),
        }
      );
    }
  } catch (error) {
    console.error(`\n❌ Request failed: ${error.message}`);
    return;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`⏱️  Response time: ${elapsed}s (${provider})`);
  console.log(`HTTP Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`\n❌ AI API Error: ${response.status}`);
    console.error(`Body: ${errorText.slice(0, 500)}`);
    return;
  }

  let content = "";
  let usage = {};
  let finishReason = "unknown";

  if (provider === "Google AI") {
    const data = await response.json();
    content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    usage = data.usageMetadata || {};
    finishReason = data.candidates?.[0]?.finishReason || "unknown";
  } else {
    const data = await response.json();
    content = data.choices?.[0]?.message?.content || "";
    usage = data.usage || {};
    finishReason = data.choices?.[0]?.finish_reason || "unknown";
  }

  console.log(`\n📝 Content length: ${content.length} characters`);
  console.log(`Finish reason: ${finishReason}`);
  console.log(`Usage: ${JSON.stringify(usage)}\n`);

  // Parse and analyze
  try {
      const jsonStr = extractJSON(content);
      const parsed = JSON.parse(jsonStr);

      console.log("=".repeat(70));
      console.log("CONTENT ANALYSIS");
      console.log("=".repeat(70));

      let totalWords = 0;
      const expectedMins = { "1. Introdução": 300, "2. Desenvolvimento": 1500, "3. Conclusão": 280 };
      const expectedMaxs = { "1. Introdução": 400, "2. Desenvolvimento": 1700, "3. Conclusão": 380 };

      if (parsed.abstract) {
        const abstractWords = countWords(parsed.abstract);
        console.log(`\n📄 Abstract: ${abstractWords} palavras ${abstractWords >= 80 && abstractWords <= 140 ? "✅" : "⚠️"} (esperado: 80-140)`);
        console.log(`   Preview: "${parsed.abstract.slice(0, 150)}..."`);
      }

      for (const section of parsed.sections || []) {
        const words = countWords(section.content);
        totalWords += words;
        const min = expectedMins[section.title] || 200;
        const max = expectedMaxs[section.title] || 500;
        const icon = words >= min && words <= max ? "✅" : words >= min * 0.85 ? "⚠️" : "❌";
        console.log(`\n📄 ${section.title}: ${words} palavras ${icon} (esperado: ${min}-${max})`);
        console.log(`   Preview: "${section.content.slice(0, 200)}..."`);
      }

      const estimatedPages = (totalWords / 280).toFixed(1);
      console.log(`\n📊 Total: ${totalWords} palavras`);
      console.log(`📄 Páginas estimadas: ~${estimatedPages} (base: 280 palavras/página)`);

      if (totalWords >= 2080 && totalWords <= 2480) {
        console.log(`✅ Dentro do alvo de 7-9 páginas!`);
      } else if (totalWords >= 1800) {
        console.log(`⚠️  Perto do alvo, mas poderia ser mais longo`);
      } else {
        console.log(`❌ Abaixo do alvo de 7-9 páginas`);
      }

      // Check for HTML tags
      const hasHtml = /<h[1-6]>|<\/h[1-6]>/.test(content);
      console.log(`\n🔍 HTML tags: ${hasHtml ? "⚠️  Sim (problema)" : "✅ Não (correcto)"}`);

      // Check for Markdown headers
      const hasMarkdown = /##\s/.test(content);
      console.log(`🔍 Markdown headers: ${hasMarkdown ? "✅ Sim" : "⚠️  Não"}`);

      console.log(`\n✅ AI generation successful!`);

    } catch (e) {
      console.log(`\n❌ JSON parse failed: ${e.message}`);
      console.log(`First 500 chars: ${content.slice(0, 500)}`);
    }
}

// ── Helpers ────────────────────────────────────────────────────────────

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

function countWords(text) {
  return text?.split(/\s+/).filter(Boolean).length || 0;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🎓 APPTO — Simulação de Geração de Trabalho Académico");
  console.log("=".repeat(70));

  // Step 1: Try the API endpoint (may fail without auth)
  const apiResult = await callGenerateWorkAPI();

  // Step 2: Always test AI directly
  await callAIDirectly();

  console.log("\n" + "=".repeat(70));
  console.log("✅ Test complete!");
  console.log("=".repeat(70) + "\n");
}

main().catch(console.error);
