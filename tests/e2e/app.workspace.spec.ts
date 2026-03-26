import { test, expect, loginAsSeedUser, getFirstProjectId } from "./helpers";

test.describe("Project Workspace", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeedUser(page);
    const projectId = await getFirstProjectId(page);
    await page.goto(`/app/projects/${projectId}`);
    await expect(page.getByText(/assistente/i)).toBeVisible({ timeout: 15000 });
  });

  test("displays workspace page", async ({ page }) => {
    await expect(page.getByText(/assistente/i)).toBeVisible();
  });

  test("shows document tab", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /documento/i })).toBeVisible();
  });

  test("shows structure tab", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /estrutura/i })).toBeVisible();
  });

  test("shows preview tab", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /preview/i })).toBeVisible();
  });

  test("can switch to structure tab", async ({ page }) => {
    await page.getByRole("tab", { name: /estrutura/i }).click();
    await expect(page.getByRole("tab", { name: /estrutura/i })).toHaveAttribute("data-state", "active");
  });

  test("can switch to preview tab", async ({ page }) => {
    await page.getByRole("tab", { name: /preview/i }).click();
    await expect(page.getByRole("tab", { name: /preview/i })).toHaveAttribute("data-state", "active");
  });

  test("document tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /documento/i })).toHaveAttribute("data-state", "active");
  });

  test("shows chat input", async ({ page }) => {
    await expect(page.getByPlaceholder(/Escreva a sua mensagem/i)).toBeVisible();
  });

  test("shows export button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /exportar/i })).toBeVisible();
  });
});
