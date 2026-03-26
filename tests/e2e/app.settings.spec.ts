import { test, expect } from "./helpers";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible({ timeout: 15000 });
  });

  test("displays settings page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible();
    await expect(page.getByText(/Gerencie suas preferências/i)).toBeVisible();
  });

  test("shows all settings tabs", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Perfil" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Preferências" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Segurança" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Notificações" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Conta" })).toBeVisible();
  });

  test("profile tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Perfil" })).toHaveAttribute("data-state", "active");
  });

  test("can switch to preferences tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Preferências" }).click();
    await expect(page.getByRole("tab", { name: "Preferências" })).toHaveAttribute("data-state", "active");
  });

  test("can switch to security tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Segurança" }).click();
    await expect(page.getByRole("tab", { name: "Segurança" })).toHaveAttribute("data-state", "active");
  });

  test("can switch to notifications tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Notificações" }).click();
    await expect(page.getByRole("tab", { name: "Notificações" })).toHaveAttribute("data-state", "active");
  });

  test("can switch to account tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Conta" }).click();
    await expect(page.getByRole("tab", { name: "Conta" })).toHaveAttribute("data-state", "active");
  });
});
