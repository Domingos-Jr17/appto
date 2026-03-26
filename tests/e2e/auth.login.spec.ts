import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("displays login form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("shows forgot password link", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Esqueceu a senha/i })).toBeVisible();
  });

  test("navigates to register page", async ({ page }) => {
    await page.getByRole("link", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("navigates to forgot password page", async ({ page }) => {
    await page.getByRole("link", { name: /Esqueceu a senha/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("toggles password visibility", async ({ page }) => {
    const passwordInput = page.getByLabel("Senha");
    await expect(passwordInput).toHaveAttribute("type", "password");
    
    await page.getByRole("button", { name: "" }).first().click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });
});
