import "dotenv/config";

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

const SYSTEM_ROLE = "És um assistente académico especializado em trabalhos científicos em Português de Moçambique. Segue rigorosamente as instruções de estilo e extensão fornecidas.";

const PROMPT = `Escreve uma secção de desenvolvimento completa sobre "Inteligência Artificial na Educação" com pelo menos 1500 palavras.

Requisitos:
- Mínimo 1500 palavras
- Use subtítulos em Markdown (## Título)
- Estruture em múltiplos parágrafos
- Inclua análises, exemplos e discussão
- Escreva em Português académico`;

async function testWithDifferentMaxTokens() {
  console.log("═".repeat(80));
  console.log("TESTE: Impacto do max_tokens no output");
  console.log("═".repeat(80));

  const testConfigs = [1000, 2000, 4000, 8000];

  for (const maxTokens of testConfigs) {
    console.log(`\n--- max_tokens: ${maxTokens} ---`);

    // Test Cerebras
    const cerebrasStart = Date.now();
    const cerebrasRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-3-235b-a22b-instruct-2507",
        messages: [
          { role: "system", content: SYSTEM_ROLE },
          { role: "user", content: PROMPT },
        ],
        max_tokens: maxTokens,
      }),
    });
    const cerebrasData = await cerebrasRes.json();
    const cerebrasContent = cerebrasData.choices?.[0]?.message?.content || "";
    const cerebrasWords = cerebrasContent.split(/\s+/).filter(w => w.length > 0).length;
    console.log(`   Cerebras: ${cerebrasWords} palavras, ${Date.now() - cerebrasStart}ms`);

    // Test Groq
    const groqStart = Date.now();
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: SYSTEM_ROLE },
          { role: "user", content: PROMPT },
        ],
        max_tokens: maxTokens,
      }),
    });
    const groqData = await groqRes.json();
    const groqContent = groqData.choices?.[0]?.message?.content || "";
    const groqWords = groqContent.split(/\s+/).filter(w => w.length > 0).length;
    console.log(`   Groq: ${groqWords} palavras, ${Date.now() - groqStart}ms`);
  }

  console.log("\n" + "═".repeat(80));
  console.log("CONCLUSÃO");
  console.log("═".repeat(80));
  console.log(`
  Se o output aumenta com max_tokens maiores, o problema é limite de tokens.
  Se o output permanece igual, o modelo está a atingir um limite natural.
  `);
}

testWithDifferentMaxTokens().catch(console.error);