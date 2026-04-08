import "dotenv/config";

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

async function simpleTest() {
  console.log("Testing simple prompts...\n");

  const testCases = [
    {
      name: "Simple English",
      prompt: "Say 'Hello world' in 5 words"
    },
    {
      name: "Simple Portuguese", 
      prompt: "Diz olá em 5 palavras"
    },
    {
      name: "Academic Portuguese",
      prompt: "Escreve uma pequena introducao de 50 palavras sobre inteligencia artificial na educacao em Portugal."
    },
    {
      name: "Detailed Prompt",
      prompt: `Tema: Inteligencia Artificial na Educacao
Tipo: Trabalho Academico
Instituicao: Universidade Eduardo Mondlane

Escreve uma introducao de 100 palavras sobre este tema com citacoes no formato (Autor, ano).`
    }
  ];

  for (const test of testCases) {
    console.log(`\n--- ${test.name} ---`);
    
    // Test Cerebras
    try {
      const cerebrasRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CEREBRAS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-3-235b-a22b-instruct-2507",
          messages: [{ role: "user", content: test.prompt }],
          max_tokens: 200,
        }),
      });
      
      const cerebrasData = await cerebrasRes.json();
      console.log("Cerebras:", cerebrasData.choices?.[0]?.message?.content?.substring(0, 100) || "EMPTY");
      console.log("Cerebras raw:", JSON.stringify(cerebrasData).substring(0, 200));
    } catch (e) {
      console.log("Cerebras error:", e);
    }

    // Test Groq
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: test.prompt }],
          max_tokens: 200,
        }),
      });
      
      const groqData = await groqRes.json();
      console.log("Groq:", groqData.choices?.[0]?.message?.content?.substring(0, 100) || "EMPTY");
    } catch (e) {
      console.log("Groq error:", e);
    }
  }
}

simpleTest().catch(console.error);