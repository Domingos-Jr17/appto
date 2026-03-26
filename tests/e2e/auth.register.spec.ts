import { expect, test } from "@playwright/test";

test.describe("Registration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("displays registration form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
    await expect(page.getByLabel("Nome completo")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha").first()).toBeVisible();
    await expect(page.getByLabel("Confirmar senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar conta" })).toBeVisible();
  });

  test("validates password confirmation", async ({ page }) => {
    await page.getByLabel("Senha").first().fill("Password123!");
    await page.getByLabel("Confirmar senha").fill("DifferentPassword123!");
    await expect(page.getByText("As senhas não coincidem")).toBeVisible();
  });

  test("shows password strength indicator", async ({ page }) => {
    await page.getByLabel("Senha").first().fill("weak");
    await expect(page.getByText(/Força da senha/i)).toBeVisible();
  });

  test("requires terms acceptance", async ({ page }) => {
    const submitButton = page.getByRole("button", { name: "Criar conta" });
    await expect(submitButton).toBeDisabled();
  });

  test("navigates to login page", async ({ page }) => {
    await page.getByRole("link", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
