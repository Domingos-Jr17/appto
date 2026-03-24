import { expect, test } from "@playwright/test";

test.describe("Project Workspace", () => {
  const workspaceProjectId = process.env.E2E_PROJECT_ID;
  const loginEmail = process.env.E2E_LOGIN_EMAIL;
  const loginPassword = process.env.E2E_LOGIN_PASSWORD;

  test.skip(
    !workspaceProjectId || !loginEmail || !loginPassword,
    "Defina E2E_PROJECT_ID, E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD para validar o workspace autenticado."
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(loginEmail || "");
    await page.getByLabel("Senha").fill(loginPassword || "");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/app/);
    await page.goto(`/app/projects/${workspaceProjectId}/workspace`);
  });

  test("displays workspace page", async ({ page }) => {
    await expect(page.getByText(/assistente/i)).toBeVisible();
  });

  test("shows document tab", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /documento/i })).toBeVisible();
  });

  test("shows structure tab", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /estrutura/i })).toBeVisible();
  });

  test("shows preview tab", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /preview/i })).toBeVisible();
  });

  test("can switch to structure tab", async ({ page }) => {
    await page.getByRole("tab", { name: /estrutura/i }).click();
    await expect(page.getByRole("tab", { name: /estrutura/i })).toHaveAttribute("data-state", "active");
  });

  test("can switch to preview tab", async ({ page }) => {
    await page.getByRole("tab", { name: /preview/i }).click();
    await expect(page.getByRole("tab", { name: /preview/i })).toHaveAttribute("data-state", "active");
  });

  test("document tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /documento/i })).toHaveAttribute("data-state", "active");
  });

  test("shows chat input", async ({ page }) => {
    await expect(page.getByPlaceholder(/Escreva a sua mensagem/i)).toBeVisible();
  });

  test("shows export button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /exportar/i })).toBeVisible();
  });
});
