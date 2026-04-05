import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock do request
const mockRequest = (body: any) => {
  return new NextRequest("http://localhost:3000/api/generate/work", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

// Cenários de teste
const testCases = [
  {
    name: "Payload válido",
    body: {
      title: "Teste de trabalho acadêmico",
      type: "RESEARCH_WORK",
      generateContent: true,
      brief: {
        language: "pt-MZ",
        citationStyle: "ABNT",
        coverTemplate: "UEM_STANDARD",
      },
    },
  },
  {
    name: "Payload inválido - título curto",
    body: {
      title: "Test",
      type: "RESEARCH_WORK",
    },
  },
  {
    name: "Payload inválido - sem título",
    body: {
      type: "RESEARCH_WORK",
    },
  },
  {
    name: "Payload com campos faltando",
    body: {},
  },
];

async function runTests() {
  console.log("=== Testando /api/generate/work ===\n");

  for (const testCase of testCases) {
    console.log(`Teste: ${testCase.name}`);
    try {
      const request = mockRequest(testCase.body);
      const response = await POST(request);
      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(data, null, 2)}\n`);
    } catch (error) {
      console.log(`ERRO: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
}

runTests().catch(console.error);
