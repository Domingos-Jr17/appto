import type { Page } from "@playwright/test";
import { test, expect, loginAsSeedUser } from "./helpers";

test.describe("Projects", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeedUser(page);
    await page.goto("/app/projects");
    await expect(page.getByRole("heading", { name: "Projectos", exact: true })).toBeVisible({ timeout: 15000 });
  });

  const getHeaderNewProjectLink = (page: Page) =>
    page.getByRole("banner").getByRole("link", { name: /Novo projecto/i });

  test("displays projects page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Projectos", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projectos", exact: true })).toHaveCount(1);
  });

  test("shows new project button", async ({ page }) => {
    await expect(getHeaderNewProjectLink(page)).toBeVisible();
  });

  test("opens new project dialog", async ({ page }) => {
    await getHeaderNewProjectLink(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Criar novo projecto")).toBeVisible();
  });

  test("new project dialog shows form fields", async ({ page }) => {
    await getHeaderNewProjectLink(page).click();
    await expect(page.getByLabel("Título do Trabalho")).toBeVisible();
    await expect(page.getByLabel("Descrição")).toBeVisible();
  });

  test("can close new project dialog", async ({ page }) => {
    await getHeaderNewProjectLink(page).click();
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
