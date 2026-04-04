/**
 * Test: Updated school generation with 7-9 page target
 * Usage: node scripts/test-updated-generation.mjs
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

async function callGemini(prompt, systemPrompt) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

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

async function main() {
  console.log("=== Updated School Generation Test (7-9 pages target) ===\n");

  const prompt = `Gere um trabalho académico sobre "Mudanças climáticas em Moçambique".

Tipo de trabalho: Trabalho Escolar
Contexto do briefing:
- Instituição: Escola Secundária Josina Machel
- Disciplina: Geografia
- Nível académico: SECONDARY
- Classe: 11ª
- Cidade: Maputo
- Objectivo: Explicar as principais causas, consequências e formas de mitigação das mudanças climáticas em Moçambique.

Responda exclusivamente com JSON válido, sem markdown, sem comentários e sem texto antes ou depois do JSON.

Use exactamente este formato:
{
  "sections": [
    { "title": "1. Introdução", "content": "..." },
    { "title": "2. Desenvolvimento", "content": "..." },
    { "title": "3. Conclusão", "content": "..." }
  ]
}

Plano obrigatório por secção:
- 1. Introdução: 300-400 palavras; apresente o tema, a importância do assunto, o objectivo do trabalho e a organização do texto
- 2. Desenvolvimento: 1500-1700 palavras; desenvolva o tema em profundidade, usando 4 a 6 subtítulos curtos em Markdown (## Título) com: conceito central, causas ou características, exemplos concretos, relação com a realidade moçambicana, desafios e caminhos; cada subtópico deve ter pelo menos 3 parágrafos desenvolvidos; inclua subtítulos curtos como: Enquadramento do tema, Ideias principais, Exemplos no contexto moçambicano, Desafios e caminhos
- 3. Conclusão: 280-380 palavras; retome as ideias principais, responda ao objectivo e feche o trabalho com clareza, sem introduzir novos tópicos

Regras de qualidade:
- Escreva em Português de Moçambique com linguagem clara, formal e acessível ao nível escolar.
- Evite introduções vagas como 'desde os primórdios', 'ao longo dos tempos' ou definições genéricas repetidas.
- Cada secção deve avançar a análise e ligar-se ao tema, ao objectivo e ao contexto do briefing.
- Evite repetir a mesma ideia em várias secções ou reutilizar frases quase idênticas.
- Quando relevante, use exemplos plausíveis ligados à realidade moçambicana, à escola, à comunidade ou ao quotidiano do estudante.
- Escreva principalmente em parágrafos corridos; use listas apenas se forem indispensáveis para a clareza.
- Use apenas subtítulos em Markdown (## Título) — nunca use tags HTML como <h1>, <h2>, <h3>.
- Evite inventar autores, datas e referências. As citações formais no texto são opcionais; se usar, siga a norma ABNT.
- Não fabrique referências bibliográficas, leis, dados estatísticos, autores, datas ou instituições sem base no briefing.
- Não deixe nenhuma secção vazia nem excessivamente curta.
- Mantenha exactamente os títulos fornecidos e a mesma ordem.
- Produza JSON estritamente válido.`;

  const systemPrompt = `Você é um assistente de escrita para estudantes do ensino secundário moçambicano.
Gere conteúdo simples e acessível em Português de Moçambique.
Use frases curtas e vocabulário acessível.
Evite jargão técnico excessivo.
Não é obrigatório incluir citações formais no texto.
Estrutura básica: Introdução, Desenvolvimento, Conclusão.`;

  console.log("Calling Gemini 2.5 Flash...\n");
  const result = await callGemini(prompt, systemPrompt);

  if (result.error) {
    console.log(`❌ ${result.status || "Error"} - ${result.elapsed}s`);
    console.log(result.body.slice(0, 300));
    return;
  }

  console.log(`⏱️  ${result.elapsed}s | Finish: ${result.finishReason}`);
  console.log(`Usage: ${JSON.stringify(result.usage)}\n`);

  try {
    const parsed = JSON.parse(result.content);
    let totalWords = 0;
    const expectedMins = { "1. Introdução": 300, "2. Desenvolvimento": 1500, "3. Conclusão": 280 };
    const expectedMaxs = { "1. Introdução": 400, "2. Desenvolvimento": 1700, "3. Conclusão": 380 };

    console.log("=".repeat(70));
    console.log("CONTENT ANALYSIS");
    console.log("=".repeat(70));

    for (const section of parsed.sections) {
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
    const hasHtml = /<h[1-6]>|<\/h[1-6]>/.test(result.content);
    console.log(`\n🔍 HTML tags: ${hasHtml ? "⚠️  Sim (problema)" : "✅ Não (correcto)"}`);

    // Check for Markdown headers
    const hasMarkdown = /##\s/.test(result.content);
    console.log(`🔍 Markdown headers: ${hasMarkdown ? "✅ Sim" : "⚠️  Não"}`);

  } catch (e) {
    console.log(`❌ JSON parse: ${e.message}`);
    console.log(`First 500 chars: ${result.content.slice(0, 500)}`);
  }
}

main().catch(console.error);
