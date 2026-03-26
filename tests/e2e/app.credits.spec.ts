import { test, expect } from "./helpers";

test.describe("Credits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/credits");
    await expect(page.getByRole("heading", { name: "Créditos", exact: true })).toBeVisible({ timeout: 15000 });
  });

  test("displays credits page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Créditos", exact: true })).toBeVisible();
    await expect(page.getByText(/Gerencie o saldo/i)).toBeVisible();
  });

  test("shows balance card", async ({ page }) => {
    await expect(page.getByText("Saldo de Créditos")).toBeVisible();
  });

  test("shows credit packages", async ({ page }) => {
    await expect(page.getByText("Recarregar Créditos").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Standard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Academic" })).toBeVisible();
  });

  test("shows transaction history section", async ({ page }) => {
    await expect(page.getByText("Histórico de Transacções")).toBeVisible();
  });

  test("shows FAQ section", async ({ page }) => {
    await expect(page.getByText("Perguntas Frequentes")).toBeVisible();
    await expect(page.getByText(/O que são créditos/i)).toBeVisible();
  });

  test("can expand FAQ item", async ({ page }) => {
    await page.getByText("O que são créditos e como funcionam?").click();
    await expect(page.getByText(/Créditos são a unidade de consumo/i)).toBeVisible();
  });
});
