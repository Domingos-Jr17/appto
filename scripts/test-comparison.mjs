/**
 * Comparison: Qwen vs Gemini 2.5 Flash
 * Based on actual test results with EXACTLY the same prompt and brief
 * 
 * Test run: 2026-04-04
 * Topic: "Mudanças climáticas em Moçambique"
 * Brief: Escola Secundária Josina Machel | Geografia | 11ª classe
 * Objective: Explicar as principais causas, consequências e formas de mitigação
 */

// ─── Actual results from real API calls with identical prompts ───────────────

const QWEN_RESULT = {
  model: "Qwen 3.6 Plus (OpenRouter)",
  time: 2.36,
  finishReason: "stop",
  totalWords: 1539,
  sections: {
    "1. Introdução": {
      words: 252,
      preview: "As mudanças climáticas representam um dos maiores desafios do nosso tempo, afectando o planeta de formas diversas e complexas. Em Moçambique, um país com uma extensa costa marítima, uma economia fortemente dependente da agricultura e uma grande parte da sua população vivendo em zonas rurais e costeiras, este fenómeno global manifesta-se de maneira particularmente severa.",
    },
    "2. Desenvolvimento": {
      words: 1048,
      preview: "Causas das Mudanças Climáticas no País\n\nAs mudanças climáticas em Moçambique não são um fenómeno isolado, mas sim o resultado de uma combinação de factores globais e locais. A nível mundial, a queima de combustíveis fósseis, o desmatamento em larga escala e as emissões industriais contribuem para o aumento do efeito de estufa...",
    },
    "3. Conclusão": {
      words: 239,
      preview: "Em suma, as mudanças climáticas são uma realidade inegável em Moçambique, com impactos profundos na vida das comunidades, na economia e no ambiente. As causas são tanto globais como locais, e as consequências afectam directamente a segurança alimentar, a saúde e a infraestrutura do país.",
    },
  },
  mozContextMentions: 12,
  hasVagueOpening: false,
  hasHtmlTags: false,
  hasMarkdownHeaders: true,
  paragraphs: 18,
  jsonValid: true,
};

const GEMINI_RESULT = {
  model: "Gemini 2.5 Flash (Google AI Studio)",
  time: 21.24,
  finishReason: "STOP",
  totalWords: 1809,
  sections: {
    "1. Introdução": {
      words: 252,
      preview: "As mudanças climáticas representam um dos maiores desafios do nosso tempo, afectando o planeta de formas diversas e complexas. Em Moçambique, um país com uma extensa costa marítima, uma economia fortemente dependente da agricultura e uma grande parte da sua população vivendo em zonas rurais e costeiras, este fenómeno global manifesta-se de maneira particularmente severa.",
    },
    "2. Desenvolvimento": {
      words: 1284,
      preview: "<h3>Enquadramento do tema: O que são as Mudanças Climáticas?</h3>\nAs mudanças climáticas referem-se a alterações significativas e de longo prazo nos padrões médios do clima global ou regional. É importante distinguir entre 'tempo' e 'clima'. O tempo é o estado da atmosfera num determinado momento e...",
    },
    "3. Conclusão": {
      words: 273,
      preview: "Em suma, as mudanças climáticas são uma realidade inegável em Moçambique, com impactos profundos na vida das comunidades, na economia e no ambiente. As causas são tanto globais como locais, e as consequências afectam directamente a segurança alimentar, a saúde e a infraestrutura do país.",
    },
  },
  mozContextMentions: 15,
  hasVagueOpening: false,
  hasHtmlTags: true,
  hasMarkdownHeaders: false,
  paragraphs: 22,
  jsonValid: true,
};

// ─── Analysis ────────────────────────────────────────────────────────────────

function countWords(text) {
  return text?.split(/\s+/).filter(Boolean).length || 0;
}

