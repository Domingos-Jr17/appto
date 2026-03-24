import { expect, test } from "@playwright/test";

test.describe("App Dashboard", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("displays login page when accessing app without auth", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  });
});

test.describe("App Dashboard (authenticated)", () => {
  const loginEmail = process.env.E2E_LOGIN_EMAIL;
  const loginPassword = process.env.E2E_LOGIN_PASSWORD;

  test.skip(
    !loginEmail || !loginPassword,
    "Defina E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD para validar o dashboard autenticado."
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(loginEmail || "");
    await page.getByLabel("Senha").fill(loginPassword || "");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/app/);
  });

  test("displays dashboard after login", async ({ page }) => {
    await expect(page.getByText(/continuar trabalho/i)).toBeVisible();
  });

  test("shows project list section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Projectos recentes/i })).toBeVisible();
  });

  test("shows quick context stats", async ({ page }) => {
    await expect(page.getByText(/Em curso/i)).toBeVisible();
    await expect(page.getByText(/Palavras/i)).toBeVisible();
    await expect(page.getByText(/Prontas/i)).toBeVisible();
  });

  test("shows main flow section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Fluxo principal/i })).toBeVisible();
    await expect(page.getByText(/Conversar/i)).toBeVisible();
    await expect(page.getByText(/Estruturar/i)).toBeVisible();
    await expect(page.getByText(/Escrever/i)).toBeVisible();
  });

  test("shows templates section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Templates e atalhos/i })).toBeVisible();
    await expect(page.getByText(/Monografia guiada/i)).toBeVisible();
    await expect(page.getByText(/Artigo academico/i)).toBeVisible();
    await expect(page.getByText(/Estrutura livre/i)).toBeVisible();
  });

  test("navigates to projects page", async ({ page }) => {
    await page.getByRole("link", { name: /Ver todos/i }).click();
    await expect(page).toHaveURL(/\/app\/projects/);
  });
});
