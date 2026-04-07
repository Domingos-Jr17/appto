/**
 * Avalia a qualidade do conteúdo gerado pela IA
 * Gera o conteúdo e salva num ficheiro para revisão manual
 *
 * Usage: node scripts/evaluate-content-quality.mjs "Tema do trabalho"
 */

import { readFileSync, writeFileSync } from "fs";
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

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || "";
const GOOGLE_AI_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
const GOOGLE_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3.6-plus:free";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const theme = process.argv[2] || "Mudanças climáticas em Moçambique";

async function generateContent() {
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
- Disciplina: Geografia
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

  console.log(`🎯 Tema: "${theme}"`);
  console.log(`🤖 Gerando conteúdo com Google AI (${GOOGLE_AI_MODEL})...\n`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(
      `${GOOGLE_AI_BASE_URL}/models/${GOOGLE_AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 16000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    clearTimeout(timeoutId);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI API Error: ${response.status}`);
      console.error(errorText.slice(0, 500));
      process.exit(1);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = data.usageMetadata || {};

    console.log(`⏱️  ${elapsed}s`);
    console.log(`📝 ${content.length} chars`);
    console.log(`📊 Tokens: ${JSON.stringify(usage)}\n`);

    try {
      const jsonStr = extractJSON(content);
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (e) {
      console.error(`❌ JSON parse failed: ${e.message}`);
      console.error(`First 500 chars: ${content.slice(0, 500)}`);
      process.exit(1);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`❌ Request failed: ${error.message}`);
    process.exit(1);
  }
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

function countWords(text) {
  return text?.split(/\s+/).filter(Boolean).length || 0;
}

function evaluateQuality(parsed, theme) {
  const results = [];
  let totalScore = 0;
  let totalChecks = 0;

  function check(name, pass, detail) {
    totalChecks++;
    if (pass) totalScore++;
    results.push({ name, pass, detail });
  }

  // ── Word count checks ──────────────────────────────────────────
  const abstractWords = countWords(parsed.abstract);
  check("Abstract word count", abstractWords >= 80 && abstractWords <= 140,
    `${abstractWords} palavras (esperado: 80-140)`);

  let totalWords = 0;
  const expectedMins = { "1. Introdução": 300, "2. Desenvolvimento": 1500, "3. Conclusão": 280 };
  const expectedMaxs = { "1. Introdução": 400, "2. Desenvolvimento": 1700, "3. Conclusão": 380 };

  for (const section of parsed.sections || []) {
    const words = countWords(section.content);
    totalWords += words;
    const min = expectedMins[section.title] || 200;
    const max = expectedMaxs[section.title] || 500;
    check(`${section.title} word count`, words >= min && words <= max,
      `${words} palavras (esperado: ${min}-${max})`);
  }

  check("Total word count (7-9 pages)", totalWords >= 2080 && totalWords <= 2480,
    `${totalWords} palavras (~${(totalWords / 280).toFixed(1)} páginas, alvo: 7-9)`);

  // ── Structure checks ───────────────────────────────────────────
  check("Has abstract", !!parsed.abstract && parsed.abstract.length > 50,
    parsed.abstract ? "Present" : "Missing");

  check("Has 3 sections", (parsed.sections || []).length === 3,
    `${(parsed.sections || []).length} sections`);

  const sectionTitles = (parsed.sections || []).map(s => s.title);
  check("Correct section titles",
    sectionTitles.includes("1. Introdução") &&
    sectionTitles.includes("2. Desenvolvimento") &&
    sectionTitles.includes("3. Conclusão"),
    sectionTitles.join(", "));

  // ── Content quality checks ─────────────────────────────────────
  const allContent = (parsed.sections || []).map(s => s.content).join(" ");

  // No HTML headers
  const hasHtmlHeaders = /<h[1-6]>/.test(allContent);
  check("No HTML header tags", !hasHtmlHeaders,
    hasHtmlHeaders ? "Found HTML headers (bad)" : "Clean");

  // Has Markdown headers in development
  const devSection = parsed.sections?.find(s => s.title === "2. Desenvolvimento");
  const hasMarkdownHeaders = devSection && /##\s/.test(devSection.content);
  check("Development has Markdown subheaders", !!hasMarkdownHeaders,
    hasMarkdownHeaders ? "Found ## headers" : "Missing ## headers");

  // No vague introductions
  const vaguePhrases = ["desde os primórdios", "ao longo dos tempos", "desde sempre", "ao longo da história"];
  const foundVague = vaguePhrases.filter(p => allContent.toLowerCase().includes(p));
  check("No vague intro phrases", foundVague.length === 0,
    foundVague.length > 0 ? `Found: ${foundVague.join(", ")}` : "Clean");

  // Mozambique context
  const mozTerms = ["moçambican", "moçambique", "maputo", "afric"];
  const hasMozContext = mozTerms.some(t => allContent.toLowerCase().includes(t));
  check("Mozambique context present", hasMozContext,
    hasMozContext ? "Found Mozambican references" : "Missing local context");

  // Theme relevance
  const themeWords = theme.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const themeRelevance = themeWords.filter(w => allContent.toLowerCase().includes(w));
  check("Theme relevance", themeRelevance.length >= themeWords.length * 0.5,
    `${themeRelevance.length}/${themeWords.length} theme words found`);

  // No empty sections
  const emptySections = (parsed.sections || []).filter(s => !s.content || s.content.trim().length < 50);
  check("No empty sections", emptySections.length === 0,
    emptySections.length > 0 ? `${emptySections.length} empty` : "All sections have content");

  // Paragraph structure (multiple paragraphs per section)
  for (const section of parsed.sections || []) {
    const paragraphs = section.content.split(/\n\n+/).filter(p => p.trim().length > 20);
    check(`${section.title} has multiple paragraphs`, paragraphs.length >= 3,
      `${paragraphs.length} paragraphs`);
  }

  // ── Summary ────────────────────────────────────────────────────
  const score = Math.round((totalScore / totalChecks) * 100);

  console.log("\n" + "=".repeat(70));
  console.log("QUALITY EVALUATION");
  console.log("=".repeat(70));

  for (const r of results) {
    const icon = r.pass ? "✅" : "❌";
    console.log(`${icon} ${r.name}: ${r.detail}`);
  }

  console.log("\n" + "-".repeat(70));
  console.log(`SCORE: ${totalScore}/${totalChecks} (${score}%)`);
  console.log("-".repeat(70));

  if (score >= 85) {
    console.log("🏆 EXCELLENTE — Conteúdo de alta qualidade");
  } else if (score >= 70) {
    console.log("👍 BOM — Conteúdo aceitável com pequenos ajustes");
  } else if (score >= 50) {
    console.log("⚠️  RAZOÁVEL — Precisa de melhorias significativas");
  } else {
    console.log("❌ FRACO — Conteúdo abaixo do esperado");
  }

  return { score, totalScore, totalChecks, results };
}

function generateMarkdownReport(parsed, theme, evaluation) {
  let md = `# Avaliação de Qualidade — Geração de Trabalho Académico\n\n`;
  md += `**Tema:** ${theme}\n`;
  md += `**Data:** ${new Date().toISOString()}\n`;
  md += `**Score:** ${evaluation.totalScore}/${evaluation.totalChecks} (${Math.round((evaluation.totalScore / evaluation.totalChecks) * 100)}%)\n\n`;

  md += `## Resumo\n\n${parsed.abstract}\n\n`;

  md += `## Estatísticas\n\n`;
  md += `| Secção | Palavras | Status |\n`;
  md += `|--------|----------|--------|\n`;

  const expectedMins = { "1. Introdução": 300, "2. Desenvolvimento": 1500, "3. Conclusão": 280 };
  const expectedMaxs = { "1. Introdução": 400, "2. Desenvolvimento": 1700, "3. Conclusão": 380 };
  let totalWords = 0;

  for (const section of parsed.sections) {
    const words = countWords(section.content);
    totalWords += words;
    const min = expectedMins[section.title] || 200;
    const max = expectedMaxs[section.title] || 500;
    const status = words >= min && words <= max ? "✅" : "⚠️";
    md += `| ${section.title} | ${words} | ${status} (${min}-${max}) |\n`;
  }

  md += `| **Total** | **${totalWords}** | **~${(totalWords / 280).toFixed(1)} páginas** |\n\n`;

  md += `## Check de Qualidade\n\n`;
  for (const r of evaluation.results) {
    const icon = r.pass ? "✅" : "❌";
    md += `- ${icon} **${r.name}**: ${r.detail}\n`;
  }

  md += `\n---\n\n`;

  for (const section of parsed.sections) {
    md += `## ${section.title}\n\n${section.content}\n\n---\n\n`;
  }

  return md;
}

async function main() {
  const parsed = await generateContent();
  const evaluation = evaluateQuality(parsed, theme);
  const markdown = generateMarkdownReport(parsed, theme, evaluation);

  // Save full report
  const outputPath = join(__dirname, "..", `content-evaluation-${Date.now()}.md`);
  writeFileSync(outputPath, markdown, "utf-8");

  console.log(`\n📄 Relatório completo salvo em: ${outputPath}`);
}

main().catch(console.error);
