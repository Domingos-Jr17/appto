import type { Page } from "@playwright/test";
import { test, expect, loginAsSeedUser } from "./helpers";

test.describe("Sessions", () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await loginAsSeedUser(page);
    await page.goto("/app/sessoes");
    await expect(page.getByRole("heading", { name: "Sessões", exact: true })).toBeVisible({ timeout: 15000 });
  });

  const getHeaderNewSessionLink = (page: Page) =>
    page.getByRole("banner").getByRole("link", { name: /Nova sessão/i });

  const getFirstSessionHref = async (page: Page) => {
    const href = await page.locator('a[href^="/app/sessoes/"]').first().getAttribute("href");
    return href;
  };

  test("displays sessions page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sessões", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sessões", exact: true })).toHaveCount(1);
  });

  test("shows new session button", async ({ page }) => {
    await expect(getHeaderNewSessionLink(page)).toBeVisible();
  });

  test("opens new session dialog", async ({ page }) => {
    await getHeaderNewSessionLink(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Criar nova sessão")).toBeVisible();
  });

  test("new session dialog shows form fields", async ({ page }) => {
    await getHeaderNewSessionLink(page).click();
    await expect(page.getByLabel("Título da Sessão")).toBeVisible();
    await expect(page.getByLabel("Descrição")).toBeVisible();
  });

  test("can close new session dialog", async ({ page }) => {
    await getHeaderNewSessionLink(page).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("shows session filters", async ({ page }) => {
    await expect(page.getByPlaceholder(/Pesquisar/i)).toBeVisible();
  });

  test("can search sessions", async ({ page }) => {
    await page.getByPlaceholder(/Pesquisar/i).fill("test search");
    await expect(page.getByPlaceholder(/Pesquisar/i)).toHaveValue("test search");
  });

  test("redirects legacy projects route to sessions", async ({ page }) => {
    await page.goto("/app/projects");
    await expect(page).toHaveURL(/\/app\/sessoes/);
    await expect(page.getByRole("heading", { name: "Sessões", exact: true })).toBeVisible();
  });

  test("redirects legacy project detail route to session detail", async ({ page }) => {
    const sessionHref = await getFirstSessionHref(page);
    test.skip(!sessionHref, "Seed user needs at least one session for legacy redirect coverage.");
    if (!sessionHref) return;
    const legacyHref = sessionHref.replace("/app/sessoes/", "/app/projects/");

    await page.goto(legacyHref);
    await expect(page).toHaveURL(new RegExp(sessionHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  test("redirects legacy workspace route to session detail", async ({ page }) => {
    const sessionHref = await getFirstSessionHref(page);
    test.skip(!sessionHref, "Seed user needs at least one session for legacy redirect coverage.");
    if (!sessionHref) return;
    const legacyHref = `${sessionHref.replace("/app/sessoes/", "/app/projects/")}/workspace`;

    await page.goto(legacyHref);
    await expect(page).toHaveURL(new RegExp(sessionHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