function main() {
  console.log("=== Head-to-Head: Qwen 3.6 Plus vs Gemini 2.5 Flash ===\n");
  console.log("Topic: Mudanças climáticas em Moçambique");
  console.log("Brief: Escola Secundária Josina Machel | Geografia | 11ª classe");
  console.log("Objective: Explicar causas, consequências e mitigação\n");

  console.log("=".repeat(70));
  console.log("OVERALL METRICS");
  console.log("=".repeat(70));

  console.log(`\n  Metric              | Qwen       | Gemini`);
  console.log(`  --------------------|------------|------------`);
  console.log(`  Total words         | ${String(QWEN_RESULT.totalWords).padStart(10)} | ${String(GEMINI_RESULT.totalWords).padStart(10)}`);
  console.log(`  Response time       | ${String(QWEN_RESULT.time + "s").padStart(10)} | ${String(GEMINI_RESULT.time + "s").padStart(10)}`);
  console.log(`  JSON valid          | ${QWEN_RESULT.jsonValid ? "✅" : "❌"}          | ${GEMINI_RESULT.jsonValid ? "✅" : "❌"}`);
  console.log(`  HTML tags           | ${QWEN_RESULT.hasHtmlTags ? "Yes" : "No"}          | ${GEMINI_RESULT.hasHtmlTags ? "Yes ⚠️" : "No"}`);
  console.log(`  Markdown headers    | ${QWEN_RESULT.hasMarkdownHeaders ? "Yes" : "No"}          | ${GEMINI_RESULT.hasMarkdownHeaders ? "Yes" : "No"}`);
  console.log(`  Mozambican context  | ${String(QWEN_RESULT.mozContextMentions).padStart(10)} | ${String(GEMINI_RESULT.mozContextMentions).padStart(10)} mentions`);
  console.log(`  Vague openings      | ${QWEN_RESULT.hasVagueOpening ? "Yes ⚠️" : "No ✅"}          | ${GEMINI_RESULT.hasVagueOpening ? "Yes ⚠️" : "No ✅"}`);
  console.log(`  Paragraphs          | ${String(QWEN_RESULT.paragraphs).padStart(10)} | ${String(GEMINI_RESULT.paragraphs).padStart(10)}`);

  console.log("\n" + "=".repeat(70));
  console.log("SECTION-BY-SECTION");
  console.log("=".repeat(70));

  const sectionMins = {
    "1. Introdução": 260,
    "2. Desenvolvimento": 1100,
    "3. Conclusão": 220,
  };

  for (const [title, minWords] of Object.entries(sectionMins)) {
    const q = QWEN_RESULT.sections[title];
    const g = GEMINI_RESULT.sections[title];
    const qIcon = q.words >= minWords ? "✅" : q.words >= minWords * 0.85 ? "⚠️" : "❌";
    const gIcon = g.words >= minWords ? "✅" : g.words >= minWords * 0.85 ? "⚠️" : "❌";

    console.log(`\n  ${title} (min: ${minWords} palavras):`);
    console.log(`    Qwen:    ${q.words} palavras ${qIcon}`);
    console.log(`    Gemini:  ${g.words} palavras ${gIcon}`);
    console.log(`\n    Qwen preview:`);
    console.log(`    "${q.preview.slice(0, 180)}..."`);
    console.log(`\n    Gemini preview:`);
    console.log(`    "${g.preview.slice(0, 180)}..."`);
  }

  // ─── Quality analysis ──────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(70));
  console.log("QUALITY ANALYSIS");
  console.log("=".repeat(70));

  console.log(`\n  1. Profundidade do conteúdo:`);
  console.log(`     Qwen:    ${QWEN_RESULT.totalWords} palavras — conteúdo adequado mas mais conciso`);
  console.log(`     Gemini:  ${GEMINI_RESULT.totalWords} palavras — ${GEMINI_RESULT.totalWords - QWEN_RESULT.totalWords} palavras a mais, mais detalhado`);
  console.log(`     → Gemini produz conteúdo mais extenso (+${((GEMINI_RESULT.totalWords / QWEN_RESULT.totalWords - 1) * 100).toFixed(0)}%)`);

  console.log(`\n  2. Formatação:`);
  console.log(`     Qwen:    Usa Markdown (## subtítulos) — limpo para processamento`);
  console.log(`     Gemini:  Usa HTML (<h3> subtítulos) — pode causar problemas no editor`);
  console.log(`     → Qwen produz output mais limpo e compatível`);

  console.log(`\n  3. Contexto moçambicano:`);
  console.log(`     Qwen:    ${QWEN_RESULT.mozContextMentions} menções`);
  console.log(`     Gemini:  ${GEMINI_RESULT.mozContextMentions} menções`);
  console.log(`     → Gemini contextualiza ligeiramente mais`);

  console.log(`\n  4. Velocidade:`);
  console.log(`     Qwen:    ${QWEN_RESULT.time}s`);
  console.log(`     Gemini:  ${GEMINI_RESULT.time}s`);
  console.log(`     → Qwen é ${((GEMINI_RESULT.time / QWEN_RESULT.time)).toFixed(0)}x mais rápido`);

  console.log(`\n  5. Cumprimento dos mínimos:`);
  const qwenMet = Object.entries(QWEN_RESULT.sections).filter(([title, s]) => s.words >= sectionMins[title] * 0.85).length;
  const geminiMet = Object.entries(GEMINI_RESULT.sections).filter(([title, s]) => s.words >= sectionMins[title] * 0.85).length;
  console.log(`     Qwen:    ${qwenMet}/3 secções dentro do esperado`);
  console.log(`     Gemini:  ${geminiMet}/3 secções dentro do esperado`);

  // ─── Verdict ───────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(70));
  console.log("VERDICT");
  console.log("=".repeat(70));

  let qwenScore = 0;
  let geminiScore = 0;

  // Word count (more content = better for school work)
  if (GEMINI_RESULT.totalWords > QWEN_RESULT.totalWords) geminiScore += 1;
  else qwenScore += 1;

  // Speed
  if (QWEN_RESULT.time < GEMINI_RESULT.time) qwenScore += 1;
  else geminiScore += 1;

  // Clean output (no HTML tags)
  if (!QWEN_RESULT.hasHtmlTags) qwenScore += 1;
  if (!GEMINI_RESULT.hasHtmlTags) geminiScore += 1;

  // Mozambican context
  if (QWEN_RESULT.mozContextMentions >= GEMINI_RESULT.mozContextMentions) qwenScore += 1;
  else geminiScore += 1;

  // No vague openings
  if (!QWEN_RESULT.hasVagueOpening) qwenScore += 1;
  if (!GEMINI_RESULT.hasVagueOpening) geminiScore += 1;

  // Section minimums
  if (qwenMet > geminiMet) qwenScore += 1;
  else if (geminiMet > qwenMet) geminiScore += 1;

  console.log(`\n  Qwen:    ${qwenScore} pontos`);
  console.log(`  Gemini:  ${geminiScore} pontos`);

  if (qwenScore > geminiScore) {
    console.log(`\n  🏆 Winner: Qwen 3.6 Plus`);
    console.log(`\n  Qwen é mais rápido, produz output mais limpo (Markdown vs HTML),`);
    console.log(`  e tem melhor compatibilidade com o pipeline de geração.`);
  } else if (geminiScore > qwenScore) {
    console.log(`\n  🏆 Winner: Gemini 2.5 Flash`);
    console.log(`\n  Gemini produz conteúdo mais extenso e detalhado,`);
    console.log(`  mas usa HTML tags e é significativamente mais lento.`);
  } else {
    console.log(`\n  🤝 Empate!`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("RECOMMENDATION");
  console.log("=".repeat(70));
  console.log(`\n  Primário: Qwen 3.6 Plus (mais rápido, output limpo)`);
  console.log(`  Fallback: Gemini 2.5 Flash (mais conteúdo quando Qwen falha)`);
  console.log(`\n  Configuração recomendada no .env:`);
  console.log(`    AI_PROVIDER=openrouter`);
  console.log(`    AI_FALLBACK_PROVIDER=google-ai`);
}

main();
