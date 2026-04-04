import { readFileSync } from "fs";
import { join } from "path";

import {
  buildWorkGenerationPrompt,
  getWorkGenerationProfile,
  parseGeneratedWorkContent,
  type SectionTemplate,
} from "@/lib/work-generation-prompts";
import type { WorkBriefInput } from "@/types/editor";

for (const line of readFileSync(join(process.cwd(), ".env"), "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const separator = trimmed.indexOf("=");
  if (separator === -1) continue;
  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = value;
}

const templates: SectionTemplate[] = [
  { title: "1. Introdução", order: 3 },
  { title: "2. Desenvolvimento", order: 4 },
  { title: "3. Conclusão", order: 5 },
];

const brief: WorkBriefInput = {
  educationLevel: "SECONDARY",
  institutionName: "Escola Secundária Josina Machel",
  subjectName: "Geografia",
  className: "11ª",
  city: "Maputo",
  objective: "Explicar as principais causas, consequências e formas de mitigação das mudanças climáticas em Moçambique.",
  additionalInstructions: "Use linguagem clara de ensino secundário e relacione o tema com exemplos do quotidiano moçambicano.",
};

const profile = getWorkGenerationProfile("SCHOOL_WORK", brief, templates);
const prompt = buildWorkGenerationPrompt({
  title: "Mudanças climáticas em Moçambique",
  typeLabel: "Trabalho Escolar",
  brief,
  templates,
  profile,
});

const systemPrompt = `Você é um assistente de escrita para estudantes do ensino secundário moçambicano.
Gere conteúdo simples e acessível em Português de Moçambique.
Use frases curtas e vocabulário acessível.
Evite jargão técnico excessivo.
Não é obrigatório incluir citações formais no texto.
Estrutura básica: Introdução, Desenvolvimento, Conclusão.`;

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

const response = await fetch(`${process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://aptto.mz",
    "X-Title": "aptto",
  },
  body: JSON.stringify({
    model: process.env.OPENROUTER_MODEL || "qwen/qwen3.6-plus:free",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    max_tokens: 8000,
  }),
});

if (!response.ok) {
  console.error("HTTP", response.status, await response.text());
  process.exit(1);
}

const data = await response.json();
const rawContent = data.choices?.[0]?.message?.content || "";
const parsed = parseGeneratedWorkContent(rawContent, templates, profile);

console.log("Prompt total target:", `${profile.totalRange.min}-${profile.totalRange.max}`);
for (const section of parsed.sections) {
  console.log(`${section.title}: ${countWords(section.content)} palavras`);
}
console.log("Total body words:", parsed.sections.reduce((sum, section) => sum + countWords(section.content), 0));
console.log("Development preview:");
console.log(parsed.sections[1]?.content.slice(0, 500));
