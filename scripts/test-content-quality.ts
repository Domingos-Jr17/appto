/**
 * Test script: Analyze content quality 
 * 
 * Evaluates:
 * 1. Mozambique-specific references
 * 2. Paragraph development (4+ sentences)
 * 3. Concrete examples
 * 4. Academic tone
 * 5. Structure and flow
 * 
 * Usage: bun run scripts/test-content-quality.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

// Load .env manually
const envPath = join(process.cwd(), ".env");
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
} catch {
  // .env not found
}

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || "";
const CEREBRAS_BASE_URL = process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1";

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

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

interface ContentQuality {
  mozambiqueReferences: number;
  concreteExamples: number;
  developedParagraphs: number;
  totalParagraphs: number;
  averageSentenceLength: number;
  hasCitations: boolean;
  hasSubheadings: boolean;
  score: number;
  strengths: string[];
  weaknesses: string[];
}

function analyzeContentQuality(text: string, title: string): ContentQuality {
  const mozambiqueTerms = [
    "moçambique", "moçambicano", "maputo", "beira", "nampula", 
    "zambeze", "limpopo", "púnguè", "gaza", "sofala", "tete",
    "ciclone", "idaí", "kenneth", "seca", "cheia", "inundação",
    "agricultura", "pesca", " subsistência"
  ];
  
  const exampleIndicators = [
    "por exemplo", "como", "nomeadamente", "nomear", "citando",
    "caso de", "situação", "dados", "estatística", "percentagem"
  ];

  // Count Mozambique references
  const mozambiqueReferences = mozambiqueTerms.filter(term => 
    text.toLowerCase().includes(term)
  ).length;

  // Count concrete examples
  const concreteExamples = exampleIndicators.filter(indicator => 
    text.toLowerCase().includes(indicator)
  ).length;

  // Analyze paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  const totalParagraphs = paragraphs.length;
  
  // Count developed paragraphs (4+ sentences)
  const developedParagraphs = paragraphs.filter(p => {
    const sentences = p.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.length >= 4;
  }).length;

  // Average sentence length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const averageSentenceLength = sentences.length > 0 
    ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
    : 0;

  // Check for citations (ABNT format)
  const hasCitations = /\([A-Z]+,\s*\d{4}\)/.test(text) || /\([A-Z]+\s+et\s+al\.,\s*\d{4}\)/.test(text);

  // Check for subheadings (only for Development)
  const hasSubheadings = title.toLowerCase().includes("desenvolvimento") && 
    /##\s+\d+\.\d+/.test(text);

  // Calculate score
  let score = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Mozambique references (max 10 points)
  if (mozambiqueReferences >= 5) {
    score += 10;
    strengths.push("Excelentes referências a Moçambique");
  } else if (mozambiqueReferences >= 3) {
    score += 7;
    strengths.push("Boas referências a Moçambique");
  } else if (mozambiqueReferences >= 1) {
    score += 3;
    weaknesses.push("Poucas referências específicas a Moçambique");
  } else {
    score += 0;
    weaknesses.push("Falta de contexto moçambicano");
  }

  // Concrete examples (max 10 points)
  if (concreteExamples >= 5) {
    score += 10;
    strengths.push("Muitos exemplos concretos");
  } else if (concreteExamples >= 3) {
    score += 7;
    strengths.push("Bons exemplos concretos");
  } else if (concreteExamples >= 1) {
    score += 3;
    weaknesses.push("Few concrete examples");
  } else {
    weaknesses.push("Falta de exemplos concretos");
  }

  // Paragraph development (max 15 points)
  const developedRatio = totalParagraphs > 0 ? developedParagraphs / totalParagraphs : 0;
  if (developedRatio >= 0.7) {
    score += 15;
    strengths.push("Parágrafos bem desenvolvidos");
  } else if (developedRatio >= 0.5) {
    score += 10;
  } else if (developedRatio >= 0.3) {
    score += 5;
    weaknesses.push("Alguns parágrafos subdesenvolvidos");
  } else {
    score += 0;
    weaknesses.push("Parágrafos curtos ou subdesenvolvidos");
  }

  // Sentence length (max 5 points)
  if (averageSentenceLength >= 15) {
    score += 5;
    strengths.push("Frases bem desenvolvidas");
  } else if (averageSentenceLength >= 10) {
    score += 3;
  } else {
    score += 0;
    weaknesses.push("Frases muito curtas");
  }

  // Citations (max 5 points)
  if (hasCitations) {
    score += 5;
    strengths.push("Citações no formato ABNT");
  }

  // Subheadings for Development (max 5 points)
  if (hasSubheadings) {
    score += 5;
    strengths.push("Estrutura com subtítulos");
  }

  return {
    mozambiqueReferences,
    concreteExamples,
    developedParagraphs,
    totalParagraphs,
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    hasCitations,
    hasSubheadings,
    score,
    strengths,
    weaknesses
  };
}

async function generateAndAnalyzeSection(sectionKey: string, prompt: string) {
  const startTime = Date.now();

  const response = await fetch(`${CEREBRAS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de escrita académica para estudantes moçambicanos.
- Gere conteúdo em Português de Moçambique formal
- Cada parágrafo deve ter 4+ frases desenvolvidas
- Use exemplos concretos sobre Moçambique
- Inclua dados específicos quando possível
- Evite frases genéricas
- Responda APENAS com JSON válido`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0,
    }),
  });

  const time = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || "";
  
  let text = "";
  try {
    const parsed = JSON.parse(extractJSON(rawContent));
    // Handle different JSON structures
    if (parsed.content) {
      text = parsed.content;
    } else if (parsed.text) {
      text = parsed.text;
    } else if (parsed.introducao) {
      text = parsed.introducao;
    } else if (parsed.desenvolvimento) {
      text = parsed.desenvolvimento;
    } else if (parsed.conclusao) {
      text = parsed.conclusao;
    } else if (typeof parsed === "string") {
      text = parsed;
    } else {
      console.log("   ⚠️ JSON structure:", JSON.stringify(parsed).slice(0, 200));
      text = rawContent;
    }
  } catch {
    // If JSON parsing fails, use raw content
    text = rawContent.replace(/```json|```/g, "").replace(/^[{\s]+|[}\s]+$/g, "").trim();
  }

  return {
    text,
    words: countWords(text),
    time,
    quality: analyzeContentQuality(text, sectionKey)
  };
}

async function runQualityTest() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("   ANÁLISE DE QUALIDADE DO CONTEÚDO");
  console.log("═══════════════════════════════════════════════════════════");

  const sections = [
    {
      key: "1. Introdução",
      prompt: `Gere a secção INTRODUÇÃO sobre "Mudanças Climáticas em Moçambique".
Extensão: 350-450 palavras.
Inclua: contextualização em Moçambique, relevância, objetivo.
Mínimo 4 parágrafos desenvolvidos.`
    },
    {
      key: "2. Desenvolvimento",
      prompt: `Gere a secção DESENVOLVIMENTO sobre "Mudanças Climáticas em Moçambique".
Extensão: 700-900 palavras.
Inclua: tipos de impactos (secas, cheias, ciclones), exemplos concretos, dados.
Use subtítulos ##.
Mínimo 6 parágrafos desenvolvidos.`
    },
    {
      key: "3. Conclusão",
      prompt: `Gere a secção CONCLUSÃO sobre "Mudanças Climáticas em Moçambique".
Extensão: 300-380 palavras.
Inclua: síntese, resposta ao objetivo, reflexão final.
Mínimo 3 parágrafos desenvolvidos.`
    }
  ];

  let totalScore = 0;
  let maxScore = 0;

  for (const section of sections) {
    console.log(`\n📝 Analisando ${section.key}...`);
    
    const result = await generateAndAnalyzeSection(section.key, section.prompt);
    const q = result.quality;

    console.log(`   📊 Palavras: ${result.words}`);
    console.log(`   ⏱️  Tempo: ${(result.time / 1000).toFixed(1)}s`);
    console.log(`   🌍 Refs Moçambique: ${q.mozambiqueReferences}`);
    console.log(`   📌 Exemplos concretos: ${q.concreteExamples}`);
    console.log(`   📄 Parágrafos: ${q.totalParagraphs} (${q.developedParagraphs} desenvolvidos)`);
    console.log(`   📏 Frase média: ${q.averageSentenceLength} palavras`);
    console.log(`   📚 Citações ABNT: ${q.hasCitations ? "✅" : "❌"}`);
    console.log(`   ## Subtitulos: ${q.hasSubheadings ? "✅" : "❌"}`);
    
    console.log(`   🏆 Score: ${q.score}/50`);
    
    console.log(`   ✅ Pontos fortes:`);
    q.strengths.forEach(s => console.log(`      - ${s}`));
    
    if (q.weaknesses.length > 0) {
      console.log(`   ⚠️  Pontos fracos:`);
      q.weaknesses.forEach(w => console.log(`      - ${w}`));
    }

    totalScore += q.score;
    maxScore += 50;

    console.log(`\n   --- Trecho do conteúdo (primeiras 300 chars) ---`);
    console.log(`   ${result.text.slice(0, 300).replace(/\n/g, " ")}...`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("                 RESUMO DE QUALIDADE");
  console.log("═".repeat(60));
  
  console.log(`\n📊 Score Total: ${totalScore}/${maxScore} (${Math.round(totalScore/maxScore*100)}%)`);
  
  if (totalScore >= maxScore * 0.8) {
    console.log(`\n🏆 QUALIDADE EXCELENTE!`);
  } else if (totalScore >= maxScore * 0.6) {
    console.log(`\n👍 QUALIDADE BOA, com áreas para melhorar`);
  } else if (totalScore >= maxScore * 0.4) {
    console.log(`\n⚠️ QUALIDADE MÉDIA - necesita optimizacións`);
  } else {
    console.log(`\n❌ QUALIDADE INSUFICIENTE`);
  }

  console.log("\n" + "═".repeat(60));
}

runQualityTest().catch(console.error);
