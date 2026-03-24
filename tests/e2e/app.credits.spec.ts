import { expect, test } from "@playwright/test";

test.describe("Credits", () => {
  const loginEmail = process.env.E2E_LOGIN_EMAIL;
  const loginPassword = process.env.E2E_LOGIN_PASSWORD;

  test.skip(
    !loginEmail || !loginPassword,
    "Defina E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD para validar os créditos autenticados."
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(loginEmail || "");
    await page.getByLabel("Senha").fill(loginPassword || "");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/app/);
    await page.goto("/app/credits");
  });

  test("displays credits page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Créditos" })).toBeVisible();
    await expect(page.getByText(/Gerencie o saldo/i)).toBeVisible();
  });

  test("shows balance card", async ({ page }) => {
    await expect(page.getByText(/Saldo disponível/i)).toBeVisible();
  });

  test("shows credit packages", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Recarregar Créditos/i })).toBeVisible();
    await expect(page.getByText(/Starter/i)).toBeVisible();
    await expect(page.getByText(/Standard/i)).toBeVisible();
    await expect(page.getByText(/Academic/i)).toBeVisible();
  });

  test("shows transaction history section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Histórico de Transacções/i })).toBeVisible();
  });

  test("shows FAQ section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Perguntas Frequentes/i })).toBeVisible();
    await expect(page.getByText(/O que são créditos/i)).toBeVisible();
  });

  test("can expand FAQ item", async ({ page }) => {
    await page.getByRole("button", { name: /O que são créditos/i }).click();
    await expect(page.getByText(/Créditos são a unidade de consumo/i)).toBeVisible();
  });
});
