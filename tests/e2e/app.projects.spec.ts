import { expect, test } from "@playwright/test";

test.describe("Projects", () => {
  const loginEmail = process.env.E2E_LOGIN_EMAIL;
  const loginPassword = process.env.E2E_LOGIN_PASSWORD;

  test.skip(
    !loginEmail || !loginPassword,
    "Defina E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD para validar os projectos autenticados."
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(loginEmail || "");
    await page.getByLabel("Senha").fill(loginPassword || "");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/app/);
    await page.goto("/app/projects");
  });

  test("displays projects page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Projectos" })).toBeVisible();
  });

  test("shows new project button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Novo Projecto/i })).toBeVisible();
  });

  test("opens new project dialog", async ({ page }) => {
    await page.getByRole("button", { name: /Novo Projecto/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Criar Novo Projecto/i })).toBeVisible();
  });

  test("new project dialog shows form fields", async ({ page }) => {
    await page.getByRole("button", { name: /Novo Projecto/i }).click();
    await expect(page.getByLabel("Título do Trabalho")).toBeVisible();
    await expect(page.getByLabel("Tipo de Trabalho")).toBeVisible();
    await expect(page.getByLabel("Descrição")).toBeVisible();
  });

  test("can close new project dialog", async ({ page }) => {
    await page.getByRole("button", { name: /Novo Projecto/i }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("shows project filters", async ({ page }) => {
    await expect(page.getByPlaceholder(/Pesquisar/i)).toBeVisible();
  });

  test("can search projects", async ({ page }) => {
    await page.getByPlaceholder(/Pesquisar/i).fill("test search");
    await expect(page.getByPlaceholder(/Pesquisar/i)).toHaveValue("test search");
  });
});
