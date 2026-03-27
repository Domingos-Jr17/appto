import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("unauthenticated user is redirected to login from protected routes", async ({ page }) => {
    const protectedRoutes = ["/app", "/app/sessoes", "/app/projects", "/app/settings", "/app/credits"];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("login page has all required elements", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Esqueceu a senha/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();
  });

  test("register page has all required elements", async ({ page }) => {
    await page.goto("/register");
    
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
    await expect(page.getByLabel("Nome completo")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha").first()).toBeVisible();
    await expect(page.getByLabel("Confirmar senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar conta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  });

  test("forgot password page has all required elements", async ({ page }) => {
    await page.goto("/forgot-password");
    
    await expect(page.getByRole("heading", { name: /Esqueceu a senha/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar link de redefinição/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Voltar para o login/i })).toBeVisible();
  });

  test("landing page is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /O seu copiloto para trabalhos académicos/i })).toBeVisible();
  });
});
