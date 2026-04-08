import "dotenv/config";

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

async function testWithSystemRole() {
  console.log("Testing with system role vs without...\n");

  const systemPrompt = "You are an academic assistant specialized in scientific papers in Portuguese.";
  const userPrompt = "Escreve uma introducao de 100 palavras sobre inteligencia artificial na educacao.";

  // Test 1: Without system role
  console.log("=== WITHOUT SYSTEM ROLE ===");
  const res1 = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 200,
    }),
  });
  const data1 = await res1.json();
  console.log("Content:", data1.choices?.[0]?.message?.content?.substring(0, 150));
  console.log("Usage:", data1.usage);

  // Test 2: With system role
  console.log("\n=== WITH SYSTEM ROLE ===");
  const res2 = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
    }),
  });
  const data2 = await res2.json();
  console.log("Content:", data2.choices?.[0]?.message?.content?.substring(0, 150));
  console.log("Usage:", data2.usage);

  // Test 3: Test with Groq
  console.log("\n=== GROQ WITH SYSTEM ROLE ===");
  const res3 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
    }),
  });
  const data3 = await res3.json();
  console.log("Content:", data3.choices?.[0]?.message?.content?.substring(0, 150));
  console.log("Usage:", data3.usage);

  // Test 4: Long prompt like in compare script
  console.log("\n=== LONG PROMPT (like compare script) ===");
  const longPrompt = `Tema do trabalho: Impacto da Inteligência Artificial na Educação Superior em Moçambique
Tipo de trabalho: Trabalho Científico Académico
Contexto do briefing:
- Nível académico: LICENCIATURA
- Instituição: Universidade Eduardo Mondlane
- Norma de citação: ABNT

Instrução: Gere APENAS o conteúdo da secção "Introdução" sobre o tema fornecido.

Requisitos obrigatórios:
- Produza entre 350 e 520 palavras
- Delimite o tema, apresente o problema, o objectivo, a relevância académica e a organização do trabalho
- Use subtítulos com numeração progressiva (## 1.1 Contextualização, ## 1.2 Problema de pesquisa)
- Inclua pelo menos 2 citações no formato (SOBRENOME, ano)
- Escreva em Português académico de Moçambique`;

  const res4 = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [
        { role: "system", content: "You are an academic assistant." },
        { role: "user", content: longPrompt }
      ],
      max_tokens: 600,
    }),
  });
  const data4 = await res4.json();
  console.log("Status:", res4.status);
  console.log("Content length:", data4.choices?.[0]?.message?.content?.length);
  console.log("Content:", data4.choices?.[0]?.message?.content?.substring(0, 200) || "EMPTY");
  console.log("Usage:", data4.usage);
}

testWithSystemRole().catch(console.error);