import { test, expect, loginAsSeedUser } from "./helpers";

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
  test.beforeEach(async ({ page }) => {
    await loginAsSeedUser(page);
    await page.goto("/app");
    await expect(page.getByText("Continuar trabalho")).toBeVisible({ timeout: 15000 });
  });

  test("displays dashboard after login", async ({ page }) => {
    await expect(page.getByText("Continuar trabalho")).toBeVisible();
  });

  test("shows project list section", async ({ page }) => {
    await expect(page.getByText("Projectos recentes")).toBeVisible();
  });

  test("shows quick context stats", async ({ page }) => {
    await expect(page.getByText("Em curso", { exact: true })).toBeVisible();
    await expect(page.getByText("Palavras", { exact: true })).toBeVisible();
    await expect(page.getByText("Prontas", { exact: true })).toBeVisible();
  });

  test("shows main flow section", async ({ page }) => {
    await expect(page.getByText("Fluxo principal")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Conversar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Estruturar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Escrever" })).toBeVisible();
  });

  test("shows templates section", async ({ page }) => {
    await expect(page.getByText("Templates e atalhos")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Monografia guiada" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Artigo academico" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Estrutura livre" })).toBeVisible();
  });

  test("navigates to projects page", async ({ page }) => {
    await page.getByRole("link", { name: "Ver todos" }).click();
    await expect(page).toHaveURL(/\/app\/projects/);
  });
});
