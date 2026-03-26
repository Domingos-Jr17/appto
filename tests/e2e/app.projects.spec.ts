import { test, expect } from "./helpers";

test.describe("Projects", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/projects");
    await expect(page.getByRole("heading", { name: "Projectos", exact: true })).toBeVisible({ timeout: 15000 });
  });

  test("displays projects page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Projectos", exact: true })).toBeVisible();
  });

  test("shows new project button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Novo Projecto/i })).toBeVisible();
  });

  test("opens new project dialog", async ({ page }) => {
    await page.getByRole("button", { name: /Novo Projecto/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Criar Novo Projecto")).toBeVisible();
  });

  test("new project dialog shows form fields", async ({ page }) => {
    await page.getByRole("button", { name: /Novo Projecto/i }).click();
    await expect(page.getByLabel("Título do Trabalho")).toBeVisible();
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
