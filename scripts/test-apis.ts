import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { createHmac, randomBytes } from "crypto";

const prisma = new PrismaClient();
const AUTH_SECRET = "IbuU4ru_ZOqMVB3W-CcUlpmZVXcPlGe0Y56suTawSuI";
const BASE_URL = "http://localhost:3000";

async function generateNextAuthJWT(userId: string, email: string, name: string) {
  // next-auth v4 uses JWE (encrypted JWT) for session tokens
  // We need to create a properly encrypted token
  const secret = new TextEncoder().encode(AUTH_SECRET);

  const payload = {
    name,
    email,
    sub: userId,
    role: "STUDENT",
    credits: 5000,
    twoFactorEnabled: false,
    passwordChangedAt: null,
    invalidated: false,
    emailVerified: new Date().toISOString(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    jti: randomBytes(16).toString("hex"),
  };

  // next-auth v4 uses JWE with dir+A256GCM
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(secret.subarray(0, 32));

  return token;
}

async function testEndpoint(
  name: string,
  url: string,
  token: string | null,
  options: { method?: string; body?: string } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Cookie"] = `next-auth.session-token=${token}`;
  }

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      body: options.body,
      headers,
      redirect: "manual",
    });
    let body = "";
    try {
      body = await res.text();
    } catch {
      body = "[binary]";
    }
    const display =
      body.length > 150 ? body.substring(0, 150) + "..." : body;
    console.log(`  ${res.status} ${name}: ${display || "(empty)"}`);
    return res.status;
  } catch (e: any) {
    console.log(`  ERR ${name}: ${e.message}`);
    return -1;
  }
}

async function main() {
  console.log("🔍 Testando APIs autenticadas...\n");

  const user = await prisma.user.findUnique({
    where: { email: "teste@aptto.mz" },
  });
  if (!user) {
    console.error(
      "❌ Utilizador de teste não encontrado. Execute: bun run db:seed"
    );
    process.exit(1);
  }
  console.log(`👤 Utilizador: ${user.email} (id: ${user.id})\n`);

  // Try to generate a proper JWE token
  let token: string | null = null;
  try {
    token = await generateNextAuthJWT(user.id, user.email!, user.name || "Test");
    console.log("🔑 Token JWE gerado com sucesso\n");
  } catch (e: any) {
    console.log(`⚠️  Falha ao gerar token JWE: ${e.message}`);
    console.log("   A testar sem autenticação...\n");
  }

  const h = (path: string) => `${BASE_URL}${path}`;
  const results: { name: string; status: number }[] = [];

  const endpoints = [
    // Auth-protected endpoints
    { name: "GET /api/projects", url: h("/api/projects") },
    { name: "GET /api/credits", url: h("/api/credits") },
    { name: "GET /api/settings", url: h("/api/settings") },
    { name: "GET /api/subscription", url: h("/api/subscription") },
    { name: "GET /api/documents", url: h("/api/documents") },
    { name: "GET /api/user", url: h("/api/user") },
    { name: "GET /api/user/sessions", url: h("/api/user/sessions") },
    { name: "GET /api/auth/session", url: h("/api/auth/session") },
    {
      name: "GET /api/projects/[id]",
      url: h(`/api/projects/${user.id}`),
    },
    { name: "GET /api/export", url: h("/api/export") },

    // AI endpoints
    {
      name: "POST /api/ai",
      url: h("/api/ai"),
      method: "POST",
      body: JSON.stringify({ prompt: "Teste", educationLevel: "TECHNICAL" }),
    },

    // Generate endpoints
    {
      name: "POST /api/generate/work",
      url: h("/api/generate/work"),
      method: "POST",
      body: JSON.stringify({ title: "Teste", type: "SCHOOL_WORK" }),
    },

    // Files
    {
      name: "GET /api/files/upload-url",
      url: h(
        "/api/files/upload-url?filename=test.pdf&size=1000&contentType=application/pdf"
      ),
    },

    // Payments
    {
      name: "POST /api/payments/checkout",
      url: h("/api/payments/checkout"),
      method: "POST",
      body: JSON.stringify({ plan: "STARTER" }),
    },

    // Admin endpoints (should be 403 for student)
    { name: "GET /api/admin/metrics/summary", url: h("/api/admin/metrics/summary") },
    { name: "GET /api/admin/rag/sources", url: h("/api/admin/rag/sources") },
    { name: "GET /api/admin/rag/search", url: h("/api/admin/rag/search") },
    { name: "POST /api/admin/rag/ingest", url: h("/api/admin/rag/ingest"), method: "POST", body: JSON.stringify({ text: "teste" }) },
    { name: "GET /api/admin/prompts/quality", url: h("/api/admin/prompts/quality") },
  ];

  for (const ep of endpoints) {
    const status = await testEndpoint(ep.name, ep.url, token, {
      method: ep.method || "GET",
      body: ep.body,
    });
    results.push({ name: ep.name, status });
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(60));

  let pass = 0;
  let fail = 0;

  for (const r of results) {
    const icon = r.status >= 200 && r.status < 500 ? "✅" : "❌";
    console.log(
      `  ${icon} ${r.name} → ${r.status === -1 ? "ERR" : r.status}`
    );
    if (r.status >= 200 && r.status < 500) pass++;
    else fail++;
  }

  console.log("\n" + "-".repeat(60));
  console.log(
    `  ✅ Passaram: ${pass}  |  ❌ Falharam: ${fail}  |  Total: ${results.length}`
  );
  console.log("-".repeat(60));
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
