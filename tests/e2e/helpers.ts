import { test, expect, type Page } from "@playwright/test";

const SEED_EMAIL = process.env.E2E_LOGIN_EMAIL || "teste@aptto.mz";
const SEED_PASSWORD = process.env.E2E_LOGIN_PASSWORD || "teste123";

export async function loginAsSeedUser(page: Page) {
  if (page.url().includes("/app")) return;

  await page.goto("/login", { waitUntil: "networkidle" });
  if (page.url().includes("/app")) return;

  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();

  // Wait for any navigation away from /login
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
}

export async function getFirstProjectId(page: Page): Promise<string> {
  if (!page.url().includes("/app")) {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
  }

  const projects = await page.evaluate(async () => {
    const res = await fetch("/api/projects?sortBy=updatedAt&sortOrder=desc");
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    return res.json();
  });

  if (!Array.isArray(projects) || !projects.length) {
    throw new Error("No projects found. Run the seed script first.");
  }
  return projects[0].id;
}

export { test, expect };
