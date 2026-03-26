import { expect, test } from "@playwright/test";

test.describe("Forgot Password", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("displays forgot password form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Esqueceu a senha/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar link de redefinição/i })).toBeVisible();
  });

  test("navigates back to login", async ({ page }) => {
    await page.getByRole("link", { name: /Voltar para o login/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
